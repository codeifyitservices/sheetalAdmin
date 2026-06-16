import express from "express";
import {
  createBanner,
  getAllBanners,
  getAdminBanners,
  getBannerStats,
  updateBanner,
  deleteBanner,
  reorderBanners,
} from "../controllers/banner.controller.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";
import { uploadTo } from "../middlewares/multer.middleware.js";

const router = express.Router();

router.get("/", getAllBanners);

router.get("/admin/all", isAuthenticated, isAdmin, getAdminBanners);
router.get("/admin/stats", isAuthenticated, isAdmin, getBannerStats);
router.put("/admin/reorder", isAuthenticated, isAdmin, reorderBanners);

router.post(
  "/admin",
  isAuthenticated,
  isAdmin,
  uploadTo("banners").fields([
    { name: "desktopImage", maxCount: 1 },
    { name: "mobileImage", maxCount: 1 },
  ]),
  createBanner,
);

router
  .route("/admin/:id")
  .put(
    isAuthenticated,
    isAdmin,
    uploadTo("banners").fields([
      { name: "desktopImage", maxCount: 1 },
      { name: "mobileImage", maxCount: 1 },
    ]),
    updateBanner,
  )
  .delete(isAuthenticated, isAdmin, deleteBanner);

export default router;
