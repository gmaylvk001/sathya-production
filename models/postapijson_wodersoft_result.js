import mongoose from "mongoose";

const PostapijsonWodersoftResultSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "orders_new",
      required: false,
      default: null,
    },
    order_number: { type: String, required: false, default: null, trim: true },
    json_text: { type: String, required: false, default: null },
    response_data: { type: String, required: false, default: null },
    created_at: { type: Date, required: false, default: null },
    updated_at: { type: Date, required: false, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "postapijson_wodersoft_result",
    strict: true,
  }
);

PostapijsonWodersoftResultSchema.index({ order_id: 1 }, { name: "order_id_relation" });
PostapijsonWodersoftResultSchema.index({ order_number: 1 }, { name: "order_number_relation" });

if (mongoose.models.postapijson_wodersoft_result) {
  delete mongoose.models.postapijson_wodersoft_result;
}

export default mongoose.model(
  "postapijson_wodersoft_result",
  PostapijsonWodersoftResultSchema
);
