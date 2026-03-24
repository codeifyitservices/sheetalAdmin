import express from "express";
import {
  createProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  createProductReview,
  getProductReviews,
  deleteReview,
  getProductDetails,
  getProductStats,
  bulkImportProducts,
  getNewArrivals,
  getLowStockProducts,
  getTrendingProducts,
  incrementViewCount,
  getSampleExcel,
  checkCanReview,
  getAllReviews,
  updateReviewStatus,
  getMostViewedProducts,
  getCollectionProducts,
} from "../controllers/product.controller.js";

import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";
import { uploadTo } from "../middlewares/multer.middleware.js";

const router = express.Router();

// ─── Static public routes ─────────────────────────────────────────────────────
router.get("/", getAllProducts);
router.get("/all", getAllProducts);
router.get("/new-arrivals", getNewArrivals);
router.get("/trending", getTrendingProducts);
router.get("/reviews", getProductReviews);
router.get("/can-review", isAuthenticated, checkCanReview);
router.get("/collections", getCollectionProducts);

// ─── Static admin routes (MUST be before /:id) ───────────────────────────────
router.get("/admin/stats", isAuthenticated, isAdmin, getProductStats);
router.get("/admin/sample-excel", isAuthenticated, isAdmin, getSampleExcel);
router.get("/admin/reviews", isAuthenticated, isAdmin, getAllReviews);
router.get("/admin/low-stock", isAuthenticated, isAdmin, getLowStockProducts);
router.get("/admin/most-viewed", isAuthenticated, isAdmin, getMostViewedProducts);

router.post(
  "/admin/import",
  isAuthenticated,
  isAdmin,
  uploadTo("temp/bulk").fields([
    { name: "file", maxCount: 1 },
    { name: "images", maxCount: 500 },
    { name: "variantVideos", maxCount: 500 },
  ]),
  bulkImportProducts,
);

router.post(
  "/admin/new",
  isAuthenticated,
  isAdmin,
  uploadTo("products").fields([
    { name: "mainImage", maxCount: 1 },
    { name: "hoverImage", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "ogImage", maxCount: 1 },
    { name: "images", maxCount: 10 },
    { name: "variantImages", maxCount: 20 },
    { name: "variantVideos", maxCount: 20 },
    { name: "variantGalleryImages", maxCount: 100 },
  ]),
  createProduct,
);

router.put(
  "/admin/:id",
  isAuthenticated,
  isAdmin,
  uploadTo("products").fields([
    { name: "mainImage", maxCount: 1 },
    { name: "hoverImage", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "ogImage", maxCount: 1 },
    { name: "images", maxCount: 10 },
    { name: "variantImages", maxCount: 20 },
    { name: "variantVideos", maxCount: 20 },
    { name: "variantGalleryImages", maxCount: 100 },
  ]),
  updateProduct,
);

router.delete("/admin/:id", isAuthenticated, isAdmin, deleteProduct);
router.put("/admin/reviews/:id", isAuthenticated, isAdmin, updateReviewStatus);
router.delete("/admin/reviews", isAuthenticated, isAdmin, deleteReview);

// ─── View increment ───────────────────────────────────────────────────────────
router.post("/view/:id", incrementViewCount);
router.patch("/view/:slug", incrementViewCount);

// ─── Protected routes ─────────────────────────────────────────────────────────
router.put("/review", isAuthenticated, createProductReview);

// ─── Param routes LAST (catch-all — must be at the bottom) ───────────────────
router.get("/detail/:id", getProductDetails);
router.get("/:id", getProductDetails);

export default router;
