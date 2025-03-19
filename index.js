import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import linkRoutes from "./routes/linkRoutes.js";
import redirectRoutes from "./routes/redirectRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import { errorHandler } from "./utils/error.js";

dotenv.config();
connectDB();

const app = express();
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
};

app.use(
  express.json({
    verify: (req, res, buf) => {
      if (req.originalUrl.endsWith("/webhook")) {
        req.rawBody = buf.toString();
      }
    },
  })
);

// Add middleware to extract custom domain prefix
app.use((req, res, next) => {
  // Extract the subdomain from the host
  const host = req.headers.host;

  if (host) {
    const parts = host.split(".");

    // If we have a subdomain (e.g., something.shortly.com)
    // and it's not 'www' or other common prefixes
    if (parts.length > 2 && !["www", "app"].includes(parts[0])) {
      req.customDomainPrefix = parts[0];
    }
  }

  next();
});

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors(corsOptions));

app.use("/api/auth", authRoutes);
app.use("/api/links", linkRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/", redirectRoutes);

app.get("/api", (req, res) => {
  res.send("api is running!!");
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
