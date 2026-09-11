import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    serverActions: {
      // Default is 1MB, which full-res team logos / player photos routinely exceed
      // and fail with an opaque server error. Matches the 10MB cap already enforced
      // in app/upload-photo/actions.ts.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
