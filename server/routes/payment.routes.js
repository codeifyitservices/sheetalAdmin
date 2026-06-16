import express from "express";
import {
  createPaymentLink,
  verifyPayment,
} from "../controllers/payment.controller.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/create-link", isAuthenticated, createPaymentLink);

// Verify payment after Razorpay redirect — marks order Paid + pushes to Shiprocket
router.post("/verify", isAuthenticated, verifyPayment);

export default router;
