"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
export default function AccountsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("Processing authentication...");

  useEffect(() => {
    const handleTikTokCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const scopes = searchParams.get("scopes");

      if (code) {
        try {
          setStatus("Connecting to TikTok...");

          // Send the code to our backend to exchange for an access token
          const response = await fetch(
            `/api/social/connect/tiktok?code=${encodeURIComponent(code)}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (!response.ok) {
            const error = await response.json();
            throw new Error(
              error.message || "Failed to connect TikTok account"
            );
          }

          setStatus("Connected successfully!");

          // Redirect to dashboard after successful connection
          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
        } catch (error) {
          console.error("Error connecting TikTok account:", error);
          setStatus(`Error: ${error.message}`);
        }
      }
    };

    if (searchParams.has("code")) {
      handleTikTokCallback();
    }
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Social Account Connection</h1>
        <div className="text-center py-4">
          <p className="mb-2">{status}</p>
          {status.includes("Error") && (
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          )}
        </div>
        {/* <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold mb-4">Connected Accounts</h1>
          <SocialConnections />
        </div> */}
      </div>
    </div>
  );
}
