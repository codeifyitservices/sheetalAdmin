import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import logger from "../utils/logger.js";
import { handleUserActivity } from "./abandonedCart.service.js";
import { recalculateAbandonedCartDiscount } from "./abandonedcartcoupon.service.js";

const sanitizeAbandonmentReminderAttempts = (cart) => {
  if (!Array.isArray(cart?.abandonmentReminderAttempts)) {
    return [];
  }

  return cart.abandonmentReminderAttempts.filter(
    (attempt) => attempt && typeof attempt.jobId === "string" && attempt.jobId.trim(),
  );
};

/**
 * After saving a cart mutation, recalculate the abandoned-cart coupon
 * discount if one is applied. Errors are swallowed so they never break
 * the primary cart operation.
 */
const tryRecalculateCoupon = async (cart) => {
  if (!cart?.appliedAbandonedCoupon?.couponRecordId) return;
  try {
    await recalculateAbandonedCartDiscount(cart);
  } catch (err) {
    logger.error(
      { cartId: cart._id?.toString?.(), error: err.message },
      "[Cart] Failed to recalculate abandoned-cart coupon discount",
    );
  }
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

  // Strip orphan items (product deleted from admin).
  const orphanCount = cart.items.filter((item) => !item.product).length;
  if (orphanCount > 0) {
    cart.items = cart.items.filter((item) => item.product != null);
    cart.abandonmentReminderAttempts =
      sanitizeAbandonmentReminderAttempts(cart);
    await cart.save();
    // Recalculate coupon after orphan strip — cart value changed.
    await tryRecalculateCoupon(cart);
  }

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

  // Adding items changes the cart total, so recalculate the abandoned-cart
  // discount to keep the applied amount in sync.
  await tryRecalculateCoupon(cart);

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

  const itemIndex = cart.items.findIndex(
    (item) => item._id.toString() === itemId,
  );

  if (itemIndex > -1) {
    cart.items.splice(itemIndex, 1);
    cart.abandonmentReminderAttempts =
      sanitizeAbandonmentReminderAttempts(cart);
    await cart.save();

    // Removing an item changes the cart total, so recalculate the discount.
    await tryRecalculateCoupon(cart);

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
    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);
  } else {
    itemToUpdate.quantity = newQuantity;
  }

  cart.abandonmentReminderAttempts =
    sanitizeAbandonmentReminderAttempts(cart);
  await cart.save();

  // Quantity change affects cart total — recalculate discount.
  await tryRecalculateCoupon(cart);

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
  // Clearing the cart zeros the discount and clears the applied coupon —
  // no point keeping it when the cart is empty.
  cart.appliedAbandonedCoupon = null;
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

  // Merging adds items — re-enforce the cap.
  await tryRecalculateCoupon(cart);

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
