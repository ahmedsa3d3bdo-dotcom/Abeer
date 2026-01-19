/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === "production";
const enableCspReportOnly = String(process.env.CSP_REPORT_ONLY || "").toLowerCase() === "true";

const nextConfig = {
  // ============================================================================
  // PERFORMANCE & SAFETY
  // ============================================================================
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  // ============================================================================
  // SERVER EXTERNAL PACKAGES
  // ============================================================================
  serverExternalPackages: ['pg', 'knex'],
  // ============================================================================
  // IMAGE OPTIMIZATION
  // ============================================================================
  images: {
    unoptimized: false,
    // Modern formats for better compression
    formats: ['image/avif', 'image/webp'],
    // Device sizes for responsive images
    deviceSizes: [320, 420, 640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cache optimized images for 1 year (fingerprinted URLs)
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        pathname: '/**',
      },
    ],
  },

  // ============================================================================
  // CACHING HEADERS
  // ============================================================================
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }] : []),
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https:",
              "style-src 'self' 'unsafe-inline' https:",
              isProd
                ? "script-src 'self' 'unsafe-inline' https:"
                : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
              "connect-src 'self' https: wss:",
            ].join('; '),
          },
          ...(enableCspReportOnly
            ? [
                {
                  key: 'Content-Security-Policy-Report-Only',
                  value: [
                    "default-src 'self'",
                    "base-uri 'self'",
                    "object-src 'none'",
                    "frame-ancestors 'none'",
                    "form-action 'self'",
                    "img-src 'self' data: blob: https:",
                    "font-src 'self' data: https:",
                    "style-src 'self' 'unsafe-inline' https:",
                    isProd
                      ? "script-src 'self' https:"
                      : "script-src 'self' 'unsafe-eval' https:",
                    "connect-src 'self' https: wss:",
                    "report-uri /api/csp-report",
                  ].join('; '),
                },
              ]
            : []),
        ],
      },
      // Static assets - long cache (immutable, fingerprinted)
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: isProd ? 'public, max-age=31536000, immutable' : 'no-store' },
        ],
      },
      // User uploads - revalidate on each request
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      // API routes - short cache for dynamic data
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },

  // ============================================================================
  // ENVIRONMENT VARIABLES
  // ============================================================================
  env: {
    NEXT_PUBLIC_UPLOADS_PATH: '/uploads',
  },

  // ============================================================================
  // COMPILER OPTIMIZATIONS
  // ============================================================================
  compiler: {
    // Remove console logs in production (keep errors/warnings)
    removeConsole: isProd ? { exclude: ['error', 'warn'] } : false,
    // Remove React properties in production
    reactRemoveProperties: true,
  },

  // ============================================================================
  // EXPERIMENTAL FEATURES
  // ============================================================================
  experimental: {
    // Tree-shake these packages for smaller bundles
    optimizePackageImports: [
      '@/components/ui',
      'date-fns',
      'lucide-react',
      'swiper',           // Heavy library - optimize imports
      '@tanstack/react-query',
      'recharts',
    ],
    // Better scroll restoration for improved UX
    scrollRestoration: true,
  },

  // ============================================================================
  // TURBOPACK CONFIGURATION (Next.js 16+)
  // ============================================================================
  // Empty config to silence Turbopack warning - Turbopack handles optimization
  turbopack: {},
};

export default nextConfig;