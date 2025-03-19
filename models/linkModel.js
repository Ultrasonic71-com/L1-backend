import mongoose from "mongoose";

const linkSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: [true, "Original URL is required"],
      trim: true,
    },
    shortId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customAlias: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    active: {
      type: Boolean,
      default: true,
    },
    qrCodeImageUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Method to generate a unique short ID
linkSchema.statics.generateShortId = function (length = 6) {
  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let shortId = "";
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    shortId += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return shortId;
};

// Check if link is expired
linkSchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

const Link = mongoose.model("Link", linkSchema);

export default Link;
