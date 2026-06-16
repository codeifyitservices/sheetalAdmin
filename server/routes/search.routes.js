import express from "express";
import {
  searchController,
  rebuildIndexController,
} from "../controllers/search.controller.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", searchController);

// Admin-only: force a full index rebuild from MongoDB (useful after bulk imports)
router.post("/rebuild-index", isAuthenticated, isAdmin, rebuildIndexController);

export default router;
