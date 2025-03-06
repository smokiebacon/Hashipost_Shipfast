import { useState, useEffect } from "react";
import { platforms } from "@/app/utils/social";
import Image from "next/image";

export default function ConnectPlatform({
  platform,
  isConnected: initialIsConnected,
  onConnectionChange,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(
    initialIsConnected || false
  );
  const [profileData, setProfileData] = useState(null);

  const platformConfig = platforms[platform];

  if (!platformConfig) {
    return null;
  }

  useEffect(() => {
    // Use the provided initial value if available
    if (initialIsConnected !== undefined) {
      setConnectionStatus(initialIsConnected);
    } else {
      // Otherwise fetch connection status
      fetchConnectionStatus();
    }

    // Always fetch profile data for TikTok if we're connected
    if (platform === "tiktok" && (initialIsConnected || connectionStatus)) {
      fetchProfileData();
    }
  }, [initialIsConnected, platform, connectionStatus]);

  const fetchProfileData = async () => {
    try {
      const response = await fetch("/api/social/profile/tiktok");
      if (!response.ok) throw new Error("Failed to fetch profile data");
      const data = await response.json();
      setProfileData(data);
    } catch (error) {
      console.error("Error fetching TikTok profile:", error);
    }
  };

  const fetchConnectionStatus = async () => {
    try {
      const response = await fetch("/api/social/status");
      if (!response.ok) throw new Error("Failed to fetch connection status");
      const data = await response.json();
      setConnectionStatus(!!data[platform]);
    } catch (error) {
      console.error(`Error fetching connection status for ${platform}:`, error);
    }
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      // Request authorization URL from backend
      const response = await fetch(`/api/social/${platform}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect platform");
      }

      // In a real app, redirect to OAuth provider
      // For MVP, we'll simulate by redirecting to our mock URL
      window.location.href = data.url;
    } catch (error) {
      console.error(`Error connecting to ${platform}:`, error);
      alert(`Failed to connect to ${platformConfig.name}: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);

      // Special handling for TikTok platform
      if (platform === "tiktok") {
        const response = await fetch(`/api/social/disconnect/${platform}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to disconnect from TikTok"
          );
        }
      } else {
        // Generic disconnect for other platforms
        const response = await fetch(`/api/social/disconnect/${platform}`);
        if (!response.ok) {
          throw new Error("Failed to disconnect");
        }
      }

      // Refresh connection status
      if (onConnectionChange) {
        await onConnectionChange();
      } else {
        await fetchConnectionStatus();
      }

      setConnectionStatus(false);
    } catch (error) {
      console.error(`Error disconnecting from ${platform}:`, error);
      alert(
        `Failed to disconnect from ${platformConfig.name}: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg mb-2">
      <div className="flex items-center">
        {platform === "tiktok" && connectionStatus && profileData ? (
          <>
            <div className="w-10 h-10 relative rounded-full overflow-hidden mr-3">
              <Image
                src=""
                alt={profileData.display_name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="font-medium">{profileData.display_name}</h3>
              <p className="text-sm text-gray-500">@{profileData.username}</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full mr-3">
              {/* In real app, use proper icons */}
              <span className="text-xl">
                {platformConfig.icon.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-medium">{platformConfig.name}</h3>
              <p className="text-sm text-gray-500">
                {connectionStatus ? "Connected" : "Not connected"}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2">
        {connectionStatus ? (
          <button
            onClick={handleDisconnect}
            disabled={isLoading}
            className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            {isLoading ? "Disconnecting..." : "Disconnect"}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {isLoading ? "Connecting..." : "Connect"}
          </button>
        )}
      </div>
    </div>
  );
}
