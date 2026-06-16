import express from "express";
import {
  getSettings,
  updateSettings,
} from "../controllers/settings.controller.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", getSettings); // Public read for frontend
router.put("/", isAuthenticated, isAdmin, updateSettings);

export default router;
