import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getCategoryPagesAvailability } from "@/lib/categoryPageComponents/resolvePageComponents";
import { availabilityKey } from "@/lib/categoryPageComponents/categoryHref";

/**
 * POST /api/category-pages/availability
 * Body: { pages: [{ categoryId, pageType, slug?, brandId?, brandSlug? }, ...] }
 * Response: { success, availability: { "<categoryId>:<pageType>[:brandId]": boolean } }
 */
const g = globalThis;
if (!g.__sathyaAvailCache) {
  g.__sathyaAvailCache = new Map();
}
const AVAIL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 mins

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const pages = Array.isArray(body?.pages) ? body.pages : [];

    if (pages.length > 2000) {
      return NextResponse.json(
        { success: false, message: "Too many pages requested" },
        { status: 400 }
      );
    }

    const now = Date.now();
    const result = {};
    const uncachedPages = [];

    for (const page of pages) {
      const key = availabilityKey(page.categoryId, page.pageType, page.brandId);
      const cached = g.__sathyaAvailCache.get(key);
      if (cached && now - cached.at < AVAIL_CACHE_TTL_MS) {
        result[key] = cached.val;
      } else {
        uncachedPages.push(page);
      }
    }

    if (uncachedPages.length > 0) {
      await dbConnect();
      const freshAvailability = await getCategoryPagesAvailability(uncachedPages);
      for (const [k, v] of Object.entries(freshAvailability || {})) {
        result[k] = v;
        g.__sathyaAvailCache.set(k, { val: v, at: now });
      }
    }

    return NextResponse.json({ success: true, availability: result });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message || "Availability check failed" },
      { status: 500 }
    );
  }
}
