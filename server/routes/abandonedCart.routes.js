import express from "express";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";
import successResponse from "../utils/successResponse.js";
import Cart from "../models/cart.model.js";
import Coupon from "../models/coupon.model.js";
import {
  getValidAbandonedCartCouponForUser,
  validateAndApplyAbandonedCartCoupon,
  issueAbandonedCartCoupon,
} from "../services/abandonedcartcoupon.service.js";
import logger from "../utils/logger.js";

const router = express.Router();

// ... your existing /coupon and /apply-coupon routes ...

// ── POST /abandoned-carts/push-coupon ──────────────────────────────────────
// Admin only. Finds all abandoned carts that have NOT yet had a successful
// "third" reminder attempt, issues the specified coupon to each, and returns
// a count. Messaging is intentionally left to the caller / existing job system.

router.post("/push-coupon", isAdmin, async (req, res, next) => {
  try {
    const { couponId } = req.body || {};

    if (!couponId) {
      return res
        .status(400)
        .json({ success: false, message: "couponId is required" });
    }

    // 1. Validate the coupon exists and is active
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }
    if (!coupon.isActive) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon is not active" });
    }
    if (!coupon.isAbandonedCartCoupon) {
      return res.status(400).json({
        success: false,
        message: "This coupon is not flagged for abandoned cart recovery",
      });
    }

    // 2. Find eligible carts:
    //    - currently abandoned
    //    - has a user + cycleId (needed to issue the coupon)
    //    - has NOT yet had a successful "third" stage reminder
    const eligibleCarts = await Cart.find({
      abandonmentStatus: "abandoned",
      user: { $exists: true, $ne: null },
      abandonmentCycleId: { $exists: true, $ne: null },
      "items.0": { $exists: true }, // cart must not be empty
      abandonmentReminderAttempts: {
        $not: {
          $elemMatch: { stage: "third", status: "success" },
        },
      },
    }).lean();

    if (eligibleCarts.length === 0) {
      return successResponse(res, 200, { count: 0 }, "No eligible carts found");
    }

    // 3. Issue the coupon to each eligible cart, skipping any that already
    //    have a valid coupon for this cycle (issueAbandonedCartCoupon is
    //    idempotent per cartId + cycleId).
    const results = await Promise.allSettled(
      eligibleCarts.map((cart) =>
        issueAbandonedCartCoupon({
          cartId: cart._id.toString(),
          userId: cart.user.toString(),
          cycleId: cart.abandonmentCycleId,
          discountPercent: coupon.offerValue, // uses the coupon's % value
          items: cart.items,
          code: coupon.code,
        }),
      ),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed > 0) {
      logger.warn(
        { succeeded, failed, couponId },
        "[push-coupon] Some carts failed during coupon issuance",
      );
    }

    logger.info(
      { succeeded, failed, couponId },
      "[push-coupon] Manual abandoned cart coupon push complete",
    );

    return successResponse(
      res,
      200,
      { count: succeeded, failed },
      `Coupon pushed to ${succeeded} abandoned cart${succeeded !== 1 ? "s" : ""}${failed > 0 ? ` (${failed} failed)` : ""}`,
    );
  } catch (error) {
    next(error);
  }
});

export default router;