import mongoose from "mongoose";

const ContactSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      
    },
    email_address: { 
      type: String, 
      required: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'] // Basic email regex validation
    },
    mobile_number: { 
      type: String, 
      required: true,
      match: [/^\d{10}$/, 'Please fill a valid 10-digit mobile number'] // Assuming a 10-digit mobile number
    },
    message: { 
      type: String, 
      required: true 
    },
    city: { 
      type: String, 
      required: true 
    },
    enquiry_type: {
      type: String,
      required: true
    },
    invoice_number: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default  mongoose.models.ecom_contactx_infos || mongoose.model("ecom_contactx_infos", ContactSchema);
