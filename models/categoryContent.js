import mongoose from "mongoose";

/**
 * Category page content block — admin writes text shown on the category page.
 */
const CategoryContentSchema = new mongoose.Schema(
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
    /** Optional admin label for list / order UI */
    name: { type: String, default: "" },
    /** Main content body written by admin */
    content: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

CategoryContentSchema.index({ pageId: 1 });
CategoryContentSchema.index({ categoryId: 1 });

if (mongoose.models.CategoryContent) {
  delete mongoose.models.CategoryContent;
}

export default mongoose.model("CategoryContent", CategoryContentSchema);
