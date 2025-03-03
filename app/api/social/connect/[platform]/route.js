import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { connectMongo } from "@/libs/mongoose";
import User from "@/models/User";
import { platforms } from "@/app/utils/social";

// Handle OAuth redirect back from social platforms
export async function GET(req, { params }) {
  try {
    const { platform } = params;
    console.log(platform, "platform");
    // Verify platform is supported
    if (!platforms[platform]) {
      return NextResponse.json(
        { error: "Platform not supported" },
        { status: 400 }
      );
    }

    // Authenticate user
    // const session = await getServerSession(authOptions);
    // if (!session?.user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // const userId = session.user.id;

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
        // Connect to database
        // await connectMongo();

        // Get the stored code_verifier
        // const user = await User.findById(userId);
        // const code_verifier = user?.tiktokAuth?.code_verifier;

        // if (!code_verifier) {
        //   return NextResponse.json(
        //     { error: "Missing code verifier for TikTok authentication" },
        //     { status: 400 }
        //   );
        // }

        // In a real app, you would exchange the code for a token here using the TikTok API
        // For example:
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
            }),
          }
        );
        // Update user with new TikTok token
        // await User.findByIdAndUpdate(userId, {
        //   $set: {
        //     [`socialTokens.${platform}`]: tokenResponse,
        //   },
        // });

        return NextResponse.json({
          tokenResponse,
          success: true,
          message: "TikTok account connected successfully",
        });
      } catch (error) {
        console.error("Error exchanging TikTok code for token:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Connect to database
    // await connectToDatabase();

    // // Update user with new token
    // await User.findByIdAndUpdate(userId, {
    //   $set: {
    //     [`socialTokens.${platform}`]: tokenResponse,
    //   },
    // });

    // Redirect back to app
    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (error) {
    console.error(`Error connecting to ${params.platform}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Generate authorization URL
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
    // const session = await getServerSession(authOptions);
    // if (!session?.user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // In a real app, generate proper OAuth URL
    // For MVP, we'll return a mock URL
    const mockAuthUrl = `/api/social/connect/${platform}?code=mock-auth-code`;

    return NextResponse.json({
      url: mockAuthUrl,
    });
  } catch (error) {
    console.error(`Error generating auth URL for ${params.platform}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
