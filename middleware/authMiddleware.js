import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Middleware to protect routes that require authentication
 * Verifies JWT token from cookies or Authorization header
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in cookies first (preferred method)
  if (req.cookies.token) {
    token = req.cookies.token;
  }
  // Also check Authorization header as fallback
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // If no token found, return unauthorized
  if (!token) {
    return res.status(401).json({
      message: "Not authorized to access this resource",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database, excluding password
    const user = await User.findById(decoded.id).select("-password");

    // If user not found, return unauthorized
    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    // Add user object to request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Not authorized, token failed",
    });
  }
});
