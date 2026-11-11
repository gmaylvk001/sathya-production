import mongoose from "mongoose";

const ExistSathyaUserSchema = new mongoose.Schema({
  exist_id: {
    type: String,
    required: false,
    default: null,
    trim: true,
  },
  first_name: {
    type: String,
    required: false,
    default: null,
    trim: true,
  },
  last_name: {
    type: String,
    required: false,
    default: null,
    trim: true,
  },
  store_id: {
    type: String,
    required: false,
    default: null,
  },
  role_id: {
    type: String,
    required: false,
    default: null,
  },
  zone_id: {
    type: String,
    required: false,
    default: null,
  },
  email: {
    type: String,
    required: false,
    default: null,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: false,
    default: null,
  },
  remember_token: {
    type: String,
    required: false,
    default: null,
  },
  confirmed: {
    type: Number,
    required: false,
    default: null,
  },
  confirmation_code: {
    type: String,
    required: false,
    default: null,
  },
  provider: {
    type: String,
    required: false,
    default: null,
  },
  provider_id: {
    type: String,
    required: false,
    default: null,
  },
  avatar: {
    type: String,
    required: false,
    default: null,
  },
  avatar_original: {
    type: String,
    required: false,
    default: null,
  },
  notify_pincode: {
    type: String,
    required: false,
    default: null,
  },
  notify_status: {
    type: Number,
    required: false,
    default: 0,
  },
  logged_in: {
    type: Date,
    required: false,
    default: null,
  },
  created_at: {
    type: Date,
    required: false,
    default: null,
  },
  updated_at: {
    type: Date,
    required: false,
    default: null,
  },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});

ExistSathyaUserSchema.index(
  { email: 1, phone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $type: "string", $gt: "" },
      phone: { $type: "string", $gt: "" },
    },
    name: "email_phone_unique",
  }
);

if (mongoose.models.ecom_exist_sathya_users) {
  delete mongoose.models.ecom_exist_sathya_users;
}

const ExistSathyaUser = mongoose.model("ecom_exist_sathya_users", ExistSathyaUserSchema);

export async function ensureExistSathyaUserIndexes() {
  for (const name of ["email_1", "email_unique_nonempty"]) {
    try {
      await ExistSathyaUser.collection.dropIndex(name);
    } catch (error) {
      // Old unique email index may already be gone.
    }
  }
  try {
    await ExistSathyaUser.syncIndexes();
  } catch (error) {
    console.error("Exist sathya users index sync:", error.message);
  }
}

export default ExistSathyaUser;
