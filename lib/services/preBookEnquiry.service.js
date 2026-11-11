import * as yup from "yup";

// Shared schema for Phase 1 (frontend validation) and Phase 2 (backend validation)
export const preBookEnquirySchema = yup.object().shape({
  name: yup.string().required("Name is required").min(2, "Name is too short"),
  email: yup.string().email("Must be a valid email").required("Email is required"),
  mobile: yup.string().matches(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number").required("Mobile is required"),
  store_id: yup.string().required("Please select a store near you"),
  product_id: yup.string().required("Product is required"),
  honeypot: yup.string().max(0, "Invalid submission"), // Anti-spam
});

export const mockSubmitEnquiry = async (data) => {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Validate data
  const validated = await preBookEnquirySchema.validate(data, { abortEarly: false });
  
  // Phase 2 TODO: Replace this with actual DB save or API call
  console.log("MockPreBookEnquiryService: Received enquiry", validated);
  
  return {
    success: true,
    message: "Your enquiry has been submitted successfully. Our team will contact you soon.",
    data: validated,
  };
};

export const getMockStores = async () => {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    { id: "store-1", name: "Sathya Store - T Nagar, Chennai" },
    { id: "store-2", name: "Sathya Store - Anna Nagar, Chennai" },
    { id: "store-3", name: "Sathya Store - Coimbatore" },
    { id: "store-4", name: "Sathya Store - Madurai" },
  ];
};
