import mongoose from "mongoose";

const ProductRefSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

/**
 * Single promotional banner + product carousel row.
 * Banner URL is shared with the See All button.
 * Minimum 6 products required.
 */
const CategorySingleBannerProductsSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CategoryPage",
      required: true,
    },
    instanceId: { type: String, required: true, unique: true },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ecom_category_infos",
      required: true,
    },
    bannerDesktop: { type: String, default: "" },
    bannerMobile: { type: String, default: "" },
    /** Used for banner click and See All */
    bannerUrl: { type: String, default: "" },
    /** Product section title, e.g. iPhone & Accessories Galore */
    name: { type: String, default: "" },
    products: { type: [ProductRefSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

CategorySingleBannerProductsSchema.index({ pageId: 1 });
CategorySingleBannerProductsSchema.index({ categoryId: 1 });

if (mongoose.models.CategorySingleBannerProducts) {
  delete mongoose.models.CategorySingleBannerProducts;
}

export default mongoose.model(
  "CategorySingleBannerProducts",
  CategorySingleBannerProductsSchema
);
