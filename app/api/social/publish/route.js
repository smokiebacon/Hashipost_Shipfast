import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/next-auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import SocialPost from "@/models/SocialPost";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, mediaUrl, platforms } = await req.json();

    if (!platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: "No platforms selected" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectMongo();

    // Fetch user from database
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const results = await Promise.all(
      platforms.map(async (platform) => {
        try {
          if (!user.socialTokens?.[platform]?.access_token) {
            return {
              platform,
              success: false,
              error: `Not connected to ${platform}`,
            };
          }

          let platformResult;
          if (platform === "tiktok") {
            platformResult = await handleTikTokPost(
              user.socialTokens.tiktok.access_token,
              content,
              mediaUrl
            );
          } else {
            return {
              platform,
              success: false,
              error: `Publishing to ${platform} is not implemented yet`,
            };
          }

          return { platform, ...platformResult };
        } catch (error) {
          console.error(`Error publishing to ${platform}:`, error);
          return { platform, success: false, error: error.message };
        }
      })
    );

    // Create and save the social post
    const socialPost = new SocialPost({
      user: user._id,
      content,
      mediaUrl,
      platforms: results.map((result) => ({
        name: result.platform,
        posted: result.success,
        postId: result.publishId || null,
        postUrl: null, // TikTok URL will be available after processing
      })),
    });

    await socialPost.save();

    return NextResponse.json({
      success: results.every((r) => r.success),
      results,
      postId: socialPost._id, // Return the database post ID
    });
  } catch (error) {
    console.error("Error in publish endpoint:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// TikTok Helper Function
async function handleTikTokPost(accessToken, content, mediaUrl) {
  try {
    const creatorInfoResponse = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
      }
    );

    if (!creatorInfoResponse.ok) {
      throw new Error(
        `Failed to fetch creator info: ${await creatorInfoResponse.text()}`
      );
    }

    const creatorInfo = await creatorInfoResponse.json();

    const isVerifiedDomain = mediaUrl.startsWith("https://res.cloudinary.com/");
    let publishId, uploadUrl;
    let useMethod = isVerifiedDomain ? "PULL_FROM_URL" : "FILE_UPLOAD";

    // Unverified apps can only post to private accounts
    const privacyLevel = "SELF_ONLY";

    // Attempt PULL_FROM_URL first
    if (useMethod === "PULL_FROM_URL") {
      const initResponse = await fetch(
        "https://open.tiktokapis.com/v2/post/publish/video/init/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            post_info: { title: content, privacy_level: privacyLevel },
            source_info: { source: "PULL_FROM_URL", video_url: mediaUrl },
          }),
        }
      );

      const initData = await initResponse.json();
      if (initData.error?.code === "url_ownership_unverified") {
        console.warn("PULL_FROM_URL failed. Switching to FILE_UPLOAD...");
        useMethod = "FILE_UPLOAD";
      } else if (!initResponse.ok) {
        throw new Error(
          `Failed to initialize PULL_FROM_URL: ${await initResponse.text()}`
        );
      } else {
        publishId = initData.data.publish_id;
        return { success: true, publishId };
      }
    }

    // Use FILE_UPLOAD if PULL_FROM_URL fails
    if (useMethod === "FILE_UPLOAD") {
      const videoResponse = await fetch(mediaUrl);
      if (!videoResponse.ok) throw new Error("Failed to fetch video file.");

      const videoBuffer = await videoResponse.arrayBuffer();
      const fileSize = videoBuffer.byteLength;

      // TikTok supports chunks between 512KB and 4MB (4194304 bytes)
      let chunkSize = Math.min(4 * 1024 * 1024, fileSize);
      while (fileSize % chunkSize !== 0 && chunkSize > 512 * 1024) {
        chunkSize -= 512 * 1024; // Adjust to avoid fractional chunks
      }

      const totalChunks = Math.ceil(fileSize / chunkSize);

      const initResponse = await fetch(
        "https://open.tiktokapis.com/v2/post/publish/video/init/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            post_info: { title: content, privacy_level: privacyLevel },
            source_info: {
              source: "FILE_UPLOAD",
              video_size: fileSize,
              chunk_size: chunkSize,
              total_chunk_count: totalChunks,
            },
          }),
        }
      );

      if (!initResponse.ok) {
        throw new Error(
          `Failed to initialize FILE_UPLOAD: ${await initResponse.text()}`
        );
      }

      const initData = await initResponse.json();
      publishId = initData.data.publish_id;
      uploadUrl = initData.data.upload_url;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, fileSize);
        const chunk = videoBuffer.slice(start, end);

        let retryCount = 3;
        while (retryCount > 0) {
          try {
            const uploadResponse = await fetch(uploadUrl, {
              method: "PUT",
              headers: {
                "Content-Range": `bytes ${start}-${end - 1}/${fileSize}`,
                "Content-Type": "video/mp4",
              },
              body: chunk,
            });

            if (!uploadResponse.ok) {
              throw new Error(
                `Chunk ${i + 1} upload failed: ${await uploadResponse.text()}`
              );
            }

            break;
          } catch (err) {
            console.error(
              `Retrying chunk ${i + 1}... (${3 - retryCount + 1}/3)`
            );
            retryCount--;
            if (retryCount === 0) throw err;
          }
        }
      }

      return { success: true, publishId };
    }
  } catch (error) {
    console.error("TikTok publishing error:", error);

    // If the error is due to unaudited app restrictions, log a clear message
    if (
      error.message.includes(
        "unaudited_client_can_only_post_to_private_accounts"
      )
    ) {
      console.warn(
        "Your app is unaudited and can only post to private accounts."
      );
    }

    throw error;
  }
}
