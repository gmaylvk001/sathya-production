import mongoose from "mongoose";

const HeaderSettingsVersionSchema = new mongoose.Schema(
  {
    settings: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    savedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    note: {
      type: String,
      default: "Saved settings",
    },
  },
  {
    timestamps: true,
    collection: "header_settings_versions",
  }
);

HeaderSettingsVersionSchema.index({ createdAt: -1 });

if (mongoose.models && mongoose.models.HeaderSettingsVersion) {
  delete mongoose.models.HeaderSettingsVersion;
}

export default mongoose.model("HeaderSettingsVersion", HeaderSettingsVersionSchema);
