import express from "express";
import {
  getSections,
  updateSections,
} from "../controllers/homepage.controller.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/sections", getSections);
router.patch("/sections", isAuthenticated, isAdmin, updateSections);

export default router;
