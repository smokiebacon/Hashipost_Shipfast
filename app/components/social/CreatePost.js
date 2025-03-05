"use client";

import { useState } from "react";
import { platforms } from "@/app/utils/social";

export default function CreatePost({ userConnections = {} }) {
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState({});
  const [isPosting, setIsPosting] = useState(false);
  const [mediaPreview, setMediaPreview] = useState(null);

  // Handle platform checkbox toggle
  const togglePlatform = (platform) => {
    setSelectedPlatforms((prev) => ({
      ...prev,
      [platform]: !prev[platform],
    }));
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMediaFile(file);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setMediaPreview(previewUrl);

    // Clean up preview URL when component unmounts
    return () => URL.revokeObjectURL(previewUrl);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsPosting(true);

      // Get list of selected platforms
      const platformsList = Object.entries(selectedPlatforms)
        .filter(([_, isSelected]) => isSelected)
        .map(([platform]) => platform);

      if (platformsList.length === 0) {
        alert("Please select at least one platform");
        return;
      }

      // In a real app, upload media file first
      let mediaUrl = null;
      if (mediaFile) {
        // Create FormData and append the file
        const formData = new FormData();
        formData.append("file", mediaFile);

        // Upload to Cloudinary through our API
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload media");
        }

        const uploadData = await uploadResponse.json();
        mediaUrl = uploadData.url; // This is the Cloudinary URL
      }

      // Post to selected platforms
      const response = await fetch("/api/social/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          mediaUrl,
          platforms: platformsList,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to publish post");
      }

      // Reset form
      setContent("");
      setMediaFile(null);
      setMediaPreview(null);
      setSelectedPlatforms({});

      alert("Post published successfully!");
    } catch (error) {
      console.error("Error publishing post:", error);
      alert(`Failed to publish post: ${error.message}`);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <form
      id="create-post-form"
      onSubmit={handleSubmit}
      className="border rounded-lg p-4"
    >
      <div className="mb-4">
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full p-3 border rounded-md"
          rows={4}
        />
      </div>

      {mediaPreview && (
        <div className="mb-4 relative">
          {mediaFile.type.startsWith("image/") ? (
            // Show image preview for images
            <img
              src={mediaPreview}
              alt="Media Preview"
              className="w-full max-h-64 object-contain rounded-md"
            />
          ) : mediaFile.type.startsWith("video/") ? (
            // Show video preview for videos
            <video
              src={mediaPreview}
              controls
              className="w-full max-h-64 object-contain rounded-md"
            >
              Your browser does not support the video tag.
            </video>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setMediaFile(null);
              setMediaPreview(null);
            }}
            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full"
          >
            X
          </button>
        </div>
      )}

      <div className="mb-4">
        <input
          type="file"
          accept="image/*, video/*"
          onChange={handleFileChange}
          className="w-full p-2 border rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">Upload an image or video</p>
      </div>

      <div className="mb-4">
        <h3 className="font-medium mb-2">Post to platforms:</h3>
        <div className="space-y-2">
          {Object.keys(platforms).map((platform) => {
            const isConnected = !!userConnections[platform];
            return (
              <label
                key={platform}
                className={`flex items-center p-2 border rounded-md ${
                  !isConnected ? "opacity-50" : ""
                }`}
              >
                <input
                  type="checkbox"
                  id={`platform-${platform}`}
                  checked={!!selectedPlatforms[platform]}
                  onChange={() => togglePlatform(platform)}
                  disabled={!isConnected}
                  className="mr-2"
                />
                <span>{platforms[platform].name}</span>
                {!isConnected && (
                  <span className="ml-2 text-xs text-red-500">
                    (Not connected)
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        disabled={isPosting || (!content && !mediaFile)}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
      >
        {isPosting ? "Publishing..." : "Publish"}
      </button>
    </form>
  );
}
