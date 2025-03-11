import mongoose from "mongoose";

const platformAccountSchema = new mongoose.Schema({
  access: {
    token: String,
    refresh_token: String,
    expires_at: Number,
    expires_in: Number,
    created_at: { type: Date, default: Date.now },
  },
  profile: {
    username: String,
    display_name: String,
    avatar_url: String,
  },
  auth: {
    code_verifier: String,
    state: String,
    timestamp: Date,
  },
});
const socialAccountSchema = new mongoose.Schema({
  platform: {
    tiktok: [platformAccountSchema], // Array of TikTok accounts
    youtube: [platformAccountSchema], // Array of YouTube accounts
    facebook: [platformAccountSchema], // Array of Facebook accounts
    instagram: [platformAccountSchema], // Array of Instagram accounts
  },
});

export default socialAccountSchema;
//
