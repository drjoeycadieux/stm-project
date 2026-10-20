import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ride tracking and driver matching read live database state on every
  // request, so routes are rendered dynamically rather than prerendered.
  cacheComponents: false,
  serverExternalPackages: ["@prisma/client"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
