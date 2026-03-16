import express from "express";
import {
  createCoupon,
  getAllCoupons,
  getAllCouponsAdmin,
  getCouponStats,
  getHomepageCoupon,
  getLoginCoupon,
  deleteCoupon,
  applyCoupon,
  updateCoupon,
} from "../controllers/coupon.controller.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ── Public routes ──────────────────────────────────────────────
// IMPORTANT: specific string routes must come before /:id wildcard
router.get("/homepage", getHomepageCoupon);              // public — storefront banner
router.get("/login", getLoginCoupon);                    // public — storefront login promo
router.get("/", getAllCoupons);                           // public — active+valid only
router.post("/apply", isAuthenticated, applyCoupon);

// ── Admin routes ───────────────────────────────────────────────
// /admin/all and /admin/stats must be before /admin/:id
router.get("/admin/all", isAuthenticated, isAdmin, getAllCouponsAdmin);   // all coupons, no filter
router.get("/admin/stats", isAuthenticated, isAdmin, getCouponStats);
router.post("/admin", isAuthenticated, isAdmin, createCoupon);
router
  .route("/admin/:id")
  .put(isAuthenticated, isAdmin, updateCoupon)
  .delete(isAuthenticated, isAdmin, deleteCoupon);

export default router;
