// app/api/compare/[productId]/route.js
//
// DELETE — remove exactly one product from the logged-in user's compare list.
//
// Deletes only the "compare link" document { userId, productId } from the
// Compare collection. The actual Product document is never touched.
//
// Auth: Bearer JWT → jwt.verify → decoded.userId (same pattern as wishlist API)

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import Compare from '@/models/Compare';

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

export async function DELETE(req, { params }) {
  try {
    await dbConnect();

    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const { productId } = await params;
    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    // Delete exactly the one link document — does NOT delete the actual product
    await Compare.findOneAndDelete({ userId, productId });

    // Return the updated list so the client can sync state from a single source of truth
    let items = await Compare.find({ userId })
      .sort({ added_at: 1 })
      .populate('productId')
      .lean();

    items = items.map((item) => ({
      _id:           item._id,
      productId:     item.productId?._id || item.productId,
      category_slug: item.category_slug,
      added_at:      item.added_at,
      productData:   item.productId && item.productId._id ? item.productId : null,
    }));

    return NextResponse.json(
      { message: 'Removed from compare', items, count: items.length },
      { status: 200 }
    );

  } catch (error) {
    console.error('[/api/compare/[productId] DELETE]', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to remove from compare' },
      { status: 500 }
    );
  }
}
