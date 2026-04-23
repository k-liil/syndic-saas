/** @type {import("next").NextConfig} */
const nextConfig = {
  // Use standalone output for better compatibility with Railway
  output: "standalone",

  // Temporarily disabling redirects to allow access via the Railway domain (bypass Zscaler block)
  async redirects() {
    return [
      /* REDIRECTS DISABLED FOR BYPASS 
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "syndicly-production.up.railway.app",
          },
        ],
        destination: "https://www.syndicly.ma/:path*",
        permanent: true,
      },
      */
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;