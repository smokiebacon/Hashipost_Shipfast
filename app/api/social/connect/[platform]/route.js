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
    console.log(session, "session");
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
        // Get the stored code_verifier from user
        await connectMongo();
        const user = await User.findById(userId);
        const code_verifier = user?.socialTokens?.tiktok?.code_verifier;
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
              code_verifier: code_verifier, // Required for PKCE
            }),
          }
        );

        // const { access_token, refresh_token, scope } =
        //   await tokenResponse.json();
        const tokenData = await tokenResponse.json();
        console.log(tokenData, "tokenData ##############");

        if (!tokenResponse.ok) {
          throw new Error(
            `Token exchange failed: ${
              tokenData.error_description || "Unknown error"
            }`
          );
        }

        // Store the tokens in your database
        await User.findByIdAndUpdate(userId, {
          $set: {
            [`socialTokens.${platform}`]: {
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expires_in: tokenData.expires_in,
              created_at: new Date(),
            },
          },
        });

        // Redirect to dashboard with success message
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

    // Update tokens in database
    await User.findByIdAndUpdate(session.user.id, {
      $set: {
        "socialTokens.tiktok": {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
          created_at: new Date(),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error refreshing token:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
