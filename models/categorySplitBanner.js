import mongoose from "mongoose";

const BannerItemSchema = new mongoose.Schema(
  {
    image: { type: String, default: "" },
    url: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

/**
 * Single (1 full-width) or Double (left + right) linked banners.
 * No display name — layout driven by bannerCount only.
 */
const CategorySplitBannerSchema = new mongoose.Schema(
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
    /** 1 = single full-width banner, 2 = left + right */
    bannerCount: { type: Number, enum: [1, 2], default: 1 },
    banners: { type: [BannerItemSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true, collection: "category_split_banners" }
);

CategorySplitBannerSchema.index({ pageId: 1 });
CategorySplitBannerSchema.index({ categoryId: 1 });

if (mongoose.models.CategorySplitBanner) {
  delete mongoose.models.CategorySplitBanner;
}

export default mongoose.model("CategorySplitBanner", CategorySplitBannerSchema);
