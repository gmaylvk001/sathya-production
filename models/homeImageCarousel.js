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
 * Named image carousel — one config per home page-builder instance.
 * Images intended size: max 400×500.
 */
const HomeImageCarouselSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HomePage",
      required: true,
    },
    instanceId: { type: String, required: true, unique: true },
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
  { timestamps: true, collection: "home_image_carousels" }
);

HomeImageCarouselSchema.index({ pageId: 1 });

if (mongoose.models.HomeImageCarousel) {
  delete mongoose.models.HomeImageCarousel;
}

export default mongoose.model("HomeImageCarousel", HomeImageCarouselSchema);
