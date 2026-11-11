import mongoose from "mongoose";

const JobPositionSchema = new mongoose.Schema({
  position_name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  position_slug: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["Active", "Inactive"],
    default: "Active"
  }
}, { timestamps: true });

export default mongoose.models.JobPosition || mongoose.model("JobPosition", JobPositionSchema);
