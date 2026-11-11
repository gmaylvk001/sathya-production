const assetFallbackUrl = (process.env.NEXT_PUBLIC_ASSET_FALLBACK_URL || "https://estore.bharathelectronics.in").replace(/\/+$/, "");
let assetHostname = "estore.bharathelectronics.in";
try {
  assetHostname = new URL(assetFallbackUrl).hostname;
} catch (e) {}

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.BUILD_DIR || ".next",
  staticPageGenerationTimeout: 120,
  // Faster production builds: skip broken ESLint worker + typecheck gate (run `npm run lint` in CI).
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Do not emit browser source maps in production (saves compile/emit time).
  productionBrowserSourceMaps: false,
  // Shrink barrel-import graphs (icons/date libs) so bundlers compile faster and use less RAM.
  experimental: {
    optimizePackageImports: [
      "react-icons",
      "lucide-react",
      "@phosphor-icons/react",
      "@iconify/react",
      "date-fns",
      "react-feather",
    ],
    // Webpack path (npm run build:webpack): isolate + parallelize for multi-core hosts.
    webpackBuildWorker: true,
    parallelServerCompiles: true,
    parallelServerBuildTraces: true,
    memoryBasedWorkersCount: true,
  },
  // Keep heavy Node-only libs out of the server bundler graph (APIs still work at runtime).
  serverExternalPackages: [
    "googleapis",
    "pdfkit",
    "pdfkit-next",
    "xlsx",
    "mongoose",
    "sharp",
    "html-pdf",
    "heic-convert",
    "adm-zip",
    "cloudinary",
    "nodemailer",
    "bcryptjs",
    "formidable",
    "multer",
    "jspdf",
    "html2canvas",
    "chart.js",
    "apexcharts",
  ],
  // Skip tracing bulky paths that inflate "Collecting build traces".
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@swc/core-linux-x64-gnu",
      "node_modules/@swc/core-linux-x64-musl",
      "node_modules/@esbuild/**",
      "node_modules/webpack/**",
      "node_modules/terser/**",
      "node_modules/sass/**",
      "node_modules/tinymce/**",
      "node_modules/jodit/**",
      "node_modules/@tinymce/**",
      "node_modules/typescript/**",
      "styles/**",
      "public/uploads/**",
      "_archived/**",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "bea.thamirabaranithiruvizha.in",
        pathname: "/uploads/**",
      },
      {
        protocol: assetFallbackUrl.startsWith("http:") ? "http" : "https",
        hostname: assetHostname,
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "213.165.95.239",
        pathname: "/uploads/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/api/product/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-Requested-With, sathya_location" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      fallback: [
        {
          source: "/uploads/products/:path*",
          destination: `${assetFallbackUrl}/uploads/products/:path*`,
        },
      ],
    };
  },
  async redirects() {
    return [
      {
        source: "/products",
        destination: "/",
        permanent: true,
      },
      {
        source: "/products/:slug",
        destination: "/product/:slug",
        permanent: true,
      },
      // Legacy SMS / bookmark account URLs
      {
        source: "/user/orders",
        destination: "/orders",
        permanent: true,
      },
      {
        source: "/user/profile",
        destination: "/profile",
        permanent: true,
      },
      {
        source: "/viewcart",
        destination: "/cart",
        permanent: true,
      },
      {
        source: "/search/:term",
        destination: "/search?query=:term",
        permanent: true,
      },
      {
        source: "/login",
        destination: "/?login=1",
        permanent: false,
      },
      {
        source: "/register",
        destination: "/?register=1",
        permanent: false,
      },
      {
        source: "/enquiry",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/gift-product",
        destination: "/deals-offer",
        permanent: true,
      },
      {
        source: "/sitemap",
        destination: "/sitemap.xml",
        permanent: true,
      },
      // Offer pages use /offer/{slug} (same as footer). Do not send these to /deals-offer.
      {
        source: "/offers/:slug",
        destination: "/offer/:slug",
        permanent: true,
      },
      {
        source: "/weekend-offer",
        destination: "/offer/weekend-offer",
        permanent: true,
      },
      {
        source: "/weekend-offers",
        destination: "/offer/weekend-offers",
        permanent: true,
      },
      {
        source: "/big-discounts",
        destination: "/offer/big-discounts",
        permanent: true,
      },
      {
        source: "/bundle-offer",
        destination: "/category/combo-offers",
        permanent: true,
      },
      {
        source: "/bundle-offers",
        destination: "/category/combo-offers",
        permanent: true,
      },
      {
        source: "/combo-offers",
        destination: "/category/combo-offers",
        permanent: true,
      },
      {
        source: "/brand",
        destination: "/",
        permanent: true,
      },
      {
        source: "/all-brands",
        destination: "/brands",
        permanent: true,
      },
      {
        source: "/location",
        destination: "/all/stores",
        permanent: true,
      },
      // Legacy category-division pages (MySQL category_division table not fully migrated)
      {
        source: "/category-division/mobiles-wearables",
        destination: "/search?query=mobile",
        permanent: false,
      },
      {
        source: "/category-division/tv-accessories",
        destination: "/search?query=tv",
        permanent: false,
      },
      {
        source: "/category-division/appliances",
        destination: "/search?query=appliances",
        permanent: false,
      },
      {
        source: "/category-division/home-theatre-speakers",
        destination: "/search?query=speaker",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
