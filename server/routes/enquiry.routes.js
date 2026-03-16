import express from "express";
import {
  createEnquiry,
  getEnquiries,
  updateStatus,
  deleteEnquiry,
  sendAvailability,
} from "../controllers/enquiry.controller.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", createEnquiry);
router.get("/", isAuthenticated, isAdmin, getEnquiries);
router.patch("/:id/status", isAuthenticated, isAdmin, updateStatus);
router.post(
  "/:id/send-availability",
  isAuthenticated,
  isAdmin,
  sendAvailability,
);
router.delete("/:id", isAuthenticated, isAdmin, deleteEnquiry);

export default router;
