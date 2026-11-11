// app/api/compare/merge/route.js
//
// POST — Login-time sync: merges a guest's localStorage compare list into MongoDB.
//
// Merge logic (mirrors the server-side reference implementation):
//   1. Find which product IDs are already in the user's DB compare list
//   2. Filter out duplicates from the incoming localStorage list
//   3. Respect the max-4 limit: existing DB items take priority
//   4. Fetch real Product docs for the new IDs (to get category_slug + validate existence)
//   5. Insert remaining slots using insertMany({ ordered: false }) so that
//      any duplicate-key errors (11000) on individual docs don't block the rest
//   6. Return the final merged list
//
// Auth: Bearer JWT → jwt.verify → decoded.userId

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import Compare from '@/models/Compare';
import Product from '@/models/product';

function getUserIdFromRequest(req) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function POST(req) {
  try {
    await dbConnect();

    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const body = await req.json();
    // localList: Array<{ productId: string, category_slug: string }>
    const localList = Array.isArray(body.localList) ? body.localList : [];

    if (localList.length === 0) {
      // Nothing to merge — just return the existing DB list
      const existing = await Compare.find({ userId }).sort({ added_at: 1 }).lean();
      return NextResponse.json({ items: existing, count: existing.length }, { status: 200 });
    }

    // ── Step 1: What's already in the DB for this user? ───────────────────
    const existingItems = await Compare.find({ userId }).select('productId').lean();
    const existingIds = new Set(existingItems.map((item) => String(item.productId)));

    // ── Step 2: Filter out products already in DB (deduplicate) ───────────
    const availableSlots = 4 - existingItems.length;
    if (availableSlots <= 0) {
      // DB is already at limit — nothing to merge
      let items = await Compare.find({ userId })
        .sort({ added_at: 1 })
        .populate('productId')
        .lean();
      items = normalizeItems(items);
      return NextResponse.json({ items, count: items.length }, { status: 200 });
    }

    const newIds = localList
      .filter((entry) => !existingIds.has(String(entry.productId)))
      .map((entry) => String(entry.productId))
      .slice(0, availableSlots);

    if (newIds.length === 0) {
      let items = await Compare.find({ userId })
        .sort({ added_at: 1 })
        .populate('productId')
        .lean();
      items = normalizeItems(items);
      return NextResponse.json({ items, count: items.length }, { status: 200 });
    }

    // ── Step 3: Fetch live Product docs to validate + get category_slug ───
    const products = await Product.find({ _id: { $in: newIds } })
      .select('_id category_new')
      .lean();

    // ── Step 4: Check same-category constraint ─────────────────────────────
    // If there are existing items, their category_slug must match incoming products.
    let allowedCategorySlug = null;
    if (existingItems.length > 0) {
      const firstExisting = await Compare.findOne({ userId }).select('category_slug').lean();
      allowedCategorySlug = firstExisting?.category_slug || null;
    }

    const toInsert = products
      .filter((p) => {
        if (!p.category_new) return false;
        // Enforce same-category rule if a baseline category exists
        if (allowedCategorySlug && p.category_new !== allowedCategorySlug) return false;
        return true;
      })
      .map((p) => ({
        userId,
        productId: p._id,
        category_slug: p.category_new,
      }));

    // ── Step 5: Bulk insert — ordered:false means duplicate-key errors ─────
    // on individual docs don't block the rest of the batch from inserting
    if (toInsert.length > 0) {
      try {
        await Compare.insertMany(toInsert, { ordered: false });
      } catch (err) {
        // Swallow BulkWriteError — it just means some were already there
        if (!err.message?.includes('E11000') && err.name !== 'BulkWriteError') {
          throw err;
        }
      }
    }

    // ── Step 6: Return final merged list ───────────────────────────────────
    let items = await Compare.find({ userId })
      .sort({ added_at: 1 })
      .populate('productId')
      .lean();
    items = normalizeItems(items);

    return NextResponse.json({ items, count: items.length }, { status: 200 });

  } catch (error) {
    console.error('[/api/compare/merge POST]', error.message);
    return NextResponse.json(
      { error: error.message || 'Merge failed' },
      { status: 500 }
    );
  }
}

// Shared normalizer: makes populate results consistent with other compare endpoints
function normalizeItems(items) {
  return items.map((item) => ({
    _id:           item._id,
    productId:     item.productId?._id || item.productId,
    category_slug: item.category_slug,
    added_at:      item.added_at,
    productData:   item.productId && item.productId._id ? item.productId : null,
  }));
}
