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
    const user = await User.findById(session.user.id);

    if (!user?.socialTokens?.tiktok?.profile) {
      return NextResponse.json(
        { error: "TikTok profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(user.socialTokens.tiktok.profile);
  } catch (error) {
    console.error("Error fetching TikTok profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
