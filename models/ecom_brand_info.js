import mongoose from "mongoose";

const BannerSchema = new mongoose.Schema({
  banner_name: { type: String, required: true },
  banner_image: { type: String, required: true },
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

const BrandSchema = new mongoose.Schema({
  brand_name: { type: String, required: true },
  brand_slug: { type: String, unique: true, required: true },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  image: { 
    type: String,
    validate: {
      validator: function(v) {
        return /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(v);
      },
      message: props => `${props.value} is not a valid image path!`
    }
  },
    manufacturer_name: { type: String, default: "" },
  manufacturer_address: { type: String, default: "" },
  banners: [BannerSchema], // ✅ Array of banners per brand
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.ecom_brand_infos || mongoose.model("ecom_brand_infos", BrandSchema);
