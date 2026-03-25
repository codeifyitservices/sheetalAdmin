import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import ErrorResponse from "../utils/ErrorResponse.js";

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

  await cart.save();
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
    await cart.save();
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

  await cart.save();
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
  await cart.save();

  return {
    success: true,
    message: "Cart cleared successfully"
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
    const { productId, quantity, size, color, price, discountPrice, variantImage } = guestItem;

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
      cart.items.push({ product: productId, quantity, size, color, price, discountPrice, variantImage });
    }
  }

  await cart.save();
  return { success: true, data: cart, message: "Guest cart merged successfully" };
};
