const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  message: { type: String, required: true },
  feedbackId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ecom_feedback_infos",
      },
      contactId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ecom_contactx_infos",
      },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
