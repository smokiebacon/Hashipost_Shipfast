import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/next-auth";
import CryptoJS from "crypto-js";
import { connectMongo } from "@/libs/mongoose";
import User from "@/models/User";

//GET request for TikTok OAuth flow, getting the url for the user to login with TikTok.
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

    // Store the code_verifier in the user's record for later use during token exchange
    try {
      await connectMongo();
      console.log("I AM HERE");
      await User.findByIdAndUpdate(session.user.id, {
        $set: {
          "tiktokAuth.code_verifier": code_verifier,
          "tiktokAuth.state": csrfState,
          "tiktokAuth.timestamp": new Date(),
        },
      });
    } catch (dbError) {
      console.error("Error storing TikTok auth data:", dbError);
      // Continue with the flow even if storing fails
    }

    const tiktokOAuthURL = `https://www.tiktok.com/v2/auth/authorize/?client_key=${
      process.env.TIKTOK_CLIENT_KEY
    }&scope=user.info.basic,video.upload,video.list&response_type=code&redirect_uri=${encodeURIComponent(
      "http://localhost:3000/dashboard/accounts"
    )}&state=${csrfState}&code_challenge=${code_challenge}&code_challenge_method=S256`;

    return NextResponse.json({ url: tiktokOAuthURL });
  } catch (error) {
    console.error("Error starting TikTok OAuth flow:", error);
    return NextResponse.redirect(
      new URL("/dashboard/accounts?error=tiktok_auth_failed", req.url)
    );
  }
}

// export class TiktokProvider {
//   constructor() {
//     this.identifier = "tiktok";
//     this.name = "Tiktok";
//     this.isBetweenSteps = false;
//     this.scopes = [
//       "user.info.basic",
//       "video.publish",
//       "video.upload",
//       "user.info.profile",
//     ];
//   }

//   async refreshToken(refreshToken) {
//     const value = {
//       client_key: process.env.TIKTOK_CLIENT_ID,
//       client_secret: process.env.TIKTOK_CLIENT_SECRET,
//       grant_type: "refresh_token",
//       refresh_token: refreshToken,
//     };

//     const response = await fetch(
//       "https://open.tiktokapis.com/v2/oauth/token/",
//       {
//         headers: {
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//         method: "POST",
//         body: new URLSearchParams(value).toString(),
//       }
//     );

//     const { access_token, refresh_token } = await response.json();

//     const userInfoResponse = await fetch(
//       "https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name,union_id,username",
//       {
//         method: "GET",
//         headers: {
//           Authorization: `Bearer ${access_token}`,
//         },
//       }
//     );

//     const {
//       data: {
//         user: { avatar_url, display_name, open_id, username },
//       },
//     } = await userInfoResponse.json();

//     return {
//       refreshToken: refresh_token,
//       expiresIn: dayjs().add(23, "hours").unix() - dayjs().unix(),
//       accessToken: access_token,
//       id: open_id.replace(/-/g, ""),
//       name: display_name,
//       picture: avatar_url,
//       username: username,
//     };
//   }

//   async generateAuthUrl() {
//     const state = Math.random().toString(36).substring(2);
//     const frontendUrl = process?.env?.FRONTEND_URL;
//     const needsRedirect = frontendUrl?.indexOf("https") === -1;
//     const redirectPrefix = needsRedirect ? "https://redirectmeto.com/" : "";

//     return {
//       url:
//         "https://www.tiktok.com/v2/auth/authorize/" +
//         `?client_key=${process.env.TIKTOK_CLIENT_ID}` +
//         `&redirect_uri=${encodeURIComponent(
//           `${redirectPrefix}${frontendUrl}/integrations/social/tiktok`
//         )}` +
//         `&state=${state}` +
//         `&response_type=code` +
//         `&scope=${encodeURIComponent(this.scopes.join(","))}`,
//       codeVerifier: state,
//       state,
//     };
//   }

//   async authenticate(params) {
//     const { code, codeVerifier } = params;
//     const frontendUrl = process?.env?.FRONTEND_URL;
//     const needsRedirect = frontendUrl?.indexOf("https") === -1;
//     const redirectPrefix = needsRedirect ? "https://redirectmeto.com/" : "";

//     const value = {
//       client_key: process.env.TIKTOK_CLIENT_ID,
//       client_secret: process.env.TIKTOK_CLIENT_SECRET,
//       code,
//       grant_type: "authorization_code",
//       code_verifier: codeVerifier,
//       redirect_uri: `${redirectPrefix}${frontendUrl}/integrations/social/tiktok`,
//     };

//     const tokenResponse = await this.fetch(
//       "https://open.tiktokapis.com/v2/oauth/token/",
//       {
//         headers: {
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//         method: "POST",
//         body: new URLSearchParams(value).toString(),
//       }
//     );

//     const { access_token, refresh_token, scope } = await tokenResponse.json();

//     console.log(this.scopes, scope);
//     this.checkScopes(this.scopes, scope);

//     const userInfoResponse = await fetch(
//       "https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name,union_id,username",
//       {
//         method: "GET",
//         headers: {
//           Authorization: `Bearer ${access_token}`,
//         },
//       }
//     );

//     const {
//       data: {
//         user: { avatar_url, display_name, open_id, username },
//       },
//     } = await userInfoResponse.json();

//     return {
//       id: open_id.replace(/-/g, ""),
//       name: display_name,
//       accessToken: access_token,
//       refreshToken: refresh_token,
//       expiresIn: dayjs().add(23, "hours").unix() - dayjs().unix(),
//       picture: avatar_url,
//       username: username,
//     };
//   }

//   async maxVideoLength(accessToken) {
//     const response = await this.fetch(
//       "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json; charset=UTF-8",
//           Authorization: `Bearer ${accessToken}`,
//         },
//       }
//     );

//     const {
//       data: { max_video_post_duration_sec },
//     } = await response.json();

//     return {
//       maxDurationSeconds: max_video_post_duration_sec,
//     };
//   }

//   async uploadedVideoSuccess(id, publishId, accessToken) {
//     // eslint-disable-next-line no-constant-condition
//     while (true) {
//       const response = await this.fetch(
//         "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json; charset=UTF-8",
//             Authorization: `Bearer ${accessToken}`,
//           },
//           body: JSON.stringify({
//             publish_id: publishId,
//           }),
//         }
//       );

//       const post = await response.json();
//       const { status, publicaly_available_post_id } = post.data;

//       if (status === "PUBLISH_COMPLETE") {
//         return {
//           url: !publicaly_available_post_id
//             ? `https://www.tiktok.com/@${id}`
//             : `https://www.tiktok.com/@${id}/video/` +
//               publicaly_available_post_id,
//           id: !publicaly_available_post_id
//             ? publishId
//             : publicaly_available_post_id?.[0],
//         };
//       }

//       if (status === "FAILED") {
//         throw new Error("titok-error-upload: " + JSON.stringify(post));
//       }

//       await timer(3000);
//     }
//   }

//   postingMethod(method) {
//     switch (method) {
//       case "UPLOAD":
//         return "/inbox/video/init/";
//       case "DIRECT_POST":
//       default:
//         return "/video/init/";
//     }
//   }

//   async post(id, accessToken, postDetails, integration) {
//     const [firstPost, ...comments] = postDetails;

//     const response = await this.fetch(
//       `https://open.tiktokapis.com/v2/post/publish${this.postingMethod(
//         firstPost.settings.content_posting_method
//       )}`,
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json; charset=UTF-8",
//           Authorization: `Bearer ${accessToken}`,
//         },
//         body: JSON.stringify({
//           ...(firstPost.settings.content_posting_method === "DIRECT_POST"
//             ? {
//                 post_info: {
//                   title: firstPost.message,
//                   privacy_level: firstPost.settings.privacy_level,
//                   disable_duet: !firstPost.settings.duet,
//                   disable_comment: !firstPost.settings.comment,
//                   disable_stitch: !firstPost.settings.stitch,
//                   brand_content_toggle: firstPost.settings.brand_content_toggle,
//                   brand_organic_toggle: firstPost.settings.brand_organic_toggle,
//                 },
//               }
//             : {}),
//           source_info: {
//             source: "PULL_FROM_URL",
//             video_url: firstPost?.media?.[0]?.url,
//           },
//         }),
//       }
//     );

//     const {
//       data: { publish_id },
//     } = await response.json();

//     const { url, id: videoId } = await this.uploadedVideoSuccess(
//       integration.profile,
//       publish_id,
//       accessToken
//     );

//     return [
//       {
//         id: firstPost.id,
//         releaseURL: url,
//         postId: String(videoId),
//         status: "success",
//       },
//     ];
//   }

//   // Helper methods that would need implementation
//   async fetch(url, options) {
//     return fetch(url, options);
//   }

//   checkScopes(requiredScopes, grantedScopes) {
//     // Implementation for checking scopes
//     const scopesArray =
//       typeof grantedScopes === "string"
//         ? grantedScopes.split(",")
//         : grantedScopes;

//     const missingScopes = requiredScopes.filter(
//       (scope) => !scopesArray.includes(scope)
//     );

//     if (missingScopes.length > 0) {
//       throw new Error(`Missing required scopes: ${missingScopes.join(", ")}`);
//     }
//   }
// }

// export default TiktokProvider;
