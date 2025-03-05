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
    
    // Connect to MongoDB
    await connectMongo();
    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Special handling for TikTok
    if (platform === "tiktok") {
      // Only attempt to revoke if we have a token
      if (user?.socialTokens?.tiktok?.access_token) {
        try {
          // Revoke token with TikTok API
          const tokenResponse = await fetch(
            "https://open.tiktokapis.com/v2/oauth/revoke/",
            {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_key: process.env.TIKTOK_CLIENT_KEY,
                client_secret: process.env.TIKTOK_CLIENT_SECRET,
                token: user.socialTokens.tiktok.access_token,
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
      
      // Remove TikTok tokens from user
      await User.findByIdAndUpdate(userId, {
        $unset: { "socialTokens.tiktok": "" }
      });
      
      return NextResponse.json({ 
        success: true, 
        message: "Successfully disconnected from TikTok" 
      });
    }
    
    // Generic handling for other platforms
    // Remove platform tokens from user
    await User.findByIdAndUpdate(userId, {
      $unset: { [`socialTokens.${platform}`]: "" }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully disconnected from ${platform}` 
    });
    
  } catch (error) {
    console.error(`Error disconnecting from ${params.platform}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}