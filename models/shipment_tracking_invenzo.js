import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };

/**
 * Matches Exist MySQL `shipment_tracking_invenzo` columns:
 * id, shipment_id, location, status, message, created_at, tracking_updates
 * (Mongo `_id` replaces MySQL `id`)
 */
const ShipmentTrackingInvenzoSchema = new mongoose.Schema(
  {
    /** Exist: varchar(50) — links to shipments_invenzo.shipment_no */
    shipment_id: optionalString,
    /** Exist: varchar(100) NOT NULL */
    location: { type: String, required: true, trim: true },
    /** Exist: enum('shipped', 'in_transit', 'out_for_delivery') NOT NULL */
    status: {
      type: String,
      required: true,
      enum: ["shipped", "in_transit", "out_for_delivery"],
      trim: true,
    },
    message: optionalString,
    created_at: { type: Date, required: false, default: null },
    /** Exist: json — array of { location, status, time } updates */
    tracking_updates: { type: mongoose.Schema.Types.Mixed, required: false, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    collection: "shipment_tracking_invenzo",
    strict: true,
  }
);

ShipmentTrackingInvenzoSchema.index({ shipment_id: 1 }, { name: "shipment_id_relation" });

if (mongoose.models.shipment_tracking_invenzo) {
  delete mongoose.models.shipment_tracking_invenzo;
}

export default mongoose.model(
  "shipment_tracking_invenzo",
  ShipmentTrackingInvenzoSchema
);
