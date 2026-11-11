import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };
const optionalNumber = { type: Number, required: false, default: null };

const ProductAllUSchema = new mongoose.Schema(
  {
    item_code: optionalString,
    quantity: optionalNumber,
    price: optionalNumber,
    spl_price: optionalNumber,
    final_price: optionalNumber,
    brand_code: optionalString,
    movement: optionalString,
    rank: optionalNumber,
    item_description: optionalString,
    brand: optionalString,
    group_property: optionalString,
    brand_id: optionalString,
    bfl_id: optionalString,
    status: optionalString,
    ean: optionalString,
    is_common_type: optionalNumber,
    common_item_code: optionalString,
  },
  {
    collection: "product_all_u",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    strict: true,
  }
);

ProductAllUSchema.index({ item_code: 1 }, { name: "item_code" });

export const PRODUCT_ALL_U_FIELDS = [
  "item_code",
  "quantity",
  "price",
  "spl_price",
  "final_price",
  "brand_code",
  "movement",
  "rank",
  "item_description",
  "brand",
  "group_property",
  "brand_id",
  "bfl_id",
  "status",
  "ean",
  "is_common_type",
  "common_item_code",
  "created_at",
  "updated_at",
];

export default mongoose.models.product_all_u || mongoose.model("product_all_u", ProductAllUSchema);
