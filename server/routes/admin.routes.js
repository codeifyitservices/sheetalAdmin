import express from "express";
import {
  getAdminDashboardStats,
  changePassword,
} from "../controllers/admin.controller.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/dashboard-stats",
  isAuthenticated,
  isAdmin,
  getAdminDashboardStats,
);

router.put("/change-password", isAuthenticated, isAdmin, changePassword);

export default router;
