import express from "express";
import {
  createLink,
  deleteLink,
  getLinkById,
  getLinks,
  updateLink,
} from "../controllers/linkController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createLink);
router.get("/", protect, getLinks);
router.get("/:id", protect, getLinkById);
router.put("/:id", protect, updateLink);
router.delete("/:id", protect, deleteLink);

export default router;
