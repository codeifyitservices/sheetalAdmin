import * as couponService from "../services/coupon.service.js";
import successResponse from "../utils/successResponse.js";

export const createCoupon = async (req, res, next) => {
  try {
    const result = await couponService.createCouponService(req.body);
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(res, 201, result.data, "Coupon created successfully");
  } catch (error) {
    next(error);
  }
};

export const updateCoupon = async (req, res, next) => {
  try {
    const result = await couponService.updateCouponService(req.params.id, req.body);
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(res, 200, result.data, "Coupon updated successfully");
  } catch (err) {
    next(err);
  }
};

// Public: active + non-expired only
export const getAllCoupons = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const result = await couponService.getAllCouponsService({
      page: Number(page),
      limit: Number(limit),
      search,
      isAdmin: false,
    });
    if (!result.success) return res.status(result.statusCode || 500).json(result);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Admin: all coupons regardless of status or expiry
export const getAllCouponsAdmin = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const result = await couponService.getAllCouponsService({
      page: Number(page),
      limit: Number(limit),
      search,
      isAdmin: true,
    });
    if (!result.success) return res.status(result.statusCode || 500).json(result);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const applyCoupon = async (req, res, next) => {
  try {
    const { code, cartTotal, cartItems } = req.body;
    const result = await couponService.applyCouponService(
      code,
      cartTotal,
      req.user._id,
      cartItems,
    );
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(res, 200, result.data, "Coupon applied successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteCoupon = async (req, res, next) => {
  try {
    const result = await couponService.deleteCouponService(req.params.id);
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(res, 200, null, "Coupon deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const getCouponStats = async (req, res, next) => {
  try {
    const result = await couponService.getCouponStatsService();
    if (!result.success) return res.status(500).json(result);
    return successResponse(res, 200, result.data, "Coupon stats retrieved");
  } catch (error) {
    next(error);
  }
};

// Returns the single coupon with showOnHomepage: true, or null.
// Public — used by the storefront homepage banner.
export const getHomepageCoupon = async (req, res, next) => {
  try {
    const result = await couponService.getHomepageCouponService();
    if (!result.success) return res.status(500).json(result);
    return successResponse(res, 200, result.data, "Homepage coupon retrieved");
  } catch (error) {
    next(error);
  }
};

// Returns the single coupon with showOnLoginPage: true, or null.
// Public — used by the storefront login promo surface.
export const getLoginCoupon = async (req, res, next) => {
  try {
    const result = await couponService.getLoginCouponService();
    if (!result.success) return res.status(500).json(result);
    return successResponse(res, 200, result.data, "Login coupon retrieved");
  } catch (error) {
    next(error);
  }
};
