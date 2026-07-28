import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Existing bookmarks and deployed Clerk redirect URLs may still point here.
      { source: "/dashboard", destination: "/planner", permanent: true },
    ];
  },
};

export default nextConfig;
