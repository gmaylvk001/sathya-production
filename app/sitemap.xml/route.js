import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/models/product";
import Category from "@/models/ecom_category_info";
import Brand from "@/models/ecom_brand_info";
import { getSiteUrl } from "@/lib/siteUrl";

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc, { changefreq, priority, lastmod } = {}) {
  return `
      <url>
        <loc>${escapeXml(loc)}</loc>
        ${changefreq ? `<changefreq>${changefreq}</changefreq>` : ""}
        ${priority ? `<priority>${priority}</priority>` : ""}
        ${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ""}
      </url>`;
}

/** Build /category/... path from parentid chain (main / sub / child). */
function buildCategoryPath(category, byId) {
  const slugs = [];
  let current = category;
  const seen = new Set();

  while (current?.category_slug) {
    const id = current._id.toString();
    if (seen.has(id)) break;
    seen.add(id);

    slugs.unshift(current.category_slug);

    const parentId = current.parentid;
    if (!parentId || parentId === "none") break;

    current = byId.get(String(parentId));
    if (!current) break;
  }

  if (!slugs.length) return null;
  if (slugs.length === 1) {
    return `/collection/${slugs[0]}`;
  }
  if (slugs.length === 2) {
    return `/category/${slugs[1]}`;
  }
  return `/category/${slugs[slugs.length - 2]}/${slugs[slugs.length - 1]}`;
}

export const revalidate = 86400;

export async function GET() {
  try {
    const baseUrl = getSiteUrl();

    await dbConnect();

    /* ---------------- STATIC PAGES ---------------- */
    const staticPages = [
      "",
      "/brands",
      "/contact",
      "/privacy-policy",
      "/terms-and-conditions",
      "/cancellation-policy",
      "/shipping",
      "/about",
      "/blog-listing",
      "/faq",
      "/careers",
      "/deals-offer",
      "/open-box",
    ];

    const staticUrls = staticPages
      .map((path) =>
        urlEntry(`${baseUrl}${path}`, {
          changefreq: "monthly",
          priority: path === "" ? "1.0" : "0.6",
        })
      )
      .join("");

    /* ---------------- PARALLEL FETCH CATEGORIES, PRODUCTS, BRANDS ---------------- */
    const [categories, products, brands] = await Promise.all([
      Category.find(
        {
          status: "Active",
          category_slug: { $exists: true, $ne: "" },
        },
        { category_slug: 1, parentid: 1, updatedAt: 1 }
      ).lean(),
      Product.find(
        {
          status: "Active",
          slug: { $exists: true, $ne: "" },
        },
        { slug: 1, updatedAt: 1, _id: 0 }
      ).lean(),
      Brand.find(
        {
          status: { $in: ["Active", "active", 1, "1"] },
          brand_slug: { $exists: true, $ne: "" },
        },
        { brand_slug: 1, updatedAt: 1 }
      )
        .lean()
        .catch(() => []),
    ]);

    const byId = new Map(categories.map((c) => [c._id.toString(), c]));

    const categoryUrls = categories
      .map((c) => {
        const path = buildCategoryPath(c, byId);
        if (!path) return "";
        const depth = path.split("/").length - 2; // 1=main, 2=sub, 3=child
        const priority = depth >= 3 ? "0.6" : depth === 2 ? "0.65" : "0.7";
        return urlEntry(`${baseUrl}${path}`, {
          changefreq: "monthly",
          priority,
          lastmod: c.updatedAt || new Date(),
        });
      })
      .join("");

    const productUrls = products
      .map((p) =>
        urlEntry(`${baseUrl}/product/${p.slug}`, {
          changefreq: "daily",
          priority: "0.8",
          lastmod: p.updatedAt || new Date(),
        })
      )
      .join("");

    const brandUrls = (brands || [])
      .map((b) =>
        urlEntry(`${baseUrl}/brand/${b.brand_slug}`, {
          changefreq: "weekly",
          priority: "0.7",
          lastmod: b.updatedAt || new Date(),
        })
      )
      .join("");

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticUrls}
  ${categoryUrls}
  ${brandUrls}
  ${productUrls}
  </urlset>`;

    return new NextResponse(sitemap, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Sitemap error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
