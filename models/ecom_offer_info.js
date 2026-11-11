import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
  {
    offer_code: {
      type: String,
      required: true,
      unique: true, // Ensure offer codes are unique
    },
    fest_offer_status: {
      type: String,
      enum: ['active', 'inactive'], // Only allow 'active' or 'inactive'
      required: true,
    },
    fest_offer_status2: {
      type: String,
      enum: ['active', 'inactive'], // Only allow 'active' or 'inactive'
      required: true,
    },
    selected_user_type: {
      type: String,
      enum: ['all', 'custom'], // Only allow 'all' or 'custom'
      required: true,
    },
    notes: {
      type: String,
      required: true,
    },
    from_date: {
      type: Date,
      required: true,
    },
    to_date: {
      type: Date,
      required: true,
    },
    offer_product_category: {
      type: String,
      enum: ['product', 'category'], // Only allow 'product' or 'category'
      required: true, // ✅ Added required: true
    },
    offer_product: {
      type: [String],
      required: function () {
        return this.offer_product_category === 'product'; // Required only if offer_product_category is 'product'
      },
    },
    offer_category: {
      type: [String],
      required: function () {
        return this.offer_product_category === 'category'; // Required only if offer_product_category is 'category'
      },
    },
    offer_type: {
      type: String,
      enum: ['percentage', 'fixed_price'], // Only allow 'percentage' or 'fixed_price'
      required: true,
    },
    percentage: {
      type: Number,
      required: function () {
        return this.offer_type === 'percentage'; // Required only if offer_type is 'percentage'
      },
    },
    fixed_price: {
      type: Number,
      required: function () {
        return this.offer_type === 'fixed_price'; // Required only if offer_type is 'fixed_price'
      },
    },
     selected_users: {
      type: [mongoose.Schema.Types.ObjectId], // or type: [String] if user IDs are strings
      ref: 'User', // use your actual user model name
      default: [], // optional: default to empty array
    },
     limit_enabled: {
      type: Boolean,
      default: false,
    },
    offer_limit: {
      type: Number,
      required: function () {
        return this.limit_enabled === true;
      },
    },
    used_by: {
      type: Number,
      default: 0,
    },
    
  },
  { timestamps: true, collection: 'ecom_offer_info' } // Explicit collection name
);

export default mongoose.models.ecom_offer_info || mongoose.model('ecom_offer_info', offerSchema);
