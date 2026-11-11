import mongoose from "mongoose";

const LaunchProductRevisionSchema = new mongoose.Schema(
  {
    launch_product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LaunchProduct', required: true, index: true },
    snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { 
    timestamps: { createdAt: 'created_at', updatedAt: false }
  }
);

export default mongoose.models.LaunchProductRevision ||
  mongoose.model("LaunchProductRevision", LaunchProductRevisionSchema);
