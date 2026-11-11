import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: function() {
      return !this.isCombo && !this.comboId;
    },
    default: null
  },
  isCombo: {
    type: Boolean,
    default: false
  },
  comboId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'comboOffer',
    default: null
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  price: {
    type: Number,
    required: true
  },
  actual_price: {
    type: Number,
    default: 0
  },
  item_code: {
    type: String,
    default: ""
  },
  isUnilet: {
    type: Boolean,
    default: false
  },
  vendor: {
    type: String,
    default: "sathya"
  },
  store_owner: {
    type: String,
    default: "sathya"
  },
  assignedVendor: {
    type: String,
    enum: ["UNILET", "SATHYA"],
    default: "SATHYA"
  },
  region: {
    type: String,
    default: "tamilnadu"
  },
  name: {
    type: String,
    required: true
  },
  image: {
    type: String
  },
  warranty: { type: Number, default: 0 },
  extendedWarranty: { type: Number, default: 0 },
  warrantyData: {
    item_no: { type: String, default: null },
    name: { type: String, default: null },
    title: { type: String, default: null },
    year: { type: Number, default: null },
    duration: { type: String, default: null },
    price: { type: Number, default: null },
  },
  variantValues: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  selectedVariant: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  color: {
    type: String,
    default: null,
  },
  upsells: [
    {
      name: String,
      price: Number,
    },
  ],
  exchangeOffer: {
    id: { type: String, default: null },
    title: { type: String, default: null },
    price: { type: Number, default: 0 },
    brand: { type: String, default: null },
    type: { type: String, default: null },
    condition: { type: String, default: null },
    model: { type: String, default: null },
    zone: { type: mongoose.Schema.Types.Mixed, default: null },
  },
}, { _id: false, strict: false });

const cartSchema = new mongoose.Schema({
  userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: undefined, // ⚡ important: undefined skips index
    },
    guestId: {
      type: String,
      default: undefined,
    },
  items: [cartItemSchema],
  totalItems: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ✅ Unique either on userId OR guestId
//cartSchema.index({ userId: 1 }, { unique: true, sparse: true });
//cartSchema.index({ guestId: 1 }, { unique: true, sparse: true });

// ✅ Unique either on userId OR guestId (with partial filter)
cartSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: true, $ne: null } } }
);
cartSchema.index(
  { guestId: 1 },
  { unique: true, partialFilterExpression: { guestId: { $exists: true, $ne: null } } }
);

/*
const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  totalItems: {
    type: Number,
    default: 0
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

*/

// Update totals before saving
cartSchema.pre('save', function(next) {
  this.totalItems = this.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  this.totalPrice = this.items.reduce((sum, item) => {
    const base = (item.price || 0) * (item.quantity || 1);
    const warranty = Number(item.warranty || 0);
    const extended = Number(
      item.extendedWarranty ||
      item.warrantyData?.amount ||
      item.warrantyData?.price ||
      0
    );
    const upsells = item.upsells?.reduce((uSum, u) => uSum + (u.price || 0), 0) || 0;
    const exchange = Number(item.exchangeOffer?.price || 0) * (item.quantity || 1);
    return sum + base + warranty + extended + upsells - exchange;
  }, 0);
  this.updatedAt = Date.now();
  next();
});

if (mongoose.models.ecom_cart_info) {
  delete mongoose.models.ecom_cart_info;
}
const Cart = mongoose.model('ecom_cart_info', cartSchema);
export default Cart;
