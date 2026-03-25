import * as cartService from "../services/cart.service.js";
import successResponse from "../utils/successResponse.js";

export const getCart = async (req, res, next) => {
  try {
    const result = await cartService.getCartByUserIdService(req.user._id);
    return successResponse(res, 200, result.data, "Cart retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity, size, color, price, discountPrice, variantImage } = req.body;
    const result = await cartService.addToCartService(
      req.user._id, productId, quantity, size, color, price, discountPrice, variantImage,
    );
    return successResponse(res, 200, result.data, "Product added to cart successfully");
  } catch (err) {
    next(err);
  }
};

export const removeFromCart = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await cartService.removeFromCartService(req.user._id, id);
    return successResponse(res, 200, result.data, "Item removed from cart successfully");
  } catch (err) {
    next(err);
  }
};

export const updateCartItemQuantity = async (req, res, next) => {
  try {
    const { id: itemId } = req.params;
    const { quantity: newQuantity } = req.body;
    const result = await cartService.updateCartItemQuantityService(req.user._id, itemId, newQuantity);
    return successResponse(res, 200, result.data, "Cart item quantity updated successfully");
  } catch (err) {
    next(err);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    const result = await cartService.clearCartService(req.user._id);
    return successResponse(res, 200, null, result.message);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /cart/merge-guest
 * Merges guest cart (localStorage) items into the authenticated user's cart.
 */
export const mergeGuestCart = async (req, res, next) => {
  try {
    const { guestItems } = req.body;
    const result = await cartService.mergeGuestCartService(req.user._id, guestItems);
    return successResponse(res, 200, result.data, result.message);
  } catch (err) {
    next(err);
  }
};

