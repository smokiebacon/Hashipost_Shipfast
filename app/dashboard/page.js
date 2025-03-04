"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import ConnectPlatform from "@/app/components/social/ConnectPlatform";
import CreatePost from "@/app/components/social/CreatePost";
import { platforms } from "@/app/utils/social";
export default function Dashboard() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("create");
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading user data (in a real app would be fetched from API)
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // Mock user data for MVP
      setUser({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        socialTokens: {
          // In real app, these would come from backend
          youtube: null,
          facebook: null,
          instagram: null,
          tiktok: null,
        },
      });

      // Mock posts data
      setPosts([
        {
          id: "1",
          content: "This is a demo post",
          mediaUrl: null,
          createdAt: new Date().toISOString(),
          platforms: [
            {
              name: "facebook",
              posted: true,
              postUrl: "https://facebook.com/post/demo",
            },
          ],
        },
      ]);

      setIsLoading(false);
    }
  }, [status, session]);

  if (status === "loading" || isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Dashboard</h1>
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Dashboard</h1>
        <div className="text-center py-12">
          <p className="mb-4">Please sign in to access your dashboard</p>
          <button
            onClick={() => signIn()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const connectedPlatforms = {};
  Object.keys(platforms).forEach((platform) => {
    connectedPlatforms[platform] = !!user?.socialTokens?.[platform];
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="border-b mb-4">
            <div className="flex space-x-4">
              <button
                className={`pb-2 px-1 ${
                  activeTab === "create"
                    ? "border-b-2 border-blue-600 font-medium"
                    : "text-gray-500"
                }`}
                onClick={() => setActiveTab("create")}
              >
                Create Post
              </button>
              <button
                className={`pb-2 px-1 ${
                  activeTab === "history"
                    ? "border-b-2 border-blue-600 font-medium"
                    : "text-gray-500"
                }`}
                onClick={() => setActiveTab("history")}
              >
                Post History
              </button>
            </div>
          </div>

          {activeTab === "create" ? (
            <CreatePost userConnections={connectedPlatforms} />
          ) : (
            <div className="border rounded-lg p-4">
              <h2 className="text-lg font-medium mb-4">Your Posts</h2>

              {posts.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  You haven't created any posts yet
                </p>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post.id} className="border-b pb-4">
                      <p className="mb-2">{post.content}</p>
                      <div className="flex space-x-2 text-sm text-gray-500">
                        <span>
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span>
                          Posted to:{" "}
                          {post.platforms
                            .map((p) => platforms[p.name]?.name)
                            .join(", ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div>
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-medium mb-4">Connected Platforms</h2>

            <div className="space-y-4">
              {Object.keys(platforms).map((platform) => (
                <ConnectPlatform
                  key={platform}
                  platform={platform}
                  isConnected={!!user?.socialTokens?.[platform]}
                />
              ))}
            </div>

            <p className="text-sm text-gray-500 mt-4">
              Connect your social media accounts to post content across
              platforms
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
