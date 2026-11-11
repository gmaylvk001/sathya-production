import mongoose from "mongoose";

const ExistSathyaUserSkippedSchema = new mongoose.Schema({
  exist_id: {
    type: String,
    required: false,
    default: null,
    trim: true,
  },
  email: {
    type: String,
    required: false,
    default: null,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: false,
    default: null,
    trim: true,
  },
  skipped_reason: {
    type: String,
    required: false,
    default: null,
    trim: true,
  },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});

if (mongoose.models.sathya_exist_user_skipped) {
  delete mongoose.models.sathya_exist_user_skipped;
}

const ExistSathyaUserSkipped = mongoose.model(
  "sathya_exist_user_skipped",
  ExistSathyaUserSkippedSchema,
  "sathya_exist_user_skipped"
);

export default ExistSathyaUserSkipped;
