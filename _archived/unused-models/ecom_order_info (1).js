import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
  user_id:{ type: String, required: true},
  order_username : { type: String, required: true },
  order_phonenumber: { type: String, required: true },
  email_address: { type: String, required: true },
  order_item: [{
    id: Number,
    name: String,
    price: Number
  }],
  order_details: [{
    item_code: String,
    product_id: Number,
    product_name: String,
    product_price: Number,
    model: String,
    user_id: String,
    coupondiscount: Number,
    created_at: Date,
    updated_at: Date,
    quantity: Number,
    store_id: String,
    orderNumber: String
  }],
   order_amount:{ type: String, required: true},
  order_deliveryaddress:{ type: String},
  payment_method:{ type: String},
  payment_type:{ type: String},
  delivery_type:{ type: String},
  payment_id:{ type: String},
  order_number:{ type: String, required: true},
  user_adddeliveryid:{ type: String},
  order_status: {
    type: String,
    enum: ["pending", "cancelled", "shipped"],
    default: "pending",
  },
  payment_status: {
    type: String,
    enum: ["paid", "pending"],
    default: "unpaid",
  }
},
  { timestamps: true }
);

export default mongoose.models.ecom_order_info || mongoose.model("ecom_order_info", OrderSchema);


