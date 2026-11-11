// models/ecom_wishlist_info.js
import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  mailsSent: {
    type: Number,
    default: 0
  },
  lastNotifiedAt: {
    type: Date,
    default: null
  },
  alertsEnabled: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure a user can't add the same product twice
wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

const Wishlist = mongoose.models.Wishlist || mongoose.model('Wishlist', wishlistSchema);

export default Wishlist;
