import express from "express";
import {
  getInstaCards,
  addInstaCard,
  updateInstaCard,
  deleteInstaCard,
  reorderInstaCards,
} from "../controllers/instagram.controller.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";
import { uploadTo } from "../middlewares/multer.middleware.js";

const router = express.Router();

const upload = uploadTo("instacards").single("image");

// Public
router.get("/", getInstaCards);

// Admin
router.post("/", isAuthenticated, isAdmin, upload, addInstaCard);
router.patch("/reorder", isAuthenticated, isAdmin, reorderInstaCards); // must be before /:id
router.patch("/:id", isAuthenticated, isAdmin, upload, updateInstaCard);
router.delete("/:id", isAuthenticated, isAdmin, deleteInstaCard);

export default router;
