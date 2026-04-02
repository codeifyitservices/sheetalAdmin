import express from "express";
import {
  createBlog,
  getBlogs,
  getSingleBlog,
  updateBlog,
  deleteBlog,
  getBlogStats,
} from "../controllers/blog.controller.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";
import { uploadTo } from "../middlewares/multer.middleware.js";

const router = express.Router();

router.get("/", getBlogs);
router.get("/post/:slug", getSingleBlog);

router.get("/admin/stats", isAuthenticated, isAdmin, getBlogStats);
router.get("/admin/all", isAuthenticated, isAdmin, getBlogs);

router.post(
  "/admin",
  isAuthenticated,
  isAdmin,
  uploadTo("blogs").fields([
    { name: "bannerImage", maxCount: 1 },
    { name: "contentImage", maxCount: 1 },
    { name: "ogImage", maxCount: 1 },
  ]),
  createBlog,
);

router
  .route("/admin/:id")
  .put(
    isAuthenticated,
    isAdmin,
    uploadTo("blogs").fields([
      { name: "bannerImage", maxCount: 1 },
      { name: "contentImage", maxCount: 1 },
      { name: "ogImage", maxCount: 1 },
    ]),
    updateBlog,
  )
  .delete(isAuthenticated, isAdmin, deleteBlog);

export default router;
