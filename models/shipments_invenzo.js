import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };
const optionalDate = { type: Date, required: false, default: null };

/**
 * Matches Exist MySQL `shipments_invenzo` columns:
 * id, user_id, order_id, order_number, shipment_no, status, tracking_number,
 * created_at, updated_at, shipped_at, delivered_at, cancelled_at
 * (Mongo `_id` replaces MySQL `id`)
 */
const ShipmentsInvenzoSchema = new mongoose.Schema(
  {
    user_id: optionalString,
    /** Exist: int NOT NULL — order id / order_number used as order_id in service */
    order_id: { type: String, required: true, trim: true },
    order_number: optionalString,
    /** Exist: varchar(50) NOT NULL */
    shipment_no: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: false,
      enum: ["pending", "shipped", "delivered", "cancelled"],
      default: "pending",
      trim: true,
    },
    tracking_number: optionalString,
    created_at: optionalDate,
    updated_at: optionalDate,
    shipped_at: optionalDate,
    delivered_at: optionalDate,
    cancelled_at: optionalDate,
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "shipments_invenzo",
    strict: true,
  }
);

ShipmentsInvenzoSchema.index({ order_number: 1 }, { name: "order_number_relation" });
ShipmentsInvenzoSchema.index({ order_id: 1 }, { name: "order_id_relation" });
ShipmentsInvenzoSchema.index(
  { shipment_no: 1 },
  {
    unique: true,
    partialFilterExpression: { shipment_no: { $type: "string", $gt: "" } },
    name: "shipment_no_unique_nonempty",
  }
);

if (mongoose.models.shipments_invenzo) {
  delete mongoose.models.shipments_invenzo;
}

export default mongoose.model("shipments_invenzo", ShipmentsInvenzoSchema);
