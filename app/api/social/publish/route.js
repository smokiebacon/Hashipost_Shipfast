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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
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

    // Query creator info if TikTok is one of the platforms
    if (platforms.includes("tiktok")) {
      try {
        const creatorInfoResponse = await fetch(
          "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${user.socialTokens.tiktok.access_token}`,
              "Content-Type": "application/json",
            },
            // Add empty body as required by TikTok API
            body: JSON.stringify({}),
          }
        );

        const responseText = await creatorInfoResponse.text();

        if (!creatorInfoResponse.ok) {
          console.error("TikTok API Error Status:", creatorInfoResponse.status);
          console.error(
            "TikTok API Error Headers:",
            Object.fromEntries(creatorInfoResponse.headers)
          );
          throw new Error(`Failed to query creator info data: ${responseText}`);
        }

        const creatorInfoData = JSON.parse(responseText);
        console.log("Creator Info:", creatorInfoData);
      } catch (error) {
        console.error("TikTok creator info error:", error);
        throw new Error(`TikTok creator info error: ${error.message}`);
      }

      console.log(mediaUrl, "media");

      const initResponse = await fetch(
        "https://open.tiktokapis.com/v2/post/publish/video/init/",

        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.socialTokens.tiktok.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            post_info: {
              title: content, // Use the content as the video title
              privacy_level: "SELF_ONLY", // Or could be SELF_ONLY, MUTUAL_FOLLOW_FRIENDS
              disable_duet: false,
              disable_comment: false,
              disable_stitch: false,
              video_cover_timestamp_ms: 0,
            },
            source_info: {
              source: "PULL_FROM_URL",
              video_url: mediaUrl,
              // video_size: mediaUrl.size, // Assuming mediaUrl is a File object
              // chunk_size: 10000000,
              // total_chunk_count: 5,
            },
          }),
        }
      );

      if (!initResponse.ok) {
        throw new Error(
          `Failed to initialize video upload: ${await initResponse.text()}`
        );
      }

      const initData = await initResponse.json();
      console.log("Upload initialized:", initData);
    }

    // Post to platforms
    const results = await postToMultiplePlatforms(
      user,
      content,
      mediaUrl,
      platforms
    );

    if (!mediaUrl) {
      throw new Error("Video file is required for TikTok posts");
    }

    const supportedFormats = ["video/mp4"];
    const fileType = await fetch(mediaUrl).then((r) =>
      r.headers.get("content-type")
    );
    if (!supportedFormats.includes(fileType)) {
      throw new Error("Unsupported video format. Please use MP4.");
    }

    const maxSize = 512 * 1024 * 1024; // 512MB
    if (file.size > maxSize) {
      throw new Error("Video file is too large. Maximum size is 512MB.");
    }

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
