import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/next-auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();
    const foundUserProfile = await User.findById(session.user.id);
    console.log(
      "Full user profile:",
      JSON.stringify(foundUserProfile, null, 2)
    );

    if (!foundUserProfile?.socialTokens?.tiktok?.profile) {
      return NextResponse.json(
        { error: "TikTok profile not found" },
        { status: 404 }
      );
    }

    const foundTikTokUserProfile = foundUserProfile.socialTokens.tiktok.profile;
    console.log("TikTok profile:", foundTikTokUserProfile);
    return NextResponse.json(foundTikTokUserProfile);
  } catch (error) {
    console.error("Error fetching TikTok profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
