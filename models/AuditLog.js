import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true }, // e.g., 'CREATE', 'UPDATE', 'DELETE', 'PUBLISH'
    entity: { type: String, required: true }, // e.g., 'LaunchProduct'
    entity_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    diff: { type: mongoose.Schema.Types.Mixed }, // JSON representing changes or before/after state
    ip: { type: String },
    user_agent: { type: String },
  },
  { 
    timestamps: { createdAt: 'timestamp', updatedAt: false }
  }
);

export default mongoose.models.AuditLog ||
  mongoose.model("AuditLog", AuditLogSchema);
