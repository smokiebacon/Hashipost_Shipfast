import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";
import socialAccountSchema from "./SocialAccounts";
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
    socialAccounts: socialAccountSchema,
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
        profile: {
          username: { type: String },
          display_name: { type: String },
          avatar_url: { type: String },
        },
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

// Add this to your User schema
userSchema.methods.getTikTokAccounts = function () {
  return this.socialAccounts?.platform?.tiktok || [];
};

userSchema.methods.getTikTokAccountByUsername = function (username) {
  return this.socialAccounts?.platform?.tiktok?.find(
    (account) => account.profile.username === username
  );
};

// Helper method to get all accounts for a specific platform
userSchema.methods.getAccountsForPlatform = function (platform) {
  return this.socialAccounts.filter((account) => account.platform === platform);
};

// Helper method to find a specific account
userSchema.methods.findAccount = function (platform, accountId) {
  return this.socialAccounts.find(
    (account) =>
      account.platform === platform && account.accountId === accountId
  );
};

// Add this to your User schema
userSchema.methods.migrateSocialTokens = async function () {
  if (this.socialTokens) {
    // Migrate TikTok
    if (this.socialTokens.tiktok) {
      if (!this.socialAccounts) {
        this.socialAccounts = { platform: { tiktok: [] } };
      }

      const existingAccount = this.getAccountsForPlatform("tiktok").find(
        (acc) =>
          acc.profile?.username === this.socialTokens.tiktok.profile?.username
      );

      if (!existingAccount && this.socialTokens.tiktok.access_token) {
        const tiktokAccount = {
          access: {
            token: this.socialTokens.tiktok.access_token,
            refresh_token: this.socialTokens.tiktok.refresh_token,
            expires_at: this.socialTokens.tiktok.expires_at,
            expires_in: this.socialTokens.tiktok.expires_in,
            created_at: this.socialTokens.tiktok.created_at,
          },
          profile: this.socialTokens.tiktok.profile,
          auth: {
            code_verifier: this.socialTokens.tiktok.code_verifier,
            state: this.socialTokens.tiktok.state,
            timestamp: this.socialTokens.tiktok.timestamp,
          },
        };

        if (!this.socialAccounts.platform.tiktok) {
          this.socialAccounts.platform.tiktok = [];
        }
        this.socialAccounts.platform.tiktok.push(tiktokAccount);
      }
    }
    // Add similar migrations for other platforms
  }
  await this.save();
};

// add plugin that converts mongoose to json
userSchema.plugin(toJSON);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
