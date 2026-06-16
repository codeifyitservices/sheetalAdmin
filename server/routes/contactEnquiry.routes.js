import express from "express";
import {
  createContactEnquiry,
  getContactEnquiries,
  updateContactEnquiryStatus,
  deleteContactEnquiry,
} from "../controllers/contactEnquiry.controller.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", createContactEnquiry);
router.get("/", isAuthenticated, isAdmin, getContactEnquiries);
router.patch(
  "/:id/status",
  isAuthenticated,
  isAdmin,
  updateContactEnquiryStatus,
);
router.delete("/:id", isAuthenticated, isAdmin, deleteContactEnquiry);

export default router;
