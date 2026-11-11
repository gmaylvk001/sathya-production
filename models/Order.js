import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  cart_id: { type: String, required: true },
  user_adddeliveryid: { type: String, required: true },
  order_username: { type: String, required: true },
  order_phonenumber: { type: String, required: true },
  order_items: [{
    item_code: String,
    product_id: String,
    product_name: String,
    product_price: Number,
    model: String,
    quantity: Number,
    coupondiscount: Number,
    store_id: String,
  }],
  order_amount: { type: Number, required: true },
  order_deliveryaddress: { type: String, required: true },
  payment_method: { type: String, required: true },
  payment_type: { type: String },
  order_status: { type: String, default: 'pending' },
  delivery_type: { type: String },
  payment_id: { type: String },
  order_number: { type: String, unique: true },
  appliedPaymentOffer: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
