
import express from "express";
import {
    getAboutPage,
    updateAboutPage,
    getPageBySlug,
    updatePageBySlug,
} from "../controllers/pages.controller.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";
import { uploadTo } from "../middlewares/multer.middleware.js";

const router = express.Router();

// Get about page (public)
router.get("/about", getAboutPage);

// Update about page (admin)
router.post(
    "/about",
    isAuthenticated,
    isAdmin,
    uploadTo("pages").fields([
        { name: "bannerImage", maxCount: 1 },
        { name: "founderImage", maxCount: 1 },
        { name: "missionImage", maxCount: 1 },
        { name: "craftImage", maxCount: 1 },
    ]),
    updateAboutPage
);

// Get page by slug (public)
router.get("/slug/:slug", getPageBySlug);

// Update page by slug (admin)
router.post("/slug/:slug", isAuthenticated, isAdmin, updatePageBySlug);

export default router;
