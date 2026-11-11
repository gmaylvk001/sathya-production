import mongoose from "mongoose";

// Reusable Banner Schema (same as brand la irukku)
const BannerSchema = new mongoose.Schema({
  banner_name: { type: String, required: true },
  banner_image: { type: String },
  redirect_url: { type: String },
  banner_status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  state: {
    type: String,
    enum: ["all", "tamilnadu", "karnataka", "andhra", "kerala", "telangana"],
    default: "all",
  },
  slot: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
});

const CategorySchema = new mongoose.Schema({
  category_name: { type: String, required: true },
  category_slug: { type: String, unique: true, required: true },
  md5_cat_name: { type: String, required: true },
  parentid: { type: String, default: "none" },
  parentid_new: { type: String, default: "none" },
  meta_title : { type: String, default: "none" },
  meta_description : { type: String, default: "none" },
  meta_keyword : { type: String, default: "none" },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  image: { type: String }, // category image
  navImage: { type: String }, // nav image
  icon_url: { type: String },
  position: { type: Number, default: 0, min: 0 },
  banners: [BannerSchema], // ✅ Array of banners per category
  content: { type: String }, // ✅ Add this line for text box content
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.ecom_category_infos ||
  mongoose.model("ecom_category_infos", CategorySchema);
