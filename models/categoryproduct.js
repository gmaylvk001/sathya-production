import mongoose from "mongoose";

const CategoryProductSchema = new mongoose.Schema(
  {
    subcategoryId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "ecom_category_info", 
      required: true,
      unique: true // Ensure one entry per subcategory
    },
    subcategoryName: { // Add this field to store category name
      type: String,
      required: true
    },
    products: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "product" 
    }],
    /* bannerImage: { type: String },
    bannerRedirectUrl: { type: String }, */
    bannerImage: [{ type: String }],
bannerRedirectUrl: [{ type: String }],

    categoryImage: { type: String },
    categoryRedirectUrl: { type: String },

    /* categoryImage: [{ type: String }],
categoryRedirectUrl: [{ type: String }], */

    borderColor: { type: String, default: "#000000" },
    alignment: { type: String, default: "left" },
    status: { type: String, default: "Active" },
    position: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Add index for better performance
CategoryProductSchema.index({ subcategoryId: 1 });
CategoryProductSchema.index({ status: 1 });
CategoryProductSchema.index({ position: 1 });

export default mongoose.models.CategoryProduct ||
  mongoose.model("CategoryProduct", CategoryProductSchema);