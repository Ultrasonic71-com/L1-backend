import express from "express";
import { redirectToOriginalUrl } from "../controllers/linkController.js";

const router = express.Router();

// Route to redirect to original URL
router.get("/:customAlias/:shortId", redirectToOriginalUrl);
router.get("/:shortId", redirectToOriginalUrl);

export default router;
