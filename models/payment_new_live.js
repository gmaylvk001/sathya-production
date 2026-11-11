import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };
const optionalDate = { type: Date, required: false, default: null };

const PaymentNewLiveSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "orders_new",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ecom_users_info",
    required: false,
    default: null,
  },
  exist_id: optionalString,
  order_number: optionalString,
  amount: { type: Number, required: false, default: null },
  status: optionalString,
  ModeType: optionalString,
  PaymentMode: optionalString,
  ModeReference: optionalString,
  ReferenceDate: optionalDate,
  ModeValue: optionalString,
  payment_id: optionalString,
  payment_date: optionalString,
  pinelab_plural_orderid: optionalString,
  pinelab_payment_id: optionalString,
  created_at: optionalDate,
  updated_at: optionalDate,
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  collection: "payment_new_live",
  strict: true,
});

PaymentNewLiveSchema.index(
  { orderId: 1 },
  {
    unique: true,
    name: "orderId_unique",
  }
);

PaymentNewLiveSchema.index(
  { userId: 1 },
  { name: "userId_relation" }
);

PaymentNewLiveSchema.index(
  { exist_id: 1 },
  {
    unique: true,
    partialFilterExpression: { exist_id: { $type: "string" } },
    name: "exist_id_unique_nonempty",
  }
);

PaymentNewLiveSchema.index(
  { payment_id: 1 },
  { name: "payment_id_relation" }
);

PaymentNewLiveSchema.index(
  { order_number: 1 },
  { name: "order_number_relation" }
);

if (mongoose.models.payment_new_live) {
  delete mongoose.models.payment_new_live;
}

export default mongoose.model("payment_new_live", PaymentNewLiveSchema);
