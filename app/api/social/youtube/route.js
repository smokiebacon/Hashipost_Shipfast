import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/next-auth";
import CryptoJS from "crypto-js";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";

//GET request for TikTok OAuth flow, getting the url for the user to login with TikTok.
export async function GET(req) {
  // Check authentication - user needs to be logged in first
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.redirect(new URL("/api/auth/signin", req.url));
  }

  try {
    const csrfState = Math.random().toString(36).substring(2);
    function generateRandomString(length) {
      var result = "";
      var characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
      var charactersLength = characters.length;
      for (var i = 0; i < length; i++) {
        result += characters.charAt(
          Math.floor(Math.random() * charactersLength)
        );
      }
      return result;
    }
    const code_verifier = generateRandomString(43); // Minimum length should be 43 per TikTok docs
    // Generate code challenge using SHA256
    const code_challenge = CryptoJS.SHA256(code_verifier).toString(
      CryptoJS.enc.Hex
    );

    await connectMongo();
    const updatedUser = await User.findByIdAndUpdate(session.user.id, {
      $set: {
        "socialTokens.youtube": {
          code_verifier: code_verifier,
          code_challenge: code_challenge,
          state: csrfState,
          timestamp: new Date(),
        },
      },
    });
    const scopes = [
      "https://www.googleapis.com/auth/youtube.force-ssl",
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube	",
    ];

    const youtubeOAuthURL = `https://accounts.google.com/o/oauth2/v2/auth`;
    // Save code_verifier and other OAuth state to user document to use in Callback

    return NextResponse.json({ url: youtubeOAuthURL });
  } catch (error) {
    console.error("Error starting TikTok OAuth flow:", error);
    return NextResponse.redirect(
      new URL("/dashboard/accounts?error=tiktok_auth_failed", req.url)
    );
  }
}
