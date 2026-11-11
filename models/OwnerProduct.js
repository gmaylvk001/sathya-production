import mongoose from "mongoose";

const OwnerProductSchema = new mongoose.Schema(
  {
    owner_id: { type: String, default: "unilet", index: true },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    product_item_code: { type: String, index: true },
    vendor_item_code: { type: String },
    vendor_product_name: { type: String },
    movement: { type: String, trim: true, default: null },
    price: { type: Number, required: true },
    offer_price: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    warranty: { type: String },
    delivery_days: { type: Number, default: 1 },
    region: {
      type: String,
      enum: ["all", "tamilnadu", "karnataka", "andhra", "kerala", "telangana"],
      default: "karnataka",
      index: true,
    },
    is_active: { type: Boolean, default: true, index: true },
    stock_status: {
      type: String,
      enum: ["In Stock", "Out of Stock"],
      default: "In Stock",
    },

    // Unilet ERP sync fields (/apis/unilet_stock_price). Missing is_sync_status / is_manual_price count as 0.
    status: { type: String },
    final_price: { type: Number },
    store_price: { type: Number },
    rank: { type: Number },
    ean: { type: String },
    is_common_type: { type: Number },
    is_sync_status: { type: Number },
    is_manual_price: { type: Number },
    common_item_code: { type: String },
    indoor_ean: { type: String },
    id_price: { type: Number },
    id_spl_price: { type: Number },
    id_final_price: { type: Number },
    id_store_price: { type: Number },
    outdoor_item_code: { type: String },
    outdoor_ean: { type: String },
    od_price: { type: Number },
    od_spl_price: { type: Number },
    od_final_price: { type: Number },
    od_store_price: { type: Number },
  },
  { timestamps: true }
);

OwnerProductSchema.index({ owner_id: 1, is_active: 1 });
OwnerProductSchema.index({ product_id: 1, is_active: 1 });
OwnerProductSchema.index({ product_id: 1, region: 1, is_active: 1 });
OwnerProductSchema.index({ product_item_code: 1, is_active: 1 });

export default mongoose.models.OwnerProduct ||
  mongoose.model("OwnerProduct", OwnerProductSchema);
