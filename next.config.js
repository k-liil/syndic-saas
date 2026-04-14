/** @type {import("next").NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "syndic-saas-production.up.railway.app",
          },
        ],
        destination: "https://www.syndicly.ma/:path*",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;