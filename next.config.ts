import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;

    // Only configure external rewrites when an actual external backend URL is explicitly configured
    if (
      !backendUrl ||
      backendUrl === "http://localhost:8080" ||
      backendUrl === "PLACEHOLDER_NEXT_PUBLIC_BACKEND_URL"
    ) {
      return [];
    }

    return [
      {
        // Exclude NextKube built-in API routes from external rewrites
        source: "/api/((?!auth|clusters/connect|clusters/test-connection).*)",
        destination: `${backendUrl}/api/:1*`,
      },
    ];
  },
};

export default nextConfig;
