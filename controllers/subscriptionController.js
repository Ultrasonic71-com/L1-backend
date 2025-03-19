import Stripe from "stripe";
import User from "../models/userModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const stripe = new Stripe(
  "sk_test_51OiWzcKofA4LXuYUAF6MlblcZXdg6iO1NjpEFTkA2Xggv0ybfxtYjfYz2BmSlH74NkDAjULK1FV6COFNv5TqwXB300iXc6Fvw2"
);

// @desc    Create a payment session for premium subscription
// @route   POST /api/subscription/create-session
// @access  Private
export const createCheckoutSession = asyncHandler(async (req, res) => {
  const { customDomainPrefix } = req.body;

  if (!customDomainPrefix) {
    return res
      .status(400)
      .json({ message: "Custom domain prefix is required" });
  }

  // Check if custom domain prefix is available
  const existingUser = await User.findOne({ customDomainPrefix });
  if (existingUser) {
    return res
      .status(400)
      .json({ message: "Custom domain prefix is already taken" });
  }

  // Create a Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Premium URL Shortener Subscription",
            description: "Custom domain prefix for your shortened URLs",
          },
          unit_amount: 2000, // $20.00
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.FRONTEND_URL}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/premium/cancel`,
    metadata: {
      userId: req.user._id.toString(),
      customDomainPrefix,
    },
  });

  res.json({ sessionId: session.id });
});

// @desc    Handle successful payment webhook
// @route   POST /api/subscription/webhook
// @access  Public
export const handleWebhook = asyncHandler(async (req, res) => {
  const payload = req.rawBody || req.body;

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      "whsec_EC4bF8Ug44HhQpqJvNUZrAjnkYK7D8PY"
    );
  } catch (err) {
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata.userId;
    const customDomainPrefix = session.metadata.customDomainPrefix;

    // Update user to premium
    await User.findByIdAndUpdate(userId, {
      isPremium: true,
      customDomainPrefix,
      premiumExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    });
  }

  res.json({ received: true });
});

// @desc    Verify premium status
// @route   GET /api/subscription/status
// @access  Private
export const getPremiumStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  res.json({
    isPremium: user.isPremium,
    customDomainPrefix: user.customDomainPrefix,
    premiumExpiresAt: user.premiumExpiresAt,
  });
});
