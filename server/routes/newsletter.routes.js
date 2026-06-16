import { Router } from "express";
import { isAdmin, isAuthenticated } from "../middlewares/auth.middleware.js";
import {
  createSubscriber,
  deleteSubscriber,
  getAllSubscribers,
  updateSubscriberStatus,
} from "../controllers/newsletter.controller.js";

const router = Router();

router.get("/", isAuthenticated, isAdmin, getAllSubscribers);
router.post("/", createSubscriber);
router.patch("/:id", isAuthenticated, isAdmin, updateSubscriberStatus);
router.delete("/:id", isAuthenticated, isAdmin, deleteSubscriber);

export default router;
