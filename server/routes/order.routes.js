import express from "express";
import {
  createOrder,
  getMyOrders,
  getSingleOrder,
  adminGetAllOrders,
  adminGetOrderStats,
  updateOrderStatus,
  pushToShiprocket,
  assignAwb,
} from "../controllers/order.controller.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// --- USER ROUTES ---
// 1. Naya order place karne ke liye
router.post("/create", isAuthenticated, createOrder);

// 2. User ko apne purane orders dikhane ke liye (With Pagination)
router.get("/my-orders", isAuthenticated, getMyOrders);

// 3. User: Get single order detail (must own the order)
router.get("/:id", isAuthenticated, getSingleOrder);

// --- ADMIN ROUTES ---
// Admin: Server-side order stats (replaces client-side 1000-order fetch)
router.get("/admin/stats", isAuthenticated, isAdmin, adminGetOrderStats);

// 3. Admin ko poori website ke saare orders dikhane ke liye
router.get("/admin/all", isAuthenticated, isAdmin, adminGetAllOrders);

// 4. Admin order ka status (Shipped/Delivered/Return) update karne ke liye
router.put("/admin/update/:id", isAuthenticated, isAdmin, updateOrderStatus);

// 5. Admin: Manually push an order to Shiprocket (testing + manual sync)
router.post("/admin/push-to-shiprocket/:orderId", isAuthenticated, isAdmin, pushToShiprocket);

// 6. Admin: Assign AWB number to a Shiprocket shipment
router.post("/admin/assign-awb/:orderId", isAuthenticated, isAdmin, assignAwb);

export default router;
