import mongoose from "mongoose";

const VisitorLogSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
    },
    page: {
      type: String,
      required: true,
    },
    referer: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    visitedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

export default mongoose.models.VisitorLog ||
  mongoose.model("VisitorLog", VisitorLogSchema);