import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/libs/mongoose";
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

    // In a real app, exchange code for access token
    // For this MVP, we'll simulate it
    const mockToken = {
      access_token: `mock-${platform}-token-${Date.now()}`,
      refresh_token: `mock-${platform}-refresh-${Date.now()}`,
      expires_at: Date.now() + 3600000, // 1 hour from now
    };

    // Connect to database
    await connectToDatabase();

    // Update user with new token
    await User.findByIdAndUpdate(userId, {
      $set: {
        [`socialTokens.${platform}`]: mockToken,
      },
    });

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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
