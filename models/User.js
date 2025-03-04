import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

// USER SCHEMA
const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      private: true,
    },
    image: {
      type: String,
    },

    subscription: {
      status: {
        type: String,
        enum: ["active", "inactive", "trialing"],
        default: "inactive",
      },
      plan: {
        type: String,
        enum: ["free", "pro", "enterprise"],
        default: "free",
      },
      currentPeriodEnd: { type: Date },
      customerId: { type: String },
      subscriptionId: { type: String },
    },
    socialTokens: {
      youtube: {
        access_token: { type: String },
        refresh_token: { type: String },
        expires_at: { type: Number },
      },
      facebook: {
        access_token: { type: String },
        refresh_token: { type: String },
        expires_at: { type: Number },
      },
      instagram: {
        access_token: { type: String },
        refresh_token: { type: String },
        expires_at: { type: Number },
      },
      tiktok: {
        access_token: { type: String },
        refresh_token: { type: String },
        expires_at: { type: Number },
        code_verifier: { type: String },
        state: { type: String },
        timestamp: { type: Date },
        expires_in: { type: Number },
        created_at: { type: Date },
      },
    },
    // Used in the Stripe webhook to identify the user in Stripe and later create Customer Portal or prefill user credit card details
    customerId: {
      type: String,
      validate(value) {
        return value.includes("cus_");
      },
    },
    // Used in the Stripe webhook. should match a plan in config.js file.
    priceId: {
      type: String,
      validate(value) {
        return value.includes("price_");
      },
    },
    // Used to determine if the user has access to the product—it's turn on/off by the Stripe webhook
    hasAccess: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// add plugin that converts mongoose to json
userSchema.plugin(toJSON);

export default mongoose.models.User || mongoose.model("User", userSchema);
