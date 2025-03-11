import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/next-auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import { platforms } from "@/app/utils/social";

// Handle disconnection from social platforms
export async function POST(req, { params }) {
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
    // Get username from request body
    const { username } = await req.json();

    // Connect to MongoDB
    await connectMongo();
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Special handling for TikTok
    if (platform === "tiktok") {
      // Check if we have socialAccounts structure
      if (user.socialAccounts?.platform?.tiktok) {
        // Find the specific account by username
        const accountIndex = user.socialAccounts.platform.tiktok.findIndex(
          (account) => account.profile.username === username
        );

        if (accountIndex !== -1) {
          // Get the access token for revocation
          const accessToken =
            user.socialAccounts.platform.tiktok[accountIndex].access.token;

          // Try to revoke the token with TikTok API
          if (accessToken) {
            try {
              const tokenResponse = await fetch(
                "https://open.tiktokapis.com/v2/oauth/revoke/",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                  body: new URLSearchParams({
                    client_key: process.env.TIKTOK_CLIENT_KEY,
                    client_secret: process.env.TIKTOK_CLIENT_SECRET,
                    token: accessToken,
                  }),
                }
              );

              const tokenData = await tokenResponse.json();

              if (!tokenResponse.ok) {
                console.error("TikTok token revocation failed:", tokenData);
              }
            } catch (error) {
              console.error("Error revoking TikTok token:", error);
              // Continue with local disconnection even if revocation fails
            }
          }

          // Remove the specific account from the array
          user.socialAccounts.platform.tiktok.splice(accountIndex, 1);
          await user.save();

          return NextResponse.json({
            success: true,
            message: `Successfully disconnected TikTok account: ${username}`,
          });
        } else {
          return NextResponse.json(
            {
              error: `TikTok account with username ${username} not found`,
            },
            { status: 404 }
          );
        }
      } else if (user.socialTokens?.tiktok) {
        // For backward compatibility, check if we should remove from old structure
        if (
          !username ||
          user.socialTokens.tiktok.profile?.username === username
        ) {
          // Remove TikTok tokens from user
          await User.findByIdAndUpdate(userId, {
            $unset: { "socialTokens.tiktok": "" },
          });

          return NextResponse.json({
            success: true,
            message: "Successfully disconnected from TikTok",
          });
        }
      }

      return NextResponse.json(
        {
          error: "No matching TikTok account found",
        },
        { status: 404 }
      );
    }

    // Generic handling for other platforms
    // Remove platform tokens from user
    await User.findByIdAndUpdate(userId, {
      $unset: { [`socialTokens.${platform}`]: "" },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully disconnected from ${platform}`,
    });
  } catch (error) {
    console.error(`Error disconnecting from ${params.platform}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
