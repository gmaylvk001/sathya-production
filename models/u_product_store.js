import mongoose from "mongoose";

const UProductStoreSchema = new mongoose.Schema({
  item_code: { type: String, required: true, trim: true, maxlength: 255 },
}, {
  collection: "u_product_store",
  timestamps: false,
  strict: true,
});

UProductStoreSchema.index({ item_code: 1 }, { unique: true, name: "item_code_unique" });

if (mongoose.models.u_product_store) {
  delete mongoose.models.u_product_store;
}

export default mongoose.model("u_product_store", UProductStoreSchema);
