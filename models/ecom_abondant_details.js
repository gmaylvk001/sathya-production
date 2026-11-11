import mongoose from "mongoose";

const AbandonedSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    order_username: String,
    cart_items: { type: Array, required: true },
    total_amount: { type: Number, required: true },

    address: { type: Object, required: true },

    payment_status: {
        type: String,
        default: "payment_initialized"
    },

    payment_mode: String,
    payment_id: String,
    orderNumber: String,

    order_status: {
        type: String,
        default: "payment_initialized"
    },

    created_at: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.models.ecom_abondant_details ||
mongoose.model("ecom_abondant_details", AbandonedSchema);