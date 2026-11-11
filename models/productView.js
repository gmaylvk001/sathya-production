import mongoose from "mongoose";

const ProductViewSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ecom_category_infos",
      required: true,
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "product",
      },
    ],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// ✅ Always check if model exists, otherwise create
const ProductView =
  mongoose.models.ecom_product_views ||
  mongoose.model("ecom_product_views", ProductViewSchema);

export default ProductView;
