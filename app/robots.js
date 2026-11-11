import { getSiteUrl } from "@/lib/siteUrl";

export default function robots() {
  const baseUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/checkout",
          "/cart",
          "/profile",
          "/orders",
          "/wishlist",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl.replace(/^https?:\/\//, ""),
  };
}
