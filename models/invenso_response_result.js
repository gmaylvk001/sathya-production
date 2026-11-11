import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };

/**
 * Log every Invenzo/Izoleap API call response (full JSON).
 * Collection: invenso_response_result
 */
const InvensoResponseResultSchema = new mongoose.Schema(
  {
    user_id: optionalString,
    order_number: optionalString,
    /** Which call: auth | store_create | job_create | webhook_update | other */
    call_type: optionalString,
    /** Full API response JSON (object or stringified fallback) */
    response: { type: mongoose.Schema.Types.Mixed, required: false, default: null },
    created_at: { type: Date, required: false, default: null },
    updated_at: { type: Date, required: false, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "invenso_response_result",
    strict: true,
  }
);

InvensoResponseResultSchema.index({ order_number: 1 }, { name: "order_number_relation" });
InvensoResponseResultSchema.index({ user_id: 1 }, { name: "user_id_relation" });
InvensoResponseResultSchema.index({ call_type: 1, created_at: -1 }, { name: "call_type_created" });

if (mongoose.models.invenso_response_result) {
  delete mongoose.models.invenso_response_result;
}

export default mongoose.model("invenso_response_result", InvensoResponseResultSchema);
