import mongoose from "mongoose";
import { PAGE_TYPES } from "@/lib/categoryPageComponents/registry";

/**
 * Layout for one Category / Sub / Child / Brand / Category+Brand page.
 * components[] = ordered pluggable blocks (Top Banner first; more later).
 */
const PageComponentSchema = new mongoose.Schema(
  {
    instanceId: { type: String, required: true },
    type: { type: String, required: true },
    /** Links to type-specific config doc (required for multi-instance components) */
    configId: { type: mongoose.Schema.Types.ObjectId, default: null },
    /** Optional admin label (e.g. product set name) shown on Order page */
    title: { type: String, default: "" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const CategoryPageSchema = new mongoose.Schema(
  {
    pageType: {
      type: String,
      enum: Object.values(PAGE_TYPES),
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    categoryName: { type: String, default: "" },
    categorySlug: { type: String, default: "" },
    /** Used by category_brand pages; null for category / brand-only layouts. */
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    brandName: { type: String, default: "" },
    brandSlug: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    components: { type: [PageComponentSchema], default: [] },
  },
  { timestamps: true }
);

CategoryPageSchema.index(
  { pageType: 1, categoryId: 1, brandId: 1 },
  { unique: true, name: "pageType_categoryId_brandId" }
);
CategoryPageSchema.index({ categorySlug: 1, pageType: 1 });
CategoryPageSchema.index({ brandSlug: 1, pageType: 1 });

if (mongoose.models.CategoryPage) {
  delete mongoose.models.CategoryPage;
}

export default mongoose.model("CategoryPage", CategoryPageSchema);

export async function ensureCategoryPageIndexes() {
  try {
    await mongoose.model("CategoryPage").collection.dropIndex("pageType_1_categoryId_1");
  } catch {
    /* old unique index may already be gone */
  }
}
