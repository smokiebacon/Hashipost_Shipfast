import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/next-auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import { platforms } from "@/app/utils/social";

// Handle OAuth redirect back from social platforms
export async function GET(req, { params }) {
  try {
    const { platform } = params;
    // Verify platform is supported
    if (!platforms[platform]) {
      return NextResponse.json(
        { error: "Platform not supported" },
        { status: 400 }
      );
    }

    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get OAuth code from query params
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Missing authorization code" },
        { status: 400 }
      );
    }

    // Special handling for TikTok
    if (platform === "tiktok") {
      try {
        await connectMongo();
        const user = await User.findById(userId);

        // Manual migration
        if (
          user.socialTokens?.tiktok &&
          (!user.socialAccounts?.platform?.tiktok ||
            user.socialAccounts.platform.tiktok.length === 0)
        ) {
          // Initialize structures if needed
          if (!user.socialAccounts) user.socialAccounts = { platform: {} };
          if (!user.socialAccounts.platform) user.socialAccounts.platform = {};
          if (!user.socialAccounts.platform.tiktok)
            user.socialAccounts.platform.tiktok = [];

          // Only migrate if we have token data
          if (
            user.socialTokens.tiktok.access_token &&
            user.socialTokens.tiktok.profile
          ) {
            user.socialAccounts.platform.tiktok.push({
              access: {
                token: user.socialTokens.tiktok.access_token,
                refresh_token: user.socialTokens.tiktok.refresh_token,
                expires_at: user.socialTokens.tiktok.expires_at,
                expires_in: user.socialTokens.tiktok.expires_in,
                created_at: user.socialTokens.tiktok.created_at,
              },
              profile: user.socialTokens.tiktok.profile,
              auth: {
                code_verifier: user.socialTokens.tiktok.code_verifier,
                state: user.socialTokens.tiktok.state,
                timestamp: user.socialTokens.tiktok.timestamp,
              },
            });

            await user.save();
          }
        }

        // Get code_verifier from the appropriate place
        const code_verifier = user.socialTokens?.tiktok?.code_verifier;

        if (!code_verifier) {
          return NextResponse.json(
            { error: "Missing code verifier for TikTok authentication" },
            { status: 400 }
          );
        }

        // Exchange code for token
        const tokenResponse = await fetch(
          "https://open.tiktokapis.com/v2/oauth/token/",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_key: process.env.TIKTOK_CLIENT_KEY,
              client_secret: process.env.TIKTOK_CLIENT_SECRET,
              code: code,
              grant_type: "authorization_code",
              redirect_uri: "http://localhost:3000/dashboard/accounts",
              code_verifier: code_verifier,
            }),
          }
        );

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
          throw new Error(
            `Token exchange failed: ${
              tokenData.error_description || "Unknown error"
            }`
          );
        }

        // Fetch user info
        const userInfoResponse = await fetch(
          "https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name,union_id,username",
          {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              "Content-Type": "application/json",
            },
          }
        );
        const userInfo = await userInfoResponse.json();

        // Create new social account entry
        const newAccount = {
          access: {
            token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_in: tokenData.expires_in,
            expires_at: Date.now() + tokenData.expires_in * 1000,
            created_at: new Date(),
          },
          profile: {
            username: userInfo.data.user.username,
            display_name: userInfo.data.user.display_name,
            avatar_url: userInfo.data.user.avatar_url,
          },
          auth: {
            code_verifier: code_verifier,
            state: user.socialTokens.tiktok.state,
            timestamp: user.socialTokens.tiktok.timestamp,
          },
        };

        // Update user document with new account
        // First check if this account already exists
        const updatedUser = await User.findById(userId);

        // Initialize the platform structure if it doesn't exist
        if (!updatedUser.socialAccounts) {
          updatedUser.socialAccounts = { platform: {} };
        }

        if (!updatedUser.socialAccounts.platform) {
          updatedUser.socialAccounts.platform = {};
        }

        if (!updatedUser.socialAccounts.platform.tiktok) {
          updatedUser.socialAccounts.platform.tiktok = [];
        }

        // Check if this account already exists
        const existingAccountIndex =
          updatedUser.socialAccounts.platform.tiktok.findIndex(
            (acc) => acc.profile.username === userInfo.data.user.username
          );

        if (existingAccountIndex >= 0) {
          // Update existing account
          updatedUser.socialAccounts.platform.tiktok[existingAccountIndex] =
            newAccount;
        } else {
          // Add new account
          updatedUser.socialAccounts.platform.tiktok.push(newAccount);
        }

        await updatedUser.save();

        // Also update the old socialTokens for backward compatibility
        await User.findByIdAndUpdate(userId, {
          $set: {
            "socialTokens.tiktok": {
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expires_in: tokenData.expires_in,
              expires_at: Date.now() + tokenData.expires_in * 1000,
              created_at: new Date(),
              profile: {
                username: userInfo.data.user.username,
                display_name: userInfo.data.user.display_name,
                avatar_url: userInfo.data.user.avatar_url,
              },
            },
          },
        });

        return NextResponse.redirect(
          `http://localhost:3000/dashboard/accounts?status=success&platform=tiktok`
        );
      } catch (error) {
        console.error("Error exchanging TikTok code for token:", error);
        return NextResponse.redirect(
          `http://localhost:3000/dashboard/accounts?status=error&message=${encodeURIComponent(
            error.message
          )}`
        );
      }
    }

    // Redirect back to app
    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (error) {
    console.error(`Error connecting to ${params.platform}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();
    const user = await User.findById(session.user.id);
    const refresh_token = user?.socialTokens?.tiktok?.refresh_token;

    if (!refresh_token) {
      return NextResponse.json(
        { error: "No refresh token found" },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_key: process.env.TIKTOK_CLIENT_KEY,
          client_secret: process.env.TIKTOK_CLIENT_SECRET,
          grant_type: "refresh_token",
          refresh_token: refresh_token,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || "Failed to refresh token");
    }

    // Get current user to preserve profile data
    const currentUser = await User.findById(session.user.id);
    const profileData = currentUser?.socialTokens?.tiktok?.profile;

    // Update tokens in database while preserving profile data
    await User.findByIdAndUpdate(session.user.id, {
      $set: {
        "socialTokens.tiktok": {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
          created_at: new Date(),
          profile: profileData, // Preserve the profile data
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error refreshing token:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
