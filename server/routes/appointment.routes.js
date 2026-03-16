import express from "express";
import {
    createAppointment,
    getAppointments,
    getAppointment,
    updateStatus,
    updateNotes,
    deleteAppointment,
} from "../controllers/appointment.controller.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", createAppointment);
router.get("/", isAuthenticated, isAdmin, getAppointments);
router.get("/:id", isAuthenticated, isAdmin, getAppointment);
router.patch("/:id/status", isAuthenticated, isAdmin, updateStatus);
router.patch("/:id/notes", isAuthenticated, isAdmin, updateNotes);
router.delete("/:id", isAuthenticated, isAdmin, deleteAppointment);

export default router;
