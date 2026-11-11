import mongoose from "mongoose";

const homeSectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  position: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active", // ✅ default status
  },
}, { timestamps: true });

const HomeSection = mongoose.models.HomeSection || mongoose.model("HomeSection", homeSectionSchema);

export default HomeSection;
