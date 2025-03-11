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
    // const updatedUser2 = await User.findByIdAndUpdate(
    //   session.user.id,
    //   {
    //     $set: {
    //       "socialAccounts.platform.tiktok": {
    //         code_verifier: code_verifier,
    //         code_challenge: code_challenge,
    //         state: csrfState,
    //         timestamp: new Date(),
    //       },
    //     },
    //   },
    //   { new: true }
    // );

    const updatedUser = await User.findByIdAndUpdate(session.user.id, {
      $set: {
        "socialTokens.tiktok": {
          code_verifier: code_verifier,
          code_challenge: code_challenge,
          state: csrfState,
          timestamp: new Date(),
        },
      },
    });

    const tiktokOAuthURL = `https://www.tiktok.com/v2/auth/authorize/?client_key=${
      process.env.TIKTOK_CLIENT_KEY
    }&scope=user.info.basic,video.publish,video.upload,video.list,user.info.profile&response_type=code&redirect_uri=${encodeURIComponent(
      "http://localhost:3000/dashboard/accounts"
    )}&state=${csrfState}&code_challenge=${code_challenge}&code_challenge_method=S256`;

    // Save code_verifier and other OAuth state to user document to use in Callback

    return NextResponse.json({ url: tiktokOAuthURL });
  } catch (error) {
    console.error("Error starting TikTok OAuth flow:", error);
    return NextResponse.redirect(
      new URL("/dashboard/accounts?error=tiktok_auth_failed", req.url)
    );
  }
}
