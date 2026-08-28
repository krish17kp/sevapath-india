import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The local retrieval adapter reads Markdown briefs from rag-corpus/ingest at
  // request time, so those files must ship with the server bundle.
  outputFileTracingIncludes: {
    "/api/**": ["./rag-corpus/ingest/**/*", "./rag-corpus/index/**/*"]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" }
        ]
      }
    ];
  }
};

export default nextConfig;
