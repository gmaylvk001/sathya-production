import mongoose from "mongoose";

const ProductStoreSchema = new mongoose.Schema(
  {
    item_code: { type: String, required: true, trim: true, maxlength: 255 },
  },
  { collection: "product_store", timestamps: false, strict: true }
);

ProductStoreSchema.index({ item_code: 1 }, { unique: true, name: "item_code_unique" });

if (mongoose.models.product_store) {
  delete mongoose.models.product_store;
}

export default mongoose.model("product_store", ProductStoreSchema);
