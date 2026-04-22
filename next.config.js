/** @type {import("next").NextConfig} */
const nextConfig = {
  // Removing standalone output to troubleshoot static file serving
  // output: "standalone", 
  
  async redirects() {
    return [
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
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "syndicly.ma",
          },
        ],
        destination: "https://www.syndicly.ma/:path*",
        permanent: true,
      },
    ];
  },
  
  // Temporarily removing all custom headers to rule out MIME or security-policy blocking
  /*
  async headers() {
    return [ ... ]
  }
  */
};

module.exports = nextConfig;