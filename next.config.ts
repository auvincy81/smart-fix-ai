import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return ["/approve/:path*", "/api/approvals/:path*"].map((source) => ({ source, headers: [
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "X-Frame-Options", value: "DENY" },
    ] }));
  },
};

export default nextConfig;
