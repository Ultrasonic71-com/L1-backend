import express from "express";
import {
  createCheckoutSession,
  getPremiumStatus,
  handleWebhook,
} from "../controllers/subscriptionController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create-session", protect, createCheckoutSession);
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);
router.get("/status", protect, getPremiumStatus);

export default router;
