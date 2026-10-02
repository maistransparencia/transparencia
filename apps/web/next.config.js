/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@transparencia/ui", "@transparencia/db"],
  serverExternalPackages: ["pg", "kysely"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  async redirects() {
    const portalRedirects = [
      { from: "/porciuncula", to: "/porciuncula_prefeitura" },
      { from: "/porciuncula-prefeitura", to: "/porciuncula_prefeitura" },
      { from: "/natividade", to: "/natividade_prefeitura" },
      { from: "/natividade-prefeitura", to: "/natividade_prefeitura" },
    ].filter(
      (item, index, self) =>
        index === self.findIndex((t) => t.from === item.from),
    );

    const generatedPortalRedirects = portalRedirects.flatMap(({ from, to }) => [
      {
        source: from,
        destination: to,
        permanent: true,
      },
      {
        source: `${from}/:path*`,
        destination: `${to}/:path*`,
        permanent: true,
      },
    ]);

    return [
      ...generatedPortalRedirects,
      {
        source: "/:portalSlug/caprem",
        destination: "/:portalSlug/previdencia",
        permanent: true,
      },
      {
        source: "/:portalSlug/caprem/:path*",
        destination: "/:portalSlug/previdencia/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
  // Required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

module.exports = nextConfig;
