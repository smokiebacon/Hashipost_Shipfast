// Social media platform API adapters

export const platforms = {
  youtube: {
    name: "YouTube",
    icon: "youtube",
    postContent: async (token, content, mediaUrl) => {
      // In a real app, use YouTube API to post video
      console.log("Posting to YouTube:", { content, mediaUrl });
      return {
        success: true,
        id: "yt-" + Date.now(),
        url: "https://youtube.com/watch?v=demo",
      };
    },
  },
  facebook: {
    name: "Facebook",
    icon: "facebook",
    postContent: async (token, content, mediaUrl) => {
      // In a real app, use Facebook Graph API
      console.log("Posting to Facebook:", { content, mediaUrl });
      return {
        success: true,
        id: "fb-" + Date.now(),
        url: "https://facebook.com/posts/demo",
      };
    },
  },
  instagram: {
    name: "Instagram",
    icon: "instagram",
    postContent: async (token, content, mediaUrl) => {
      // In a real app, use Instagram Graph API
      console.log("Posting to Instagram:", { content, mediaUrl });
      return {
        success: true,
        id: "ig-" + Date.now(),
        url: "https://instagram.com/p/demo",
      };
    },
  },
  tiktok: {
    name: "TikTok",
    icon: "tiktok",
    postContent: async (token, content, mediaUrl) => {
      // In a real app, use TikTok API
      console.log("Posting to TikTok:", { content, mediaUrl });
      return {
        success: true,
        id: "tt-" + Date.now(),
        url: "https://tiktok.com/@user/video/demo",
      };
    },
  },
};

// Post to multiple platforms
export async function postToMultiplePlatforms(
  user,
  content,
  mediaUrl,
  platformsList
) {
  const results = [];

  for (const platformName of platformsList) {
    const platform = platforms[platformName];
    if (!platform) continue;

    try {
      // Get user's token for this platform from database
      const token = user.socialTokens?.[platformName];
      console.log(token, "token from utils social.js");

      // Skip if no token
      if (!token) {
        results.push({
          platform: platformName,
          success: false,
          error: "Not connected",
        });
        continue;
      }

      // Post to platform
      const result = await platform.postContent(token, content, mediaUrl);

      results.push({
        platform: platformName,
        success: true,
        postId: result.id,
        postUrl: result.url,
      });
    } catch (error) {
      results.push({
        platform: platformName,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}
