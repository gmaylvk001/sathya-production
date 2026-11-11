import mongoose from "mongoose";

const BannerItemSchema = new mongoose.Schema(
  {
    image: { type: String, default: "" },
    url: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

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
 * 2–4 equal-size banner tiles followed by a related product row.
 */
const CategoryBannerGridSchema = new mongoose.Schema(
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
    /** Section title (optional) */
    name: { type: String, default: "" },
    /** Number of banners: 2, 3, or 4 */
    imageCount: { type: Number, enum: [2, 3, 4], default: 4 },
    banners: { type: [BannerItemSchema], default: [] },
    productName: { type: String, default: "" },
    seeAllLink: { type: String, default: "" },
    products: { type: [ProductRefSchema], default: [] },
    /** When true, storefront shows spacing between banner images */
    showGap: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

CategoryBannerGridSchema.index({ pageId: 1 });
CategoryBannerGridSchema.index({ categoryId: 1 });

if (mongoose.models.CategoryBannerGrid) {
  delete mongoose.models.CategoryBannerGrid;
}

export default mongoose.model("CategoryBannerGrid", CategoryBannerGridSchema);
