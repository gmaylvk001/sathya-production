import mongoose from "mongoose";

const PageComponentSchema = new mongoose.Schema(
  {
    instanceId: { type: String, required: true },
    type: { type: String, required: true },
    configId: { type: mongoose.Schema.Types.ObjectId, default: null },
    title: { type: String, default: "" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const HomePageSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Home Page" },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    components: { type: [PageComponentSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.HomePage ||
  mongoose.model("HomePage", HomePageSchema);
