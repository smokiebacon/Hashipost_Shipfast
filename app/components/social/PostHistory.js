"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";

export default function PostHistory() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { data: session } = useSession();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/social/posts");
      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }
      const data = await response.json();
      setPosts(data.posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error: {error}</p>
        <button
          onClick={fetchPosts}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-600 mb-2">No posts yet</p>
        <p className="text-sm text-gray-500">
          Your published posts will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div
          key={post._id}
          className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          {/* Header with user info */}
          <div className="flex items-center p-4 border-b border-gray-100">
            <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
              <Image
                src={session?.user?.image || "/default-avatar.png"}
                alt="User avatar"
                width={32}
                height={32}
                className="object-cover"
              />
            </div>
            <div className="ml-3 flex-grow">
              <p className="font-medium text-sm text-gray-900">
                {session?.user?.name || "Anonymous"}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(post.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {/* Platform badges */}
            <div className="flex gap-1">
              {post.platforms.map((platform) => (
                <div
                  key={platform.name}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    platform.posted
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                  }`}
                >
                  {platform.name}
                </div>
              ))}
            </div>
          </div>

          {/* Content section */}
          <div className="p-4">
            {/* Text content */}
            {post.content && (
              <p className="text-gray-800 text-sm mb-3 whitespace-pre-wrap">
                {post.content}
              </p>
            )}

            {/* Media Preview */}
            {post.mediaUrl && (
              <div className="rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
                {post.mediaUrl.includes(".mp4") ? (
                  <div className="flex items-center justify-center h-48 bg-gray-100">
                    <div className="text-center">
                      <svg
                        className="w-12 h-12 mx-auto text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">Video Post</p>
                    </div>
                  </div>
                ) : (
                  <Image
                    src={post.mediaUrl}
                    alt="Post media"
                    width={400}
                    height={300}
                    className="w-full max-h-[32rem] object-contain"
                  />
                )}
              </div>
            )}
          </div>

          {/* Footer with links */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
            <div className="flex flex-wrap gap-2 justify-end">
              {post.platforms.map((platform) => (
                <a
                  key={platform.name}
                  href={platform.postUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center text-xs ${
                    platform.postUrl
                      ? "text-blue-600 hover:text-blue-800"
                      : "text-gray-400 cursor-not-allowed"
                  }`}
                  onClick={(e) => !platform.postUrl && e.preventDefault()}
                >
                  View on {platform.name}
                  <svg
                    className="w-3 h-3 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
