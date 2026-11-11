import mongoose from "mongoose";
import { PAGE_TYPES } from "@/lib/categoryPageComponents/registry";

const BannerItemSchema = new mongoose.Schema(
  {
    desktopImage: { type: String, default: "" },
    mobileImage: { type: String, default: "" },
    url: { type: String, default: "" },
    state: {
      type: String,
      enum: ["tamilnadu", "andhra", "kerala", "karnataka", "telangana", "all"],
      default: "all",
    },
    slot: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  { _id: true }
);

/**
 * Top Banner set for one Category / Sub / Child / Brand page.
 * category_brand pages key banners by pageId so they do not collide
 * with the parent category overview banner.
 */
const CategoryTopBannerSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    categoryName: { type: String, default: "" },
    categorySlug: { type: String, default: "" },
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CategoryPage",
      default: undefined,
    },
    pageType: {
      type: String,
      enum: Object.values(PAGE_TYPES),
      default: PAGE_TYPES.CATEGORY,
    },
    banners: { type: [BannerItemSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

CategoryTopBannerSchema.index(
  { categoryId: 1 },
  {
    unique: true,
    name: "categoryId_unique_no_page",
    partialFilterExpression: { pageId: { $exists: false } },
  }
);
CategoryTopBannerSchema.index(
  { pageId: 1 },
  { unique: true, sparse: true, name: "pageId_unique" }
);
CategoryTopBannerSchema.index({ categorySlug: 1 });

if (mongoose.models.CategoryTopBanner) {
  delete mongoose.models.CategoryTopBanner;
}

export default mongoose.model("CategoryTopBanner", CategoryTopBannerSchema);

export async function ensureCategoryTopBannerIndexes() {
  try {
    await mongoose
      .model("CategoryTopBanner")
      .collection.dropIndex("categoryId_1");
  } catch {
    /* old unique index may already be gone */
  }
}
