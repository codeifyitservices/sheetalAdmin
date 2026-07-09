import express from "express";
import {
  createColor,
  getAllColors,
  updateColor,
  deleteColor,
} from "../controllers/color.controller.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", getAllColors);
router.post("/", isAuthenticated, isAdmin, createColor);
router.patch("/:id", isAuthenticated, isAdmin, updateColor);
router.delete("/:id", isAuthenticated, isAdmin, deleteColor);

export default router;
