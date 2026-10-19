const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  // Inlined into the build, so /api/version reports when this build was made
  // rather than when it was asked.
  env: { BUILD_TIME: new Date().toISOString() },
  async redirects() {
    // The Firm page described who the firm is and where it is from. The site
    // no longer says either, so the page is gone and its old links land home.
    return [{ source: "/:lang/firm", destination: "/:lang", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }
        ]
      }
    ];
  }
};

export default nextConfig;
