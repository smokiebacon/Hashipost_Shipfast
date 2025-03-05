import { useEffect, useState } from "react";
import ConnectPlatform from "./ConnectPlatform";

export default function SocialConnections() {
  const [connections, setConnections] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConnectionStatus();
  }, []);

  const fetchConnectionStatus = async () => {
    try {
      const response = await fetch("/api/social/status");
      if (!response.ok) throw new Error("Failed to fetch connection status");
      const data = await response.json();
      setConnections(data);
    } catch (error) {
      console.error("Error fetching connection status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading connections...</div>;
  }

  return (
    <div className="space-y-4">
      <ConnectPlatform
        platform="tiktok"
        isConnected={connections.tiktok}
        onConnectionChange={fetchConnectionStatus}
      />
      {/* Add other platforms here */}
    </div>
  );
}
