import express from "express";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import successResponse from "../utils/successResponse.js";
import {
  getValidAbandonedCartCouponForUser,
  validateAndApplyAbandonedCartCoupon,
} from "../services/abandonedcartcoupon.service.js";

const router = express.Router();

router.get("/coupon", isAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorised" });
    }

    const coupon = await getValidAbandonedCartCouponForUser({
      userId: userId.toString(),
    });

    return successResponse(
      res,
      200,
      coupon,
      coupon ? "Valid abandoned-cart coupon found" : "No valid abandoned-cart coupon found",
    );
  } catch (error) {
    next(error);
  }
});

router.post("/apply-coupon", isAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { code } = req.body || {};

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorised" });
    }

    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon code is required" });
    }

    const result = await validateAndApplyAbandonedCartCoupon({
      code,
      userId: userId.toString(),
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return successResponse(
      res,
      200,
      {
        discount: result.discount,
        couponCode: String(code).trim().toUpperCase(),
      },
      result.message,
    );
  } catch (error) {
    next(error);
  }
});

export default router;
