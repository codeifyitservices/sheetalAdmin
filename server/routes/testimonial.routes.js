import express from "express";
import {
  getTestimonials,
  addTestimonial,
  updateTestimonial,
  deleteTestimonial,
  reorderTestimonials,
} from "../controllers/testimonials.controller.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";
import { uploadTo } from "../middlewares/multer.middleware.js";

const router = express.Router();

const upload = uploadTo("testimonials").single("image");

router.get("/", getTestimonials);
router.put("/reorder", isAuthenticated, isAdmin, reorderTestimonials);
router.post("/", isAuthenticated, isAdmin, upload, addTestimonial);
router.patch("/:id", isAuthenticated, isAdmin, upload, updateTestimonial);
router.delete("/:id", isAuthenticated, isAdmin, deleteTestimonial);

export default router;
