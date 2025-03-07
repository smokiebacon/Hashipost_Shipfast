"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import ConnectPlatform from "@/app/components/social/ConnectPlatform";
import CreatePost from "@/app/components/social/CreatePost";
import { platforms } from "@/app/utils/social";
import Header from "@/components/Header";
import PostHistory from "@/app/components/social/PostHistory";
export default function Dashboard() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("create");
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(false);

  useEffect(() => {
    // Check URL for status parameters (might be coming back from OAuth flow``)
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get("status");
    const platform = urlParams.get("platform");

    // If we've just returned from a successful OAuth connection
    if (status === "success" && platform) {
      console.log(`Successfully connected to ${platform}`);
    }

    // Always fetch connection status
    fetchConnectionStatus();
  }, []);

  const fetchConnectionStatus = async () => {
    try {
      const response = await fetch("/api/social/status");
      if (!response.ok) throw new Error("Failed to fetch connection status");
      const data = await response.json();
      setConnectionStatus(data);
    } catch (error) {
      console.error(`Error fetching connection status for ${platform}:`, error);
    }
  };

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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="animate-pulse flex justify-center items-center h-64">
            <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto text-center p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Welcome Back
          </h1>
          <p className="text-gray-600 mb-8">
            Please sign in to access your dashboard
          </p>
          <button
            onClick={() => signIn()}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex space-x-8 px-6">
                  <button
                    className={`py-4 px-2 border-b-2 ${
                      activeTab === "create"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } transition-colors font-medium`}
                    onClick={() => setActiveTab("create")}
                  >
                    Create Post
                  </button>
                  <button
                    className={`py-4 px-2 border-b-2 ${
                      activeTab === "history"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } transition-colors font-medium`}
                    onClick={() => setActiveTab("history")}
                  >
                    Post History
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === "create" ? (
                  <CreatePost userConnections={connectionStatus} />
                ) : (
                  <PostHistory />
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Connected Platforms Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Connected Platforms
              </h2>
              <div className="space-y-4">
                {Object.keys(platforms).map((platform) => (
                  <ConnectPlatform
                    key={platform}
                    platform={platform}
                    connectionStatus={user?.socialTokens?.[platform]}
                  />
                ))}
              </div>
              <p className="mt-6 text-sm text-gray-500">
                Connect your accounts to share content across platforms
              </p>
            </div>

            {/* Quick Stats Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Quick Stats
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {posts.length}
                  </p>
                  <p className="text-sm text-gray-600">Total Posts</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {Object.values(connectionStatus).filter(Boolean).length}
                  </p>
                  <p className="text-sm text-gray-600">Connected Accounts</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
