import mongoose from "mongoose";

/**
 * Home page content block — admin writes text shown on the home page.
 */
const HomeContentSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HomePage",
      required: true,
    },
    instanceId: { type: String, required: true, unique: true },
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
  { timestamps: true, collection: "home_contents" }
);

HomeContentSchema.index({ pageId: 1 });

if (mongoose.models.HomeContent) {
  delete mongoose.models.HomeContent;
}

export default mongoose.model("HomeContent", HomeContentSchema);
