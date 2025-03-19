import Link from "../models/linkModel.js";
import User from "../models/userModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isValidUrl } from "../utils/validation.js";
import qrCode from "qrcode";

// @desc    Create a new shortened link
// @route   POST /api/links
// @access  Public/Private (depends on if user is logged in)
export const createLink = asyncHandler(async (req, res) => {
  const { originalUrl, customAlias, expiresAt, isQrCode } = req.body;

  // Validate the original URL
  if (!originalUrl) {
    return res.status(400).json({ message: "Original URL is required" });
  }

  if (!isValidUrl(originalUrl)) {
    return res.status(400).json({ message: "Invalid URL format" });
  }

  // Always generate a shortId regardless of custom alias
  let shortId = Link.generateShortId();
  let idExists = true;
  while (idExists) {
    shortId = Link.generateShortId();
    const existingLink = await Link.findOne({ shortId });
    idExists = !!existingLink;
  }

  // Handle custom alias if provided
  let urlPath = shortId;
  if (customAlias?.trim()) {
    const trimmedAlias = customAlias.trim();
    // Check if custom alias already exists
    const existingLink = await Link.findOne({ customAlias: trimmedAlias });
    if (existingLink) {
      return res.status(400).json({ message: "Custom alias already in use" });
    }
    urlPath = `${trimmedAlias}/${shortId}`;
  }

  // Create link object
  const linkData = {
    originalUrl,
    shortId,
    customAlias: customAlias?.trim() || undefined,
  };

  // Add optional fields if provided
  if (expiresAt) linkData.expiresAt = new Date(expiresAt);

  // Add user reference if authenticated
  if (req.user) linkData.user = req.user._id;

  let qrCodeImageUrl;
  if (isQrCode) {
    qrCodeImageUrl = await qrCode.toDataURL(originalUrl, {
      width: 400,
      height: 400,
      margin: 2.5,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
  }

  linkData.qrCodeImageUrl = qrCodeImageUrl;

  // Create the link
  const newLink = new Link(linkData);
  await newLink.save();

  // Generate the full shortened URL based on user's premium status
  const baseUrl =
    process.env.BACKEND_BASE_URL || `${req.protocol}://${req.get("host")}`;
  let shortUrl;

  if (req.user?.isPremium && req.user?.customDomainPrefix) {
    // For premium users with custom domain prefix
    shortUrl = customAlias
      ? `https://${req.user.customDomainPrefix}.${baseUrl.replace(
          /^https?:\/\//,
          ""
        )}/${customAlias}/${shortId}`
      : `https://${req.user.customDomainPrefix}.${baseUrl.replace(
          /^https?:\/\//,
          ""
        )}/${shortId}`;
  } else {
    // For regular users
    shortUrl = customAlias
      ? `${baseUrl}/${customAlias}/${shortId}`
      : `${baseUrl}/${shortId}`;
  }

  res.status(201).json({
    success: true,
    shortUrl,
    shortId,
    customAlias: customAlias?.trim() || undefined,
    originalUrl,
    expiresAt: newLink.expiresAt,
    isPremiumUrl: req.user?.isPremium,
    qrCodeImageUrl: newLink.qrCodeImageUrl,
  });
});

// @desc    Get all links (for authenticated users)
// @route   GET /api/links
// @access  Private
export const getLinks = asyncHandler(async (req, res) => {
  // Ensure user is authenticated
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const links = await Link.find({ user: req.user._id }).sort({ createdAt: -1 });

  const baseUrl =
    process.env.BACKEND_BASE_URL || `${req.protocol}://${req.get("host")}`;
  const isPremiumUser = req.user.isPremium && req.user.customDomainPrefix;
  const customDomainPrefix = req.user.customDomainPrefix;

  const formattedLinks = links.map((link) => {
    const urlPath = link.customAlias
      ? `${link.customAlias}/${link.shortId}`
      : link.shortId;

    return {
      id: link._id,
      shortUrl: isPremiumUser
        ? `https://${customDomainPrefix}.${baseUrl.replace(
            /^https?:\/\//,
            ""
          )}/${urlPath}`
        : `${baseUrl}/${urlPath}`,
      shortId: link.shortId,
      customAlias: link.customAlias,
      originalUrl: link.originalUrl,
      expiresAt: link.expiresAt,
      active: link.active,
      isExpired: link.isExpired(),
      createdAt: link.createdAt,
      isPremiumUrl: isPremiumUser,
      qrCodeImageUrl: link.qrCodeImageUrl,
    };
  });

  res.status(200).json({
    success: true,
    count: formattedLinks.length,
    links: formattedLinks,
  });
});

// @desc    Get link details by ID
// @route   GET /api/links/:id
// @access  Private
export const getLinkById = asyncHandler(async (req, res) => {
  // Ensure user is authenticated
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const link = await Link.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!link) {
    return res.status(404).json({ message: "Link not found" });
  }

  const baseUrl =
    process.env.BACKEND_BASE_URL || `${req.protocol}://${req.get("host")}`;

  res.status(200).json({
    success: true,
    link: {
      id: link._id,
      shortUrl: `${baseUrl}/${link.shortId}`,
      shortId: link.shortId,
      originalUrl: link.originalUrl,
      expiresAt: link.expiresAt,
      active: link.active,
      customAlias: link.customAlias,
      isExpired: link.isExpired(),
      qrCodeImageUrl: link.qrCodeImageUrl,
    },
  });
});

// @desc    Update link by ID
// @route   PUT /api/links/:id
// @access  Private
export const updateLink = asyncHandler(async (req, res) => {
  // Ensure user is authenticated
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const { originalUrl, expiresAt, active } = req.body;

  const link = await Link.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!link) {
    return res.status(404).json({ message: "Link not found" });
  }

  // Update fields if provided
  if (originalUrl !== undefined) {
    if (!isValidUrl(originalUrl)) {
      return res.status(400).json({ message: "Invalid URL format" });
    }
    link.originalUrl = originalUrl;
  }

  if (expiresAt !== undefined) {
    link.expiresAt = expiresAt ? new Date(expiresAt) : null;
  }

  if (active !== undefined) {
    link.active = active;
  }

  await link.save();

  const baseUrl =
    process.env.BACKEND_BASE_URL || `${req.protocol}://${req.get("host")}`;

  res.status(200).json({
    success: true,
    message: "Link updated successfully",
    link: {
      id: link._id,
      shortUrl: `${baseUrl}/${link.shortId}`,
      shortId: link.shortId,
      originalUrl: link.originalUrl,
      expiresAt: link.expiresAt,
      active: link.active,
      customAlias: link.customAlias,
      isExpired: link.isExpired(),
      qrCodeImageUrl: link.qrCodeImageUrl,
    },
  });
});

// @desc    Delete link by ID
// @route   DELETE /api/links/:id
// @access  Private
export const deleteLink = asyncHandler(async (req, res) => {
  // Ensure user is authenticated
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const link = await Link.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!link) {
    return res.status(404).json({ message: "Link not found" });
  }

  await link.deleteOne();

  res.status(200).json({
    success: true,
    message: "Link deleted successfully",
    id: req.params.id,
    qrCodeImageUrl: link.qrCodeImageUrl,
  });
});

// @desc    Redirect to original URL
// @route   GET /:shortId or /:customAlias/:shortId
// @access  Public
export const redirectToOriginalUrl = asyncHandler(async (req, res) => {
  let { shortId, customAlias } = req.params;
  const customDomainPrefix = req.customDomainPrefix;

  // Handle both route formats
  // If we're using the /:customAlias/:shortId format
  if (customAlias && shortId) {
    // We already have both from params
  }
  // If we're using the original /:shortId format
  else if (shortId && !customAlias) {
    // Just use the shortId
  }

  // First check if this link belongs to a premium user with a custom domain
  const premiumLink = await Link.findOne({ shortId }).populate("user");

  // If link exists and was created by a premium user with a custom domain prefix
  if (
    premiumLink &&
    premiumLink.user &&
    premiumLink.user.isPremium &&
    premiumLink.user.customDomainPrefix
  ) {
    // Allow access if using the api subdomain, otherwise enforce the custom domain prefix
    if (
      customDomainPrefix !== "api" &&
      premiumLink.user.customDomainPrefix !== customDomainPrefix
    ) {
      return res.status(404).json({
        message:
          "Link not found. This link may only be accessible through its custom domain.",
      });
    }

    // Check if link is expired or inactive
    if (premiumLink.isExpired()) {
      return res.status(410).json({ message: "Link has expired" });
    }

    if (!premiumLink.active) {
      return res.status(410).json({ message: "Link is inactive" });
    }

    // Redirect to original URL
    return res.redirect(premiumLink.originalUrl);
  }

  // For non-premium links or links without a user
  let link;

  if (customDomainPrefix) {
    // Try to find a user with this custom domain prefix
    const user = await User.findOne({ customDomainPrefix, isPremium: true });

    if (user) {
      // If found, get the link associated with this user and shortId
      link = await Link.findOne({ shortId, user: user._id });
    }
  }

  // If no custom domain match found, fall back to regular shortId lookup
  // but only for links that aren't associated with premium users with custom domains
  if (!link) {
    link = await Link.findOne({
      shortId,
      $or: [
        { user: { $exists: false } },
        { user: null },
        { "user.isPremium": { $ne: true } },
        { "user.customDomainPrefix": { $exists: false } },
        { "user.customDomainPrefix": null },
      ],
    });
  }

  if (!link) {
    return res.status(404).json({ message: "Link not found" });
  }

  // Check if link is expired
  if (link.isExpired()) {
    return res.status(410).json({ message: "Link has expired" });
  }

  // Check if link is active
  if (!link.active) {
    return res.status(410).json({ message: "Link is inactive" });
  }

  // Redirect to original URL
  res.redirect(link.originalUrl);
});
