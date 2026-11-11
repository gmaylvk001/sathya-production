import mongoose from "mongoose";

const BlogsSchema = new mongoose.Schema(
  {
    blogTitle: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String },
    shortDescription: { type: String },
    description: { type: String },
    author: { type: String },
    readingTime: { type: Number },
    publishDate: { type: Date },
    bannerImage: { type: String },
    featuredImage: { type: String },
    metaTitle: { type: String },
    metaKeywords: { type: String },
    metaDescription: { type: String },
    schemaJson: { type: String, default: null },
    views: { type: Number, default: 0 },
    category_id: { type: String },
    status: { type: String, default: "Active" },
    existId: { type: String, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.Blogs || mongoose.model("Blogs", BlogsSchema);
