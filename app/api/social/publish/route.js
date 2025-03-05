import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/next-auth";
import connectMongo from "@/libs/mongoose";
import { postToMultiplePlatforms } from "@/app/utils/social";
import SocialPost from "@/models/SocialPost";
import User from "@/models/User";

export async function POST(req) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    console.log(session, "session from publish route");
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    console.log(userId, "userId from publish route");
    const body = await req.json();

    // Validate request
    const { content, mediaUrl, platforms } = body;

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: "At least one platform is required" },
        { status: 400 }
      );
    }

    if (!content && !mediaUrl) {
      return NextResponse.json(
        { error: "Either content or media is required" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectMongo();

    // Get user with social tokens
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Post to platforms
    const results = await postToMultiplePlatforms(
      user,
      content,
      mediaUrl,
      platforms
    );

    // Save post record to database
    const post = new SocialPost({
      user: userId,
      content,
      mediaUrl,
      platforms: results.map((result) => ({
        name: result.platform,
        posted: result.success,
        postId: result.postId || null,
        postUrl: result.postUrl || null,
      })),
    });

    await post.save();

    return NextResponse.json({
      success: true,
      post: {
        id: post._id,
        content,
        mediaUrl,
        platforms: results,
      },
    });
  } catch (error) {
    console.error("Error publishing to social platforms:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
