import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import logger from "../utils/logger.js";
import { handleUserActivity } from "./abandonedCart.service.js";

const sanitizeAbandonmentReminderAttempts = (cart) => {
  if (!Array.isArray(cart?.abandonmentReminderAttempts)) {
    return [];
  }

  return cart.abandonmentReminderAttempts.filter(
    (attempt) => attempt && typeof attempt.jobId === "string" && attempt.jobId.trim(),
  );
};

export const getCartByUserIdService = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate({
    path: "items.product",
    model: "Product",
    select: "name mainImage.url category slug",
    populate: {
      path: "category",
      model: "Category",
      select: "_id name slug",
    },
  });

  if (!cart) {
    const newCart = await Cart.create({ user: userId, items: [] });
    return { success: true, data: newCart };
  }

  // ── Strip orphan items (product deleted from admin) ──────────────────────
  // After populate, items referencing a deleted product will have item.product === null.
  // Remove them silently so the client never receives null-product data.
  const orphanCount = cart.items.filter((item) => !item.product).length;
  if (orphanCount > 0) {
    cart.items = cart.items.filter((item) => item.product != null);
    cart.abandonmentReminderAttempts =
      sanitizeAbandonmentReminderAttempts(cart);
    await cart.save();
  }
  // ─────────────────────────────────────────────────────────────────────────

  return { success: true, data: cart };
};

export const addToCartService = async (
  userId,
  productId,
  quantity,
  size,
  color,
  price,
  discountPrice,
  variantImage,
) => {
  const cart = await Cart.findOne({ user: userId });
  const product = await Product.findById(productId);

  if (!product) {
    throw new ErrorResponse("Product not found", 404);
  }

  if (!cart) {
    const newCart = await Cart.create({
      user: userId,
      items: [
        {
          product: productId,
          quantity,
          size,
          color,
          price,
          discountPrice,
          variantImage,
        },
      ],
    });
    return {
      success: true,
      data: newCart,
    };
  }

  const existingItem = cart.items.find(
    (item) =>
      item.product.toString() === productId &&
      item.size === size &&
      item.color === color,
  );

  if (existingItem) {
    existingItem.quantity += quantity;
    // Optionally update price if it can change
    existingItem.price = price;
    existingItem.discountPrice = discountPrice;
    existingItem.variantImage = variantImage;
  } else {
    cart.items.push({
      product: productId,
      quantity,
      size,
      color,
      price,
      discountPrice,
      variantImage,
    });
  }

  cart.abandonmentReminderAttempts =
    sanitizeAbandonmentReminderAttempts(cart);
  await cart.save();
  try {
    await handleUserActivity({ userId, cartId: cart._id, source: "cart_add" });
  } catch (error) {
    logger.error(
      { userId, cartId: cart._id?.toString?.(), error: error.message },
      "[Cart] Failed to register cart add activity",
    );
  }
  return {
    success: true,
    data: cart,
  };
};

export const removeFromCartService = async (userId, itemId) => {
  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    throw new ErrorResponse("Cart not found", 404);
  }

  // Find the index of the item to remove
  const itemIndex = cart.items.findIndex(
    (item) => item._id.toString() === itemId,
  );

  if (itemIndex > -1) {
    cart.items.splice(itemIndex, 1); // Remove the item
    cart.abandonmentReminderAttempts =
      sanitizeAbandonmentReminderAttempts(cart);
    await cart.save();
    try {
      await handleUserActivity({
        userId,
        cartId: cart._id,
        source: "cart_remove",
      });
    } catch (error) {
      logger.error(
        { userId, cartId: cart._id?.toString?.(), error: error.message },
        "[Cart] Failed to register cart remove activity",
      );
    }
    return {
      success: true,
      data: cart,
      message: "Item removed from cart successfully",
    };
  } else {
    throw new ErrorResponse("Item not found in cart", 404);
  }
};

export const updateCartItemQuantityService = async (
  userId,
  itemId,
  newQuantity,
) => {
  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    throw new ErrorResponse("Cart not found", 404);
  }

  const itemToUpdate = cart.items.find(
    (item) => item._id.toString() === itemId,
  );

  if (!itemToUpdate) {
    throw new ErrorResponse("Item not found in cart", 404);
  }

  if (newQuantity <= 0) {
    // Remove item if quantity is 0 or less
    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);
  } else {
    itemToUpdate.quantity = newQuantity;
  }

  cart.abandonmentReminderAttempts =
    sanitizeAbandonmentReminderAttempts(cart);
  await cart.save();
  try {
    await handleUserActivity({
      userId,
      cartId: cart._id,
      source: "cart_update",
    });
  } catch (error) {
    logger.error(
      { userId, cartId: cart._id?.toString?.(), error: error.message },
      "[Cart] Failed to register cart update activity",
    );
  }
  return {
    success: true,
    data: cart,
    message: "Cart item quantity updated successfully",
  };
};

export const clearCartService = async (userId) => {
  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    throw new ErrorResponse("Cart not found", 404);
  }

  cart.items = [];
  cart.abandonmentReminderAttempts =
    sanitizeAbandonmentReminderAttempts(cart);
  await cart.save();
  try {
    await handleUserActivity({
      userId,
      cartId: cart._id,
      source: "cart_clear",
    });
  } catch (error) {
    logger.error(
      { userId, cartId: cart._id?.toString?.(), error: error.message },
      "[Cart] Failed to register cart clear activity",
    );
  }

  return {
    success: true,
    message: "Cart cleared successfully",
  };
};

/**
 * Merges guest cart items (from localStorage) into the authenticated user's server cart.
 * Called once after the user logs in.
 */
export const mergeGuestCartService = async (userId, guestItems) => {
  if (!Array.isArray(guestItems) || guestItems.length === 0) {
    return { success: true, message: "Nothing to merge" };
  }

  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  for (const guestItem of guestItems) {
    const {
      productId,
      quantity,
      size,
      color,
      price,
      discountPrice,
      variantImage,
    } = guestItem;

    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productId &&
        item.size === size &&
        item.color === color,
    );

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.price = price;
      existingItem.discountPrice = discountPrice;
      if (variantImage) existingItem.variantImage = variantImage;
    } else {
      cart.items.push({
        product: productId,
        quantity,
        size,
        color,
        price,
        discountPrice,
        variantImage,
      });
    }
  }

  await cart.save();
  try {
    await handleUserActivity({
      userId,
      cartId: cart._id,
      source: "cart_merge",
    });
  } catch (error) {
    logger.error(
      { userId, cartId: cart._id?.toString?.(), error: error.message },
      "[Cart] Failed to register cart merge activity",
    );
  }
  return {
    success: true,
    data: cart,
    message: "Guest cart merged successfully",
  };
};
