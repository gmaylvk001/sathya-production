// app/api/compare/route.js
//
// GET  — fetch the logged-in user's compare list (with populated product data)
// POST — add a product to the compare list (validates max-4 + same-category)
//
// Auth: Bearer JWT via Authorization header → jwt.verify → decoded.userId
// Matches the exact pattern used by /api/wishlist/route.js

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import Compare from '@/models/Compare';
import Product from '@/models/product';
import mongoose from 'mongoose';

// ─── Helper: extract & verify JWT ────────────────────────────────────────────

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

// ─── Helper: fetch the user's full compare list with populated product data ──

async function fetchCompareList(userId) {
  const COMPARE_FIELDS =
    'name slug images price special_price quantity stock_status movement brand model_number size star warranty item_code key_specifications product_highlights filter avgRating status brand_name brand_slug description';

  let items = await Compare.find({ userId })
    .sort({ added_at: 1 })          // stable order: oldest first
    .populate({
      path: 'productId',
      select: COMPARE_FIELDS,
      populate: { path: 'brand', select: 'brand_name brand_slug' },
    })
    .lean();

  // Gracefully handle deleted products — keep the entry but mark productData null
  return items.map((item) => {
    let productData = item.productId && item.productId._id ? item.productId : null;
    if (productData?.description && String(productData.description).length > 2000) {
      productData = { ...productData, description: String(productData.description).slice(0, 2000) };
    }
    if (Array.isArray(productData?.images) && productData.images.length > 1) {
      productData = { ...productData, images: productData.images.slice(0, 1) };
    }
    return {
      _id:           item._id,
      productId:     item.productId?._id || item.productId,
      category_slug: item.category_slug,
      added_at:      item.added_at,
      productData,
    };
  });
}

// ─── GET: return user's compare list OR fetch products by ?ids= ────────────────

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids') || searchParams.get('productIds') || '';

    // If 'ids' query parameter is provided (e.g. guest compare or modal view):
    if (idsParam) {
      const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
      const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length === 0) {
        return NextResponse.json({ products: [], count: 0 }, { status: 200 });
      }

      // Select only fields needed for compare UI — skip huge HTML blobs that slow the modal
      const COMPARE_FIELDS =
        'name slug images price special_price quantity stock_status movement brand model_number size star warranty item_code key_specifications product_highlights filter avgRating status brand_name brand_slug description';

      const products = await Product.find({ _id: { $in: validIds } })
        .select(COMPARE_FIELDS)
        .populate('brand', 'brand_name brand_slug')
        .lean();

      // Trim oversized description HTML so payload stays small
      const trimmed = products.map((p) => {
        if (p?.description && String(p.description).length > 2000) {
          return { ...p, description: String(p.description).slice(0, 2000) };
        }
        // Keep only first image for compare cards
        if (Array.isArray(p?.images) && p.images.length > 1) {
          return { ...p, images: p.images.slice(0, 1) };
        }
        return p;
      });

      const map = new Map(trimmed.map((p) => [String(p._id), p]));
      const ordered = validIds.map((id) => map.get(id)).filter(Boolean);

      return NextResponse.json({ products: ordered, count: ordered.length }, { status: 200 });
    }

    // Category / Search query endpoint for similar products picker:
    const categoryParam = searchParams.get('category');
    const categoryIdParam = searchParams.get('categoryId');
    const searchParam = searchParams.get('search') || searchParams.get('q');
    const excludeParam = searchParams.get('exclude');
    const currentProductId = searchParams.get('productId') || searchParams.get('currentProductId');

    if (categoryParam || categoryIdParam || searchParam || currentProductId) {
      const filter = { status: 'Active' };

      // Handle exclusions
      const excludeIds = (excludeParam || '')
        .split(',')
        .map((s) => s.trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      if (excludeIds.length > 0) {
        filter._id = { $nin: excludeIds };
      }

      // Fetch source product to get category / related_products if available
      let sourceProduct = null;
      if (currentProductId && mongoose.Types.ObjectId.isValid(currentProductId)) {
        sourceProduct = await Product.findById(currentProductId)
          .select('category sub_category sub_category_new_name related_products add_ons')
          .lean();
      }

      const orCatConditions = [];
      const catInputs = [categoryParam, categoryIdParam, sourceProduct?.category, sourceProduct?.sub_category].filter(Boolean);

      for (const catInput of catInputs) {
        const trimmed = String(catInput).trim();
        if (!trimmed) continue;
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Direct string match on category fields
        orCatConditions.push(
          { category: trimmed },
          { sub_category: trimmed },
          { category_new: trimmed },
          { sub_category_new: { $regex: escaped, $options: 'i' } }
        );

        // Subcategory name match (e.g. Televisions)
        orCatConditions.push({
          sub_category_new_name: { $regex: escaped, $options: 'i' },
        });

        // ObjectId match if valid 24-hex string
        if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
          try {
            const objId = new mongoose.Types.ObjectId(trimmed);
            orCatConditions.push({ category: objId });
            orCatConditions.push({ sub_category: objId });
          } catch {}
        }
      }

      // If sourceProduct has a sub_category_new_name, also match its top category
      if (sourceProduct?.sub_category_new_name) {
        const topCat = sourceProduct.sub_category_new_name.split('##')[0].trim();
        if (topCat) {
          const escapedTop = topCat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          orCatConditions.push({
            sub_category_new_name: { $regex: escapedTop, $options: 'i' },
          });
        }
      }

      // Text search condition
      let searchCondition = null;
      if (searchParam && searchParam.trim()) {
        const escapedSearch = searchParam.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        searchCondition = {
          $or: [
            { name: { $regex: escapedSearch, $options: 'i' } },
            { brand: { $regex: escapedSearch, $options: 'i' } },
            { model_number: { $regex: escapedSearch, $options: 'i' } },
          ],
        };
      }

      // Assemble query
      if (orCatConditions.length > 0 && searchCondition) {
        filter.$and = [{ $or: orCatConditions }, searchCondition];
      } else if (orCatConditions.length > 0) {
        filter.$or = orCatConditions;
      } else if (searchCondition) {
        filter.$or = searchCondition.$or;
      }

      let products = await Product.find(filter)
        .select('name slug brand price special_price quantity stock_status movement model_number item_code description warranty specifications images category sub_category sub_category_new_name filter key_specifications size star product_highlights')
        .sort({ quantity: -1, createdAt: -1 })
        .limit(20)
        .lean();

      // If source product has related products and no active search query, prioritize them at the front
      if (sourceProduct && !searchParam) {
        const relIds = [
          ...(Array.isArray(sourceProduct.related_products) ? sourceProduct.related_products : []),
          ...(Array.isArray(sourceProduct.add_ons) ? sourceProduct.add_ons : []),
        ]
          .map((id) => String(id))
          .filter((id) => mongoose.Types.ObjectId.isValid(id) && !excludeIds.some((e) => String(e) === id));

        if (relIds.length > 0) {
          const relProducts = await Product.find({
            _id: { $in: relIds.map((id) => new mongoose.Types.ObjectId(id)) },
            status: 'Active',
          })
            .select('name slug brand price special_price quantity stock_status movement model_number item_code description warranty specifications images category sub_category sub_category_new_name filter key_specifications size star product_highlights')
            .lean();

          if (relProducts.length > 0) {
            const relMap = new Map(relProducts.map((p) => [String(p._id), p]));
            const seen = new Set(relProducts.map((p) => String(p._id)));
            const others = products.filter((p) => !seen.has(String(p._id)));
            products = [...relProducts, ...others].slice(0, 20);
          }
        }
      }

      return NextResponse.json({ products, count: products.length }, { status: 200 });
    }

    // Otherwise fetch the logged-in user's stored list:
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      // Return empty list for unauthenticated requests
      return NextResponse.json({ items: [], count: 0 }, { status: 200 });
    }

    const items = await fetchCompareList(userId);
    return NextResponse.json({ items, count: items.length }, { status: 200 });

  } catch (error) {
    console.error('[/api/compare GET]', error.message);
    return NextResponse.json({ items: [], products: [], count: 0 }, { status: 200 });
  }
}

// ─── POST: add a product to the compare list ─────────────────────────────────

export async function POST(req) {
  try {
    await dbConnect();

    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    // Fetch the live product to get its category_slug and validate it exists
    const product = await Product.findById(productId).select('_id category sub_category category_new sub_category_new_name name').lean();
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    const cleanCat = product.sub_category_new_name ? product.sub_category_new_name.split('##')[0].trim() : '';
    const category_slug = cleanCat || product.category || product.sub_category || 'General';

    // ── Server-side validation 1: max 4 items ──────────────────────────────
    const count = await Compare.countDocuments({ userId });
    if (count >= 4) {
      return NextResponse.json(
        { error: 'Compare list is full. Remove an item to add a new one.' },
        { status: 400 }
      );
    }

    // ── Server-side validation 2: same category only (or force switch) ──
    if (body.forceSwitch) {
      await Compare.deleteMany({ userId });
    } else if (count > 0) {
      const existingItem = await Compare.findOne({ userId }).select('category_slug').lean();
      if (
        existingItem &&
        existingItem.category_slug &&
        category_slug &&
        existingItem.category_slug.toLowerCase() !== category_slug.toLowerCase()
      ) {
        return NextResponse.json(
          {
            error: `You can only compare products from the same category. Your current list contains "${existingItem.category_slug}" products.`,
            categoryMismatch: true,
            currentCategory: existingItem.category_slug,
            newCategory: category_slug,
          },
          { status: 400 }
        );
      }
    }

    // ── Insert (upsert-style: silently ignore if already exists) ───────────
    try {
      await Compare.create({ userId, productId, category_slug });
    } catch (err) {
      // Code 11000 = duplicate key — product already in compare list; not an error
      if (err.code !== 11000) throw err;
    }

    const items = await fetchCompareList(userId);
    return NextResponse.json(
      { message: 'Added to compare', items, count: items.length },
      { status: 200 }
    );

  } catch (error) {
    console.error('[/api/compare POST]', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to add to compare' },
      { status: 500 }
    );
  }
}

// ─── DELETE: clear the entire compare list for the logged-in user ─────────────
// (Individual item delete is handled by /api/compare/[productId]/route.js)

export async function DELETE(req) {
  try {
    await dbConnect();

    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    await Compare.deleteMany({ userId });
    return NextResponse.json({ message: 'Compare list cleared', items: [], count: 0 }, { status: 200 });

  } catch (error) {
    console.error('[/api/compare DELETE]', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to clear compare list' },
      { status: 500 }
    );
  }
}
