import express from "express";
import {
  createSharedCart,
  getSharedCart,
} from "../controllers/sharedCart.controller.js";

const router = express.Router();

router.post("/", createSharedCart);
router.get("/:token", getSharedCart);

export default router;
