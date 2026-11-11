import mongoose from "mongoose";

const UseraddressSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName:{ type: String},
  businessName:{ type: String},
  country: { type: String},
  email:{ type: String},
  additionalInfo:{ type: String},
  address: { type: String, required: true},
  postCode: { type: String, required: true},
  locality: { type: String},
  city: { type: String, required: true},
  state: { type: String, required: true},
  landmark: { type: String},
  phonenumber: { type: String, required: true},
  altnumber: { type: String},
  gst_name: { type: String},
  gst_number: { type: String},
  
}, { timestamps: true });

export default mongoose.models.ecom_user_address_infos || mongoose.model("ecom_user_address_infos", UseraddressSchema);