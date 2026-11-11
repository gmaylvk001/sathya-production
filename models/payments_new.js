import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };
const optionalDate = { type: Date, required: false, default: null };

const PaymentsNewSchema = new mongoose.Schema({
  exist_id: optionalString,
  order_id: optionalString,
  order_number: optionalString,
  user_id: optionalString,
  ModeType: optionalString,
  PaymentMode: optionalString,
  ModeReference: optionalString,
  ReferenceDate: optionalDate,
  status: optionalString,
  created_at: optionalDate,
  updated_at: optionalDate,
  ModeValue: optionalString,
  payment_id: optionalString,
  payment_date: optionalString,
  pinelab_plural_orderid: optionalString,
  pinelab_payment_id: optionalString,
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  collection: "payments_new",
  strict: true,
});

PaymentsNewSchema.index(
  { exist_id: 1 },
  {
    unique: true,
    partialFilterExpression: { exist_id: { $type: "string" } },
    name: "exist_id_unique_nonempty",
  }
);

PaymentsNewSchema.index(
  { order_id: 1 },
  { name: "order_id_relation" }
);

PaymentsNewSchema.index(
  { order_number: 1 },
  { name: "order_number_relation" }
);

PaymentsNewSchema.index(
  { payment_id: 1 },
  {
    unique: true,
    partialFilterExpression: { payment_id: { $type: "string", $gt: "" } },
    name: "payment_id_gateway_unique_nonempty",
  }
);

if (mongoose.models.payments_new) {
  delete mongoose.models.payments_new;
}

export default mongoose.model("payments_new", PaymentsNewSchema);
