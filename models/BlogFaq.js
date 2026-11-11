import mongoose from "mongoose";

const BlogFaqSchema = new mongoose.Schema(
  {
    blogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blogs",
      index: true,
    },
    existId: {
      type: String, // Foreign key matching the blog's SQL ID / existId
      index: true,
    },
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "blogs_faq", // Standalone separate collection matching SQL table
  }
);

export default mongoose.models.BlogFaq || mongoose.model("BlogFaq", BlogFaqSchema);
