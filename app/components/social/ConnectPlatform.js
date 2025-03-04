import { useState } from "react";
import { platforms } from "@/app/utils/social";
export default function ConnectPlatform({
  platform,
  isConnected,
  onConnectionChange,
}) {
  const [isLoading, setIsLoading] = useState(false);

  const platformConfig = platforms[platform];

  if (!platformConfig) {
    return null;
  }

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      // Request authorization URL from backend
      const response = await fetch(`/api/auth/socials/${platform}`, {
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
      const response = await fetch(`/api/social/disconnect/${platform}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }

      // Refresh connection status
      await onConnectionChange();
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
        <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full mr-3">
          {/* In real app, use proper icons */}
          <span className="text-xl">
            {platformConfig.icon.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h3 className="font-medium">{platformConfig.name}</h3>
          <p className="text-sm text-gray-500">
            {isConnected ? "Connected" : "Not connected"}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {isConnected ? (
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
