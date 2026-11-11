// models/Compare.js
//
// Design principle: This collection stores ONLY references (userId, productId,
// category_slug). It NEVER duplicates product data (name, price, specs, images).
// Product details are always fetched live from the Product collection via
// .populate('productId') at read-time, so price/spec changes and product
// deletions are always reflected accurately — no stale data.
//
// NOTE: We store category_slug (String) instead of an ObjectId because the
// existing Product model uses `category_new` (a string slug like
// "air-conditioners"), not an ObjectId ref. This keeps the same-category
// enforcement consistent with the product data model.

import mongoose from 'mongoose';

const compareSchema = new mongoose.Schema(
  {
    // Reference to the user who added this compare entry.
    // Matches the 'ecom_users_info' collection used by the User model.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ecom_users_info',
      required: true,
      index: true,
    },

    // Reference to the product being compared.
    // Never embed product fields here — always populate at read-time.
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    // String slug from product.category_new (e.g. "air-conditioners").
    // Used to enforce the "same category only" rule without an ObjectId ref.
    category_slug: {
      type: String,
      required: true,
      trim: true,
    },

    added_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Prevent the same user from adding the same product twice.
// { ordered: false } on insertMany means duplicate-key errors on this index
// will be swallowed per-document, letting the rest of the batch succeed.
compareSchema.index({ userId: 1, productId: 1 }, { unique: true });

// Fast lookup of a user's full compare list, optionally filtered by category.
compareSchema.index({ userId: 1, category_slug: 1 });

export default mongoose.models.Compare ||
  mongoose.model('Compare', compareSchema);
