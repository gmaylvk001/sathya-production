import mongoose from "mongoose";

const ImageItemSchema = new mongoose.Schema(
  {
    image: { type: String, default: "" },
    url: { type: String, default: "" },
    notes: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

/**
 * Named image carousel — one config per page-builder instance.
 * allowMultiple=true so same category can have several sets.
 * Images intended size: max 400×500.
 */
const CategoryImageCarouselSchema = new mongoose.Schema(
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
    /** Displayed at top of component on storefront */
    name: { type: String, default: "" },
    items: { type: [ImageItemSchema], default: [] },
    /** When true, storefront shows spacing between carousel images */
    showGap: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

CategoryImageCarouselSchema.index({ pageId: 1 });
CategoryImageCarouselSchema.index({ categoryId: 1 });

if (mongoose.models.CategoryImageCarousel) {
  delete mongoose.models.CategoryImageCarousel;
}

export default mongoose.model("CategoryImageCarousel", CategoryImageCarouselSchema);
