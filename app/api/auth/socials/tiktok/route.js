import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/next-auth";
import CryptoJS from "crypto-js";

export async function GET(req) {
  console.log("I AM TIKTOK ROUTE");
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

    const tiktokOAuthURL = `https://www.tiktok.com/v2/auth/authorize/?client_key=${
      process.env.TIKTOK_CLIENT_KEY
    }&scope=user.info.basic,video.upload,video.list&response_type=code&redirect_uri=${encodeURIComponent(
      "http://localhost:3000/dashboard/accounts"
    )}&state=${csrfState}&code_challenge=${code_challenge}&code_challenge_method=S256`;

    return NextResponse.redirect(tiktokOAuthURL);
  } catch (error) {
    console.error("Error starting TikTok OAuth flow:", error);
    return NextResponse.redirect(
      new URL("/dashboard/accounts?error=tiktok_auth_failed", req.url)
    );
  }
}
