"use client";
import { useEffect, useState } from "react";
import {FaPhoneAlt,FaEnvelope,FaCheck,FaGift,FaBolt,FaChevronDown,FaChevronUp,FaBriefcase,FaHandshake,
  FaUserTie,
  FaTruck,
  FaShieldAlt,
FaAward,
  FaStore,
  FaUsers,
  FaTags,
  FaBuilding, } from "react-icons/fa";
  import {
  Gift,
  FileText,
  ShieldCheck,
  Truck,
  Headphones,
  BedDouble,
  Building2,
  Construction,
  GraduationCap,
  ShoppingCart,
  Cross,
  Video
} from "lucide-react";
  import Image from "next/image";
import { useModal } from "@/context/ModalContext";
export default function BulkOrdersAndGiftCardEnquiry() {
    const { openLiveDemoModal } = useModal();
    const [form, setForm] = useState({
        company_name: "",
        name: "",
        mobile_number: "",
        email_address: "",
        city: "",
        business_type: "",
        requirement_category: "",
        gst_number: "",
        contact_method: "",
        /* address: "",
        landmark: "",
        state:"",
        pincode: "",
        product_name: "",
        product_quantity: "", */
        _hp: "",
    });
    const [products, setProducts] = useState([
        { product_name: "", product_quantity: "" },
    ]);
    const [formLoadTime] = useState(() => Date.now());
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [responseMsg, setResponseMsg] = useState("");
    const [touched, setTouched] = useState({});
    const handleBlur = (e) => {
        setTouched({ ...touched, [e.target.name]: true });
    };
 
    // Add new row
const addProductRow = () => {
  setProducts([
    ...products,
    { product_name: "", product_quantity: "" },
  ]);
};

// Handle product change
const handleProductChange = (index, field, value) => {
  const updatedProducts = [...products];
  updatedProducts[index][field] = value;
  setProducts(updatedProducts);
};
// Remove row
const removeProductRow = (index) => {
  const updatedProducts = products.filter((_, i) => i !== index);
  setProducts(updatedProducts);
};

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "mobile_number") {
            const digits = value.replace(/\D/g, "").slice(0, 10);
            setForm({ ...form, [name]: digits });
            setTouched(prev => ({ ...prev, mobile_number: true }));
            if (!digits) {
                setErrors(prev => ({ ...prev, mobile_number: "" }));
            } else if (!/^[6-9]\d{9}$/.test(digits)) {
                setErrors(prev => ({ ...prev, mobile_number: "Invalid Mobile Number" }));
            } else {
                setErrors(prev => { const { mobile_number: _, ...rest } = prev; return rest; });
            }
        } else {
            setForm({ ...form, [name]: value });
        }
    };
    const validate = () => {
        const newErrors = {};
        if (!form.name.trim()) newErrors.name = "Name is required";
        if (!form.company_name.trim()) newErrors.company_name = "Company Name is required";
        if (!form.email_address.trim()) {
            newErrors.email_address = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(form.email_address)) {
            newErrors.email_address = "Email is invalid";
        }
        if (!form.mobile_number.trim()) {
            newErrors.mobile_number = "";
        } else if (!/^[6-9]\d{9}$/.test(form.mobile_number)) {
            newErrors.mobile_number = "Invalid Mobile Number";
        }
        if (!form.city.trim()) newErrors.city = "City is required";
        if (!form.business_type.trim()) newErrors.business_type = "Business Type is required";
        if (!form.requirement_category.trim()) newErrors.requirement_category = "Requirement category is required";
        /* if (!form.address.trim()) newErrors.address = "Address is required";
        if (!form.landmark.trim()) newErrors.landmark = "Landmark is required";
        if (!form.state.trim()) newErrors.state = "State is required";
        if (!form.pincode.trim()) newErrors.pincode = "Pincode is required";
        if (!form.product_name.trim()) newErrors.product_name = "Product is required";
        if (!form.product_quantity.trim()) newErrors.product_quantity = "Qty is required"; */

        // Product Validation
  const productErrors = [];

  products.forEach((product, index) => {
    const itemError = {};

    // Product Name
    if (!product.product_name.trim()) {
      itemError.product_name = "Product is required";
    }

    // Product Quantity
    if (!product.product_quantity.toString().trim()) {
      itemError.product_quantity = "Qty is required";
    }

    if (Object.keys(itemError).length > 0) {
      productErrors[index] = itemError;
    }
  });

  if (productErrors.length > 0) {
    newErrors.products = productErrors;
  }

        return newErrors;
    };


    
    const handleSubmit = async (e) => {
        e.preventDefault();
        const allTouched = Object.keys(form).reduce((acc, key) => ({ ...acc, [key]: true }), {});
        setTouched(allTouched);
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        // Honeypot check — bots fill hidden fields, humans don't
        if (form._hp) return;

        // Timing check — bots submit too fast
        if (Date.now() - formLoadTime < 3000) {
            setResponseMsg("Please take a moment before submitting.");
            return;
        }
        setLoading(true);
        setResponseMsg("");

        try {
            const res = await fetch("/api/bulk-orders-and-gift-card-enquiry/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // body: JSON.stringify(form),
                body: JSON.stringify({
                    ...form,
                    product_name_and_quantity: products,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                const contact = data.data;
                const productsDetails = contact.product_name_and_quantity
                ?.map(
                    (item) =>
                    `${item.product_name} - ${item.product_quantity}`
                )
                .join("<br/>");
                const adminemailFormData = new FormData();
                adminemailFormData.append("campaign_id", "9d517b62-99ab-455b-a23a-84211c07adce");
                adminemailFormData.append(
                    "params",
                    JSON.stringify([contact.name,contact.company_name,contact.email_address,contact.mobile_number,contact.city,contact.business_type,contact.requirement_category,contact.gst_number,contact.contact_method,productsDetails])
                );
                const emailadmin = ["arunkarthik@sathya.store","rajesh@sathya.store","customercare@sathya.store"];
                // const emailadmin = ["sorambeeviuit@gmail.com"];
                emailadmin.forEach(async (emailadmin) => {
                    adminemailFormData.set("email", emailadmin);
                    let adminresponse = { ok: true, status: 200, json: async () => ({ success: true, message: 'Disabled' }), text: async () => '{}' };
                    let adminData = await adminresponse.json();
                });
                setResponseMsg("Message sent successfully!");
                setForm({ company_name: "", name: "",  email_address: "", mobile_number: "", city: "", business_type:"", requirement_category: "", gst_number: "", contact_method: "", _hp: "" });
                // setForm({ name: "", company_name: "", email_address: "", mobile_number: "", address:"", landmark: "", city: "", state:"", pincode: "", _hp: "" });
                setProducts([
                    { product_name: "", product_quantity: "" },
                ]);
                setErrors({});
                setTouched({});

                // Clear message after 2 seconds
                setTimeout(() => {
                setResponseMsg("");
                }, 2000);
            } else {
                setResponseMsg(data.message || "Something went wrong");
            }
        } catch (error) {
            // setResponseMsg("Server error");
            setResponseMsg("Something went wrong. Please check your details and try again.");
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full border rounded-md px-3 py-2 focus:outline-none";
    return (
        <>
            {/* HERO SECTION EXACT DESIGN */}
            <section className="relative overflow-hidden bg-gradient-to-r from-[#02122f] via-[#041f52] to-[#0b4aa2]">
                {/* OVERLAY */}
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative w-full px-4 md:px-8 py-8 lg:py-5">
                    <div className="flex flex-col lg:flex-row items-center gap-8">
                        {/* LEFT CONTENT - 30% */}
                        <div className="w-full lg:w-[40%] text-white">
                            <h1 className="text-3xl sm:text-4xl lg:text-[32px] font-extrabold leading-[1.05] mb-3">
                                Bulk Order & <br />Corporate Solutions
                            </h1>

                            <p className="text-base sm:text-lg text-gray-200 leading-8 mb-4">Looking for bulk electronics, appliances, corporate gifting, or institutional purchases?</p>

                            <p className="text-[16px] md:text-[18px] text-gray-300 leading-8 mb-8">Sathya Stores Corporate Solutions provides dedicated pricing, product consultation, delivery coordination, and after-sales support for businesses across Tamil Nadu.</p>

                            {/* BUTTONS */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                {/* CORPORATE BUTTON */}
<button
  onClick={() => {
    const form = document.getElementById("corporate-pricing-form");

    if (form) {
      const y =
        form.getBoundingClientRect().top + window.pageYOffset - 200; // header height

      window.scrollTo({
        top: y,
        behavior: "smooth",
      });
    }
  }}
  className="flex items-center gap-3 bg-[#ff7b22] hover:bg-[#ff8f3c] transition-all duration-300 text-white font-semibold text-[15px] px-8 py-4 rounded-xl shadow-[0_10px_30px_rgba(255,123,34,0.35)] whitespace-nowrap"
>
  <FaBriefcase className="text-[18px]" />
  <span>Get Corporate Pricing</span>
</button>
                            </div>
                        </div>

                        {/* RIGHT IMAGE */}
<div className="w-full lg:w-[70%] flex items-stretch">
    <img
        src="/uploads/B2B.webp"
        alt="Corporate Solutions"
        className="block w-full"
    />
</div>
                        {/* <div className="w-full lg:w-[60%] self-stretch">
                            <img src="/uploads/B2B.webp" alt="Corporate Solutions" className="w-full h-full object-fill"/>
                        </div> */}
                    </div>
                </div>
            </section>

            {/* SOLUTIONS SECTION */}
            <section className="w-full max-w-full sm:max-w-[720px] md:max-w-[960px] lg:max-w-[1320px] xl:max-w-[1520px] 2xl:max-w-[1680px] mx-auto px-0 sm:px-3 md:px-6 lg:px-8 mt-10 md:mt-14 lg:mt-16">
                <div className="max-w-12xl mx-auto px-4 md:px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
                        {/* LEFT CONTENT */}
                        <div>
                            <p className="text-[#d72828] uppercase tracking-[3px] font-bold text-sm mb-4">Complete Electronics & Appliance Solutions</p>
                            <h2 className="text-[34px] md:text-[34px] font-extrabold text-[#081028] leading-[1.1] mb-4">Solutions Built for <br />Businesses Like Yours</h2>
                            <div className="space-y-3 text-gray-600 leading-8 text-[17px]">
                            <p>
                                Sathya Stores Corporate Solutions helps businesses, institutions,
                                hotels, builders, offices, and retailers fulfil bulk
                                electronics and appliance requirements with ease.
                            </p>
                            <p>
                                From product consultation and quotation support to delivery
                                coordination and after-sales service, our dedicated B2B
                                team ensures a smooth and reliable experience for every
                                business order.
                            </p>
                            <p>
                                Whether you require a single category or multi-brand bulk
                                purchases, Sathya Stores offers competitive pricing, GST billing,
                                and trusted support across Tamil Nadu.
                            </p>
                            </div>
                        </div>

                        {/* RIGHT FEATURE BOX */}
                        <div className="bg-[#f8fbff] border border-[#dce8ff] rounded-[30px] p-5 md:p-8 shadow-sm">
                            <div className="space-y-6">
                                {/* ITEM */}
                                <div className="flex gap-5 items-start">
                                    <div className="w-[70px] h-[70px] rounded-[22px] bg-[#edf4ff] flex items-center justify-center shrink-0">
                                        <FaHandshake className="text-[#d72828] text-[30px]" />
                                    </div>
                                    <div>
                                        <h3 className="text-[20px] font-bold text-[#081028] mb-2 leading-tight">
                                        Best Pricing
                                        </h3>

                                        <p className="text-gray-600 leading-7 text-[16px]">
                                        Competitive bulk pricing for all your business needs.
                                        </p>
                                    </div>
                                </div>

                                {/* ITEM */}
                                <div className="flex gap-5 items-start">
                                    <div className="w-[70px] h-[70px] rounded-[22px] bg-[#edf4ff] flex items-center justify-center shrink-0">
                                        <FaUserTie className="text-[#d72828] text-[30px]" />
                                    </div>

                                    <div>
                                        <h3 className="text-[20px] font-bold text-[#081028] mb-2 leading-tight">
                                        Expert Consultation
                                        </h3>

                                        <p className="text-gray-600 leading-7 text-[16px]">
                                        Get the right products with our expert guidance.
                                        </p>
                                    </div>
                                </div>

                                {/* ITEM */}
                                <div className="flex gap-5 items-start">
                                    <div className="w-[70px] h-[70px] rounded-[22px] bg-[#edf4ff] flex items-center justify-center shrink-0">
                                        <FaTruck className="text-[#d72828] text-[30px]" />
                                    </div>
                                    <div>
                                        <h3 className="text-[20px] font-bold text-[#081028] mb-2 leading-tight">
                                        On-Time Delivery
                                        </h3>

                                        <p className="text-gray-600 leading-7 text-[16px]">
                                        Timely delivery and installation across Tamil Nadu.
                                        </p>
                                    </div>
                                </div>

                                {/* ITEM */}
                                <div className="flex gap-5 items-start">
                                    <div className="w-[70px] h-[70px] rounded-[22px] bg-[#edf4ff] flex items-center justify-center shrink-0">
                                        <FaShieldAlt className="text-[#d72828] text-[30px]" />
                                    </div>
                                    <div>
                                        <h3 className="text-[20px] font-bold text-[#081028] mb-2 leading-tight">
                                        After-Sales Support
                                        </h3>

                                        <p className="text-gray-600 leading-7 text-[16px]">
                                        Reliable after-sales service and dedicated support.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CORPORATE SERVICES */}
            <section className="w-full max-w-full sm:max-w-[720px] md:max-w-[960px] lg:max-w-[1320px] xl:max-w-[1520px] 2xl:max-w-[1680px] mx-auto px-4 md:px-6 lg:px-8 py-10">
                <div className="max-w-12xl mx-auto px-4 md:px-6">
                    <h2 className="text-[30px] font-extrabold text-center text-[#081028] mb-5">Our Corporate Services</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
                        {/* CARD */}
                        <div className="bg-white border border-gray-200 rounded-[28px] p-8 text-center hover:shadow-xl transition-all duration-300">
                            <div className="w-14 h-14 rounded-[28px] bg-[#edf4ff] flex items-center justify-center text-[#d72828] text-3xl mx-auto mb-2">
                                <FaCheck />
                            </div>

                            <h3 className="text-[20px] font-bold text-[#081028] mb-4">Corporate Bulk Orders</h3>
                            <p className="text-gray-600 leading-8 text-[16px]">Best pricing and dedicated support for offices, institutions, builders, resellers, and enterprise purchases.
                            </p>
                        </div>

                        {/* CARD */}
                        <div className="bg-white border border-gray-200 rounded-[28px] p-8 text-center hover:shadow-xl transition-all duration-300">
                            <div className="w-14 h-14 rounded-[28px] bg-[#edf4ff] flex items-center justify-center text-[#d72828] text-3xl mx-auto mb-2">
                                <FaGift />
                            </div>
                            <h3 className="text-[20px] font-bold text-[#081028] mb-4">Employee & Festival Gifting</h3>
                            <p className="text-gray-600 leading-8 text-[16px]">Customized gifting solutions for employees, dealers, customers, and festive campaigns.</p>
                        </div>

                        {/* CARD */}
                        <div className="bg-white border border-gray-200 rounded-[28px] p-8 text-center hover:shadow-xl transition-all duration-300">
                            <div className="w-14 h-14 rounded-[28px] bg-[#edf4ff] flex items-center justify-center text-[#d72828] text-3xl mx-auto mb-2">
                                <FaBolt />
                            </div>
                            <h3 className="text-[20px] font-bold text-[#081028] mb-4">Institutional Requirements</h3>
                            <p className="text-gray-600 leading-8 text-[16px]">Solutions for hotels, offices, schools, hospitals, apartments, and commercial projects.</p>
                        </div>

                        {/* CARD */}
                        <div className="bg-white border border-gray-200 rounded-[28px] p-8 text-center hover:shadow-xl transition-all duration-300">
                            <div className="w-14 h-14 rounded-[28px] bg-[#edf4ff] flex items-center justify-center text-[#d72828] text-3xl mx-auto mb-2">
                                <FaPhoneAlt />
                            </div>
                            <h3 className="text-[20px] font-bold text-[#081028] mb-4">Dedicated B2B Support</h3>
                            <p className="text-gray-600 leading-8 text-[16px]">From quotation to delivery and installation, our corporate team ensures smooth coordination.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* TRUSTED BUSINESSES SECTION */}
            <section className="w-full max-w-full sm:max-w-[720px] md:max-w-[960px] lg:max-w-[1320px] xl:max-w-[1520px] 2xl:max-w-[1680px] mx-auto px-4 md:px-6 py-10">
                <div className="max-w-12xl mx-auto px-4 md:px-6">
                    {/* TITLE */}
                    <h2 className="text-[34px] md:text-[32px] font-extrabold text-center text-[#081028] mb-2">Trusted by Businesses Across Tamil Nadu</h2>

                    {/* SUBTEXT */}
                    <p className="text-center text-gray-600 text-[16px] md:text-[18px] leading-8 max-w-4xl mx-auto mb-7">Supporting corporate offices, institutions, hospitality projects, retailers, and enterprise clients with bulk electronics and appliance solutions.</p>

                    {/* INDUSTRIES */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-8">
  
  <div className="flex flex-col items-center text-center">
    <BedDouble size={56} strokeWidth={1.8} className="text-[#d72828] mb-3" />
    <h3 className="text-sm font-semibold text-[#081028] whitespace-nowrap">Hotels</h3>
  </div>

  <div className="flex flex-col items-center text-center">
    <Building2 size={56} strokeWidth={1.8} className="text-[#d72828] mb-3" />
    <h3 className="text-sm font-semibold text-[#081028] whitespace-nowrap">Offices</h3>
  </div>

  <div className="flex flex-col items-center text-center">
    <Construction size={56} strokeWidth={1.8} className="text-[#d72828] mb-3" />
    <h3 className="text-sm font-semibold text-[#081028] whitespace-nowrap">Builders</h3>
  </div>

  <div className="flex flex-col items-center text-center">
    <GraduationCap size={56} strokeWidth={1.8} className="text-[#d72828] mb-3" />
    <h3 className="text-sm font-semibold text-[#081028] whitespace-nowrap">Schools & Colleges</h3>
  </div>

  <div className="flex flex-col items-center text-center">
    <ShoppingCart size={56} strokeWidth={1.8} className="text-[#d72828] mb-3" />
    <h3 className="text-sm font-semibold text-[#081028] whitespace-nowrap">Retail Chains</h3>
  </div>

  <div className="flex flex-col items-center text-center">
    <Cross size={56} strokeWidth={1.8} className="text-[#d72828] mb-3" />
    <h3 className="text-sm font-semibold text-[#081028] whitespace-nowrap">Hospitals</h3>
  </div>

</div>
                    
                    {/* WHY CHOOSE + BRANDS */}
                    <div className="bg-[#f8fbff] border border-[#dce8ff] rounded-[32px] p-6 md:p-10 mb-5">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-10 items-center">
                            {/* LEFT */}
                            <div>
                                <h2 className="text-[32px] md:text-[30px] font-extrabold text-[#081028] mb-8">Why Businesses Choose Sathya Stores</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
                                    <div className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full bg-[#d72828] text-white flex items-center justify-center text-[13px] shrink-0 mt-1">✓</span>
                                        <p className="text-gray-700 text-[16px]">Competitive Bulk Pricing</p>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full bg-[#d72828] text-white flex items-center justify-center text-[13px] shrink-0 mt-1">✓</span>
                                        <p className="text-gray-700 text-[16px]">Delivery Across Tamil Nadu</p>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full bg-[#d72828] text-white flex items-center justify-center text-[13px] shrink-0 mt-1">✓</span>
                                        <p className="text-gray-700 text-[16px]">Multi-Brand Availability</p>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full bg-[#d72828] text-white flex items-center justify-center text-[13px] shrink-0 mt-1">✓</span>
                                        <p className="text-gray-700 text-[16px]">Installation & After-Sales Support</p>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full bg-[#d72828] text-white flex items-center justify-center text-[13px] shrink-0 mt-1">✓</span>
                                        <p className="text-gray-700 text-[16px]">Dedicated Relationship Manager</p>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full bg-[#d72828] text-white flex items-center justify-center text-[13px] shrink-0 mt-1">✓</span>
                                        <p className="text-gray-700 text-[16px]">Trusted Retail Network</p>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full bg-[#d72828] text-white flex items-center justify-center text-[13px] shrink-0 mt-1">✓</span>
                                        <p className="text-gray-700 text-[16px]">GST Billing Available</p>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full bg-[#d72828] text-white flex items-center justify-center text-[13px] shrink-0 mt-1">✓</span>
                                        <p className="text-gray-700 text-[16px]">Fast Quotation & Processing</p>
                                    </div>
                                </div>
                            </div>

                            {/* CENTER LINE */}
                            <div className="hidden lg:block w-[1px] h-full bg-[#dce8ff]"></div>

                            {/* RIGHT BRANDS */}
                            <div>
                                <h3 className="text-[24px] font-bold text-[#081028] mb-8 text-center">Authorized Multi-Brand Partner</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                    <div className="flex items-center justify-center">
                                        <Image src="/uploads/Brands/brand_1778758654308.png" alt="LG" width={160} height={80} className="w-full h-[50px] object-contain"/>
                                    </div>

                                    <div className="flex items-center justify-center">
                                        <Image src="/uploads/Brands/brand_1778764524439.png" alt="Samsung" width={160} height={80} className="w-full h-[50px] object-contain"/>
                                    </div>

                                    <div className="flex items-center justify-center">
                                        <Image src="/uploads/Brands/brand_1778994553980.png" alt="Sony" width={160} height={80} className="w-full h-[50px] object-contain"/>
                                    </div>

                                    <div className="flex items-center justify-center">
                                        <Image src="/uploads/Brands/brand_1778996291806.png" alt="Bosch" width={160} height={80} className="w-full h-[50px] object-contain"/>
                                    </div>

                                    <div className="flex items-center justify-center">
                                        <Image src="/uploads/Brands/panasonic.jpg" alt="Panasonic" width={160} height={80} className="w-full h-[50px] object-contain"/>
                                    </div>

                                    <div className="flex items-center justify-center">
                                        <Image src="/uploads/Brands/brand-1754720247059.webp" alt="Daikin" width={160} height={80} className="w-full h-[50px] object-contain"/>
                                    </div>

                                    <div className="flex items-center justify-center">
                                        <Image src="/uploads/Brands/brand_1779078793650.png" alt="Whirlpoal" width={160} height={80} className="w-full h-[50px] object-contain"/>
                                    </div>

                                    <div className="flex items-center justify-center">
                                        <Image src="/uploads/Brands/brand-1764827997326.webp" alt="Apple" width={160} height={80} className="w-full h-[50px] object-contain"/>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Corporate Procurement Support */}
                        <div className="my-8 md:my-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                            <div>
                                <h2 className="text-[28px] md:text-[34px] font-extrabold text-[#081028] leading-tight mb-3">
                                    Corporate Procurement Support
                                </h2>
                                <p className="text-gray-600 text-[15px] md:text-[16px] leading-7 mb-1">
                                    Need to evaluate multiple products before placing a bulk order?
                                </p>
                                <p className="text-gray-600 text-[15px] md:text-[16px] leading-7 mb-6">
                                    Schedule a dedicated video meeting with our B2B team.
                                </p>
                                <ul className="space-y-3 mb-8">
                                    {[
                                        "Product demonstrations",
                                        "Bulk pricing discussion",
                                        "Brand comparison",
                                        "Commercial quotations",
                                        "Installation planning",
                                    ].map((item) => (
                                        <li key={item} className="flex items-center gap-3 text-[#081028] text-[15px] md:text-[16px]">
                                            <FaCheck className="text-[#1e3a5f] shrink-0" size={14} />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    type="button"
                                    onClick={openLiveDemoModal}
                                    className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto min-w-[280px] px-6 py-3.5 rounded-xl bg-[#5B4CF5] hover:bg-[#4a3de0] text-white font-semibold text-[14px] md:text-[15px] transition-colors shadow-sm"
                                >
                                    Schedule Corporate Sathya Stores Live Meeting
                                    <Video className="w-5 h-5" strokeWidth={2} />
                                </button>
                            </div>
                            <div className="order-first lg:order-last flex justify-center lg:justify-end">
                                <Image
                                    src="/uploads/live-video-phone.png"
                                    alt="Corporate Sathya Stores Live Meeting"
                                    width={370}
                                    height={495}
                                    className="w-[370px] h-[495px] max-w-full object-contain"
                                />
                            </div>
                        </div>

                        {/* TOP LINE */}
                        <div className="w-full h-[1px] bg-[#dce8ff] my-3"></div>

                        {/* CONTACT SECTION */}
                        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr]">
                            {/* LEFT CONTENT */}
                            <div className="bg-[#f8fbff] p-1 md:p-1 border-[#dce8ff]">
                                <p className="text-[#d72828] uppercase tracking-[2px] text-sm font-bold mb-4">Contact Our Corporate Team</p>
                                <h2 className="text-[24px] leading-[1.5] font-extrabold text-[#081028] mb-2">Share Your Requirements<br />We'll Take Care of the Rest</h2>
                                <p className="text-gray-600 leading-6 text-[15px] mb-2">Fill in your business requirements and our corporate solutions team will get in touch with you shortly.</p>

                                {/* FEATURES */}
                                <div className="space-y-7">
                                    {/* ITEM */}
                                    <div className="flex gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-[#edf4ff] text-[#d72828] flex items-center justify-center text-2xl shrink-0">⚡</div>
                                        <div>
                                            <h3 className="font-bold text-[#081028] text-[15px] mb-1">Quick Response</h3>
                                            <p className="text-gray-600 text-[15px]">We respond within 24 hours</p>
                                        </div>
                                    </div>

                                    {/* ITEM */}
                                    <div className="flex gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-[#edf4ff] text-[#d72828] flex items-center justify-center text-2xl shrink-0">🎧</div>
                                        <div>
                                            <h3 className="font-bold text-[#081028] text-[15px] mb-1">Dedicated Support</h3>
                                            <p className="text-gray-600 text-[15px]">One point of contact for all your needs</p>
                                        </div>
                                    </div>

                                    {/* ITEM */}
                                    <div className="flex gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-[#edf4ff] text-[#d72828] flex items-center justify-center text-2xl shrink-0">🔒</div>
                                        <div>
                                            <h3 className="font-bold text-[#081028] text-[15px] mb-1">Secure & Reliable</h3>
                                            <p className="text-gray-600 text-[15px]">Your information is 100% safe with us</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT FORM */}
                            <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-md">
                                <form onSubmit={handleSubmit} id="corporate-pricing-form" className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    {/* Full Name */}
                                    <div>
                                        <label className="block text-sm font-semibold mb-2 text-gray-700">
                                            Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={form.name}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            placeholder="Enter your name"
                                            className={`${inputClass} h-12 rounded-xl border bg-gray-50 ${
                                                errors.name && touched.name
                                                    ? "border-red-500"
                                                    : "border-gray-300"
                                            }`}
                                        />
                                        {errors.name && touched.name && (
                                            <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                                        )}
                                    </div>

                                    {/* Company Name */}
                                    <div>
                                        <label className="block text-sm font-semibold mb-2 text-gray-700">
                                            Company Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="company_name"
                                            value={form.company_name}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            placeholder="Enter company name"
                                            className={`${inputClass} h-12 rounded-xl border bg-gray-50 ${
                                                errors.company_name && touched.company_name
                                                    ? "border-red-500"
                                                    : "border-gray-300"
                                            }`}
                                        />
                                        {errors.company_name && touched.company_name && (
                                            <p className="text-red-500 text-sm mt-1">
                                                {errors.company_name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Mobile Number */}
                                    <div>
                                        <label className="block text-sm font-semibold mb-2 text-gray-700">
                                            Mobile Number *
                                        </label>
                                        <input
                                            type="text"
                                            name="mobile_number"
                                            value={form.mobile_number}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            maxLength={10}
                                            placeholder="Enter mobile number"
                                            className={`${inputClass} h-12 rounded-xl border bg-gray-50 ${
                                                errors.mobile_number && touched.mobile_number
                                                    ? "border-red-500"
                                                    : "border-gray-300"
                                            }`}
                                        />
                                        {errors.mobile_number && touched.mobile_number && (
                                            <p className="text-red-500 text-sm mt-1">
                                                {errors.mobile_number}
                                            </p>
                                        )}
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-sm font-semibold mb-2 text-gray-700">
                                            Email Address *
                                        </label>
                                        <input
                                            type="email"
                                            name="email_address"
                                            value={form.email_address}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            placeholder="Enter email address"
                                            className={`${inputClass} h-12 rounded-xl border bg-gray-50 ${
                                                errors.email_address && touched.email_address
                                                    ? "border-red-500"
                                                    : "border-gray-300"
                                            }`}
                                        />
                                        {errors.email_address && touched.email_address && (
                                            <p className="text-red-500 text-sm mt-1">
                                                {errors.email_address}
                                            </p>
                                        )}
                                    </div>

                                    {/* City */}
                                    <div>
                                        <label className="block text-sm font-semibold mb-2 text-gray-700">
                                            City *
                                        </label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={form.city}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            placeholder="Enter city"
                                            className={`${inputClass} h-12 rounded-xl border bg-gray-50 ${
                                                errors.city && touched.city
                                                    ? "border-red-500"
                                                    : "border-gray-300"
                                            }`}
                                        />
                                        {errors.city && touched.city && (
                                            <p className="text-red-500 text-sm mt-1">{errors.city}</p>
                                        )}
                                    </div>

                                    {/* Business Type */}
                                    <div>
                                        <label className="block text-sm font-semibold mb-2 text-gray-700">Business Type *</label>
                                                            <select name="business_type" value={form.business_type} onChange={handleChange} onBlur={handleBlur} className={`${inputClass} h-12 rounded-xl border bg-gray-50 focus:bg-white transition-all ${
                                                                errors.business_type && touched.business_type
                                                                    ? "border-red-500"
                                                                    : "border-gray-300"
                                                                }`}
                                                            >
                                                                <option value="">Select Business Type</option>
                                                                <option value="Corporate Office">Corporate Office</option>
                                                                <option value="Dealer / Reseller">Dealer / Reseller</option>
                                                                <option value="Builder / Contractor">Builder / Contractor</option>
                                                                <option value="Institution">Institution</option>
                                                                <option value="Hotel / Hospitality">Hotel / Hospitality</option>
                                                                <option value="Retail Business">Retail Business</option>
                                                                <option value="Government">Government</option>
                                                                <option value="Others">Others</option>
                                                            </select>
                                                            {errors.business_type && touched.business_type && (
                                                                <p className="text-red-500 text-sm mt-1">
                                                                {errors.business_type}
                                                                </p>
                                                            )}
                                    </div>

                                    {/* Requirement Category + GST Number */}
                                    <div className="md:col-span-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                            {/* Requirement Category */}
                                            <div>
                                                <label className="block text-sm font-semibold mb-2 text-gray-700">
                                                    Requirement Category *
                                                </label>

                                                <select
                                                    name="requirement_category"
                                                    value={form.requirement_category}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    className={`${inputClass} h-12 rounded-xl border bg-gray-50 focus:bg-white transition-all ${
                                                        errors.requirement_category &&
                                                        touched.requirement_category
                                                            ? "border-red-500"
                                                            : "border-gray-300"
                                                    }`}
                                                >
                                                    <option value="">Select Requirement Category</option>
                                                    <option value="Air Conditioners">Air Conditioners</option>
                                                    <option value="Televisions">Televisions</option>
                                                    <option value="Refrigerators">Refrigerators</option>
                                                    <option value="Washing Machines">Washing Machines</option>
                                                    <option value="Mobiles">Mobiles</option>
                                                    <option value="Kitchen Appliances">Kitchen Appliances</option>
                                                    <option value="Corporate Gifting">Corporate Gifting</option>
                                                    <option value="Multi-Category Requirement">
                                                        Multi-Category Requirement
                                                    </option>
                                                </select>

                                                {errors.requirement_category &&
                                                    touched.requirement_category && (
                                                        <p className="text-red-500 text-sm mt-1">
                                                            {errors.requirement_category}
                                                        </p>
                                                    )}
                                            </div>

                                            {/* GST Number */}
                                            <div>
                                                <label className="block text-sm font-semibold mb-2 text-gray-700">
                                                    GST Number (Optional)
                                                </label>

                                                <input
                                                    type="text"
                                                    name="gst_number"
                                                    value={form.gst_number}
                                                    onChange={handleChange}
                                                    placeholder="Enter GST Number"
                                                    className={`${inputClass} h-12 rounded-xl border border-gray-300 bg-gray-50`}
                                                />
                                            </div>

                                        </div>
                                    </div>

                                    {/* Multiple Products */}
                                    <div className="md:col-span-3">
                                        {products.map((product, index) => (
                                                                    <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-4 items-end">
                                                                        {/* Product Name */}
                                                                        <div>
                                                                            <label className="block text-sm font-semibold mb-2 text-gray-700">Product / Requirement</label>
                                                                            <input type="text" placeholder="Enter product name" value={product.product_name} onChange={(e) =>handleProductChange(
                                                                                index,
                                                                                "product_name",
                                                                                e.target.value
                                                                            )}
                                                                            className={`w-full h-12 rounded-2xl border bg-gray-50 px-4 focus:outline-none focus:bg-white ${
                                                                            errors.products?.[index]?.product_name
                                                                                ? "border-red-500"
                                                                                : "border-gray-300"
                                                                            }`}/>
                                                                            {errors.products?.[index]?.product_name && (
                                                                                <p className="text-red-500 text-sm mt-1">
                                                                                {errors.products[index].product_name}
                                                                                </p>
                                                                            )}
                                                                        </div>

                                                                        {/* Product Quantity */}
                                                                        <div>
                                                                            <label className="block text-sm font-semibold mb-2 text-gray-700">Approx Quantity *</label>
                                                                            <input type="number" placeholder="Enter quantity" value={product.product_quantity} onChange={(e) =>handleProductChange(
                                                                                index,
                                                                                "product_quantity",
                                                                                e.target.value
                                                                            )}
                                                                            className={`w-full h-12 rounded-2xl border bg-gray-50 px-4 focus:outline-none focus:bg-white ${
                                                                            errors.products?.[index]?.product_quantity
                                                                                ? "border-red-500"
                                                                                : "border-gray-300"
                                                                            }`}/>
                                                                            {errors.products?.[index]?.product_quantity && (
                                                                                <p className="text-red-500 text-sm mt-1">
                                                                                {errors.products[index].product_quantity}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        
                                                                        {/* Add Button */}
                                                                        <button type="button" onClick={addProductRow} className="h-12 w-12 rounded-xl bg-[#d72828] text-white text-2xl flex items-center justify-center">+</button>
                                                                        {/* Delete Button */}
                                                                        {products.length > 1 && (
                                                                            <button type="button" onClick={() => removeProductRow(index)} className="h-12 w-12 rounded-2xl bg-red-500 text-white text-3xl flex items-center justify-center">×</button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                    </div>

                                    {/* Preferred Contact Method */}
                                    <div className="md:col-span-3">
                                        <label className="block text-sm font-semibold mb-3 text-gray-700">
                                            Preferred Contact Method *
                                        </label>

                                        <div className="flex flex-wrap gap-8">
                                            <label className="flex items-center gap-2">
                                                <input type="radio" name="contact_method" value="Call" checked={form.contact_method === "Call"} onChange={handleChange} required />Call
                                            </label>

                                            <label className="flex items-center gap-2">
                                                <input type="radio" name="contact_method" value="WhatsApp" checked={form.contact_method === "WhatsApp"} onChange={handleChange} />WhatsApp
                                            </label>

                                            <label className="flex items-center gap-2">
                                                <input type="radio" name="contact_method" value="Email" checked={form.contact_method === "Email"} onChange={handleChange} />Email
                                            </label>
                                        </div>
                                    </div>

                                    {/* Honeypot */}
                                    <div style={{position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden",}} aria-hidden="true">
                                        <input type="text" name="_hp" value={form._hp} onChange={handleChange} tabIndex="-1" autoComplete="off"/>
                                    </div>

                                    {/* Submit */}
                                    <div className="md:col-span-3">
                                        <button type="submit" disabled={loading} className="w-full h-12 rounded-lg bg-[#d72828] hover:bg-[#d72828] text-white font-semibold flex items-center justify-center gap-2">
                                            {loading ? "Submitting..." : "Get Corporate Pricing"}
                                            <span>›</span>
                                        </button>
                                        {responseMsg && (
                                            <p className="text-center text-green-600 mt-4">{responseMsg}</p>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* STATS BAR */}
            <section className="w-full max-w-full sm:max-w-[720px] md:max-w-[960px] lg:max-w-[1320px] xl:max-w-[1520px] 2xl:max-w-[1680px] mx-auto px-3 sm:px-4 md:px-6 py-8 sm:py-10">
                <div className="w-full mx-auto">
                    <div className="bg-gradient-to-r from-[#041b63] to-[#0050d0] rounded-2xl sm:rounded-[28px] px-3 py-5 sm:px-5 sm:py-6 md:px-6 md:py-5">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5 lg:gap-4 text-white">
                            {/* ITEM */}
                            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 md:gap-4 text-center sm:text-left p-2 sm:p-0 sm:border-r sm:border-white/20 sm:pr-4 lg:pr-5">
                                <div className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
                                    <FaAward className="text-[20px] sm:text-[26px] md:text-[30px] text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xl sm:text-2xl md:text-[30px] leading-none font-extrabold text-white mb-1 sm:mb-2">25+</h3>
                                    <p className="text-[12px] sm:text-sm md:text-[16px] text-gray-200 leading-snug">Years of Trust</p>
                                </div>
                            </div>

                            {/* ITEM */}
                            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 md:gap-4 text-center sm:text-left p-2 sm:p-0 sm:border-r sm:border-white/20 sm:pr-4 lg:pr-5">
                                <div className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
                                    <FaStore className="text-[20px] sm:text-[26px] md:text-[30px] text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xl sm:text-2xl md:text-[30px] leading-none font-extrabold text-white mb-1 sm:mb-2">47+</h3>
                                    <p className="text-[12px] sm:text-sm md:text-[16px] text-gray-200 leading-snug">Stores Across Tamil Nadu</p>
                                </div>
                            </div>

                            {/* ITEM */}
                            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 md:gap-4 text-center sm:text-left p-2 sm:p-0 sm:border-r sm:border-white/20 sm:pr-4 lg:pr-5">
                                <div className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
                                    <FaUsers className="text-[20px] sm:text-[26px] md:text-[30px] text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xl sm:text-2xl md:text-[30px] leading-none font-extrabold text-white mb-1 sm:mb-2">50L+</h3>
                                    <p className="text-[12px] sm:text-sm md:text-[16px] text-gray-200 leading-snug">Happy Customers</p>
                                </div>
                            </div>

                            {/* ITEM */}
                            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 md:gap-4 text-center sm:text-left p-2 sm:p-0 sm:border-r sm:border-white/20 sm:pr-4 lg:pr-5">
                                <div className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
                                    <FaTags className="text-[20px] sm:text-[26px] md:text-[30px] text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xl sm:text-2xl md:text-[30px] leading-none font-extrabold text-white mb-1 sm:mb-2">50+</h3>
                                    <p className="text-[12px] sm:text-sm md:text-[16px] text-gray-200 leading-snug">Leading Brands</p>
                                </div>
                            </div>

                            {/* ITEM */}
                            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 md:gap-4 text-center sm:text-left p-2 sm:p-0 col-span-2 sm:col-span-1 justify-self-center sm:justify-self-auto w-full sm:w-auto max-w-[220px] sm:max-w-none">
                                <div className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
                                    <FaBuilding className="text-[20px] sm:text-[26px] md:text-[30px] text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xl sm:text-2xl md:text-[30px] leading-none font-extrabold text-white mb-1 sm:mb-2">100+</h3>
                                    <p className="text-[12px] sm:text-sm md:text-[16px] text-gray-200 leading-snug">Corporate Clients Served</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CONTACT CARDS */}
            <section className="w-full max-w-full sm:max-w-[720px] md:max-w-[960px] lg:max-w-[1320px] xl:max-w-[1520px] 2xl:max-w-[1680px] mx-auto px-4 md:px-6 py-10">
                <div className="max-w-12xl mx-auto px-4 md:px-6">
                    <h2 className="text-[32px] font-extrabold text-center text-[#081028] mb-4">Speak With Our Corporate Team</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* CALL */}
                        <div className="bg-[#f8fbff] border border-[#dce8ff] rounded-[24px] p-5">
                            <div className="flex items-start gap-1">
                                {/* ICON */}
                                <div className="w-16 h-16 rounded-2xl bg-[#edf4ff] flex items-center justify-center text-[#d72828] text-3xl shrink-0">📞</div>
                                {/* CONTENT */}
                                <div>
                                    <h3 className="font-bold text-[15px] text-[#081028] mb-2">Call Us</h3>
                                    <p className="text-[15px] font-extrabold text-[#081028] mb-3 leading-none">+91 98423 44323</p>
                                    <p className="text-gray-600 text-[13px]">Mon - Sat | 9:30 AM - 8:30 PM</p>
                                </div>
                            </div>
                        </div>

                        {/* MAIL */}
                        <div className="bg-[#f8fbff] border border-[#dce8ff] rounded-[24px] p-5">
                            <div className="flex items-start gap-1">
                                {/* ICON */}
                                <div className="w-16 h-16 rounded-2xl bg-[#edf4ff] flex items-center justify-center text-[#d72828] text-3xl shrink-0">✉️</div>
                                {/* CONTENT */}
                                <div>
                                    <h3 className="font-bold text-[15px] text-[#081028] mb-2">Mail Us</h3>
                                    <p className="text-[15px] font-bold text-[#081028] mb-3 break-all leading-7">
                                        <a href="mailto:corporate@sathya.store" className="text-[15px] font-bold text-[#d72828] mb-3 break-all leading-7 hover:text-[#d72828]">corporate@sathya.store</a>
                                    </p>
                                    <p className="text-gray-600 text-[13px]">We reply within 24 hours</p>
                                </div>
                            </div>
                        </div>

                        {/* HOURS */}
                        <div className="bg-[#f8fbff] border border-[#dce8ff] rounded-[24px] p-5">
                            <div className="flex items-start gap-1">
                                {/* ICON */}
                                <div className="w-16 h-16 rounded-2xl bg-[#edf4ff] flex items-center justify-center text-[#d72828] text-3xl shrink-0">🕒</div>
                                {/* CONTENT */}
                                <div>
                                    <h3 className="font-bold text-[15px] text-[#081028] mb-2">Working Hours</h3>
                                    <p className="text-[15px] font-bold text-[#081028] mb-3">Mon - Sat</p>
                                    <p className="text-gray-600 text-[13px]">9:30 AM - 8:30 PM</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            
            {/* FINAL CTA */}
            <section className="w-full max-w-full sm:max-w-[720px] md:max-w-[960px] lg:max-w-[1320px] xl:max-w-[1520px] 2xl:max-w-[1680px] mx-auto px-4 md:px-6 py-10">
                <div className="max-w-[1600px] mx-auto px-4">
                    <div className="bg-[#032c7a] rounded-2xl px-6 py-4 flex items-center justify-between gap-6 overflow-x-auto">
                        {/* Left Section */}
                        <div className="flex items-center gap-4 min-w-[320px]">
                            <div className="w-10 h-10 flex items-center justify-center">
                                <Gift className="w-12 h-12 text-white" strokeWidth={2.2} />
                            </div>
                            <div>
                                <h3 className="text-white text-[22px] font-bold leading-none">Need Large Quantity Pricing?</h3>
                                <p className="text-white/80 text-[13px] mt-2 leading-4">Get the best deals for your bulk requirements with<br />our dedicated corporate team.</p>
                            </div>
                        </div>

                        {/* Features */}
                        <div className="flex items-center gap-8 text-white flex-1 justify-center">
                            <div className="flex items-center gap-2">
                                <FileText size={18} />
                                <div className="text-[15px] leading-tight">
                                    <div>Fast</div>
                                    <div>Quotations</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={18} />
                                <div className="text-[15px] leading-tight">
                                    <div>Best</div>
                                    <div>Bulk Pricing</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Truck size={18} />
                                <div className="text-[15px] leading-tight">
                                    <div>On-Time</div>
                                    <div>Delivery</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Headphones size={18} />
                                <div className="text-[15px] leading-tight">
                                    <div>After-Sales</div>
                                    <div>Support</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* <div className="max-w-7xl mx-auto px-6 py-2">
                <div className="bg-white rounded-[30px] border border-gray-200 shadow-2xl p-6 md:p-8">
                    <div className="mb-8 text-center">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Contact Our Corporate Team</h2>
                        <p className="text-gray-500 text-sm md:text-base">Fill in your business requirements and our corporate solutions team will get in touch with you shortly.</p>
                    </div>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        Company Name
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Company Name *</label>
                            <input type="text" name="company_name" value={form.company_name} onChange={handleChange} onBlur={handleBlur} placeholder="Enter your company name" className={`${inputClass} h-12 rounded-xl border bg-gray-50 focus:bg-white transition-all ${
                                errors.company_name && touched.company_name
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}/>
                            {errors.company_name && touched.company_name && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.company_name}
                                </p>
                            )}
                        </div>

                        Contact Person Name
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Contact Person Name *</label>
                            <input type="text" name="name" value={form.name} onChange={handleChange} onBlur={handleBlur} placeholder="Enter your name" className={`${inputClass} h-12 rounded-xl border bg-gray-50 focus:bg-white transition-all ${
                                errors.name && touched.name
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}/>
                            {errors.name && touched.name && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        Mobile
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Mobile Number *</label>
                            <input type="text" name="mobile_number" value={form.mobile_number} onChange={handleChange} onBlur={handleBlur} maxLength={10} placeholder="Enter mobile number" className={`${inputClass} h-12 rounded-xl border bg-gray-50 focus:bg-white transition-all ${
                                "mobile_number" in errors && touched.mobile_number
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}/>

                            {errors.mobile_number && touched.mobile_number && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.mobile_number}
                                </p>
                            )}
                        </div>                            

                        Email
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Email Address *</label>
                            <input type="email" name="email_address" value={form.email_address} onChange={handleChange} onBlur={handleBlur} placeholder="Enter your email" className={`${inputClass} h-12 rounded-xl border bg-gray-50 focus:bg-white transition-all ${
                                errors.email_address && touched.email_address
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}/>
                            {errors.email_address && touched.email_address && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.email_address}
                                </p>
                            )}
                        </div>

                        City
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">City *</label>
                            <input type="text" name="city" value={form.city} onChange={handleChange} onBlur={handleBlur} placeholder="Enter city" className={`${inputClass} h-12 rounded-xl border bg-gray-50 focus:bg-white transition-all ${
                                errors.city && touched.city
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}/>
                            {errors.city && touched.city && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.city}
                                </p>
                            )}
                        </div>
                        Bussiness Type
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Business Type *</label>
                            <select name="business_type" value={form.business_type} onChange={handleChange} onBlur={handleBlur} className={`${inputClass} h-12 rounded-xl border bg-gray-50 focus:bg-white transition-all ${
                                errors.business_type && touched.business_type
                                    ? "border-red-500"
                                    : "border-gray-300"
                                }`}
                            >
                                <option value="">Select Business Type</option>
                                <option value="Corporate Office">Corporate Office</option>
                                <option value="Dealer / Reseller">Dealer / Reseller</option>
                                <option value="Builder / Contractor">Builder / Contractor</option>
                                <option value="Institution">Institution</option>
                                <option value="Hotel / Hospitality">Hotel / Hospitality</option>
                                <option value="Retail Business">Retail Business</option>
                                <option value="Government">Government</option>
                                <option value="Others">Others</option>
                            </select>
                            {errors.business_type && touched.business_type && (
                                <p className="text-red-500 text-sm mt-1">
                                {errors.business_type}
                                </p>
                            )}
                        </div>

                        Requirement Caregory
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Requirement Category *</label>
                            <select name="requirement_category" value={form.requirement_category} onChange={handleChange} onBlur={handleBlur} className={`${inputClass} h-12 rounded-xl border bg-gray-50 focus:bg-white transition-all ${
                                errors.requirement_category && touched.requirement_category
                                    ? "border-red-500"
                                    : "border-gray-300"
                                }`}
                            >
                                <option value="">Select Requirement Category</option>
                                <option value="Air Conditioners">Air Conditioners</option>
                                <option value="Televisions">Televisions</option>
                                <option value="Refrigerators">Refrigerators</option>
                                <option value="Washing Machines">Washing Machines</option>
                                <option value="Mobiles">Mobiles</option>
                                <option value="Kitchen Appliances">Kitchen Appliances</option>
                                <option value="Corporate Gifting">Corporate Gifting</option>
                                <option value="Multi-Category Requirement">Multi-Category Requirement</option>
                            </select>
                            {errors.requirement_category && touched.requirement_category && (
                                <p className="text-red-500 text-sm mt-1">
                                {errors.requirement_category}
                                </p>
                            )}
                        </div>

                        GST Number
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">GST Number (Optional)</label>
                            <input type="text" name="gst_number" value={form.gst_number} onChange={handleChange} onBlur={handleBlur} placeholder="Enter GST number" className={`${inputClass} h-12 rounded-xl border bg-gray-50 focus:bg-white transition-all`}/>
                        </div>
                        

                        // Address
                        // <div>
                        //     <label className="block text-sm font-semibold mb-2 text-gray-700">Address *</label>
                        //     <input type="text" name="address" value={form.address} onChange={handleChange} onBlur={handleBlur} placeholder="Flat no./Building Name/Society" className={`${inputClass} h-12 rounded-xl border bg-gray-50 focus:bg-white transition-all ${
                        //         errors.address && touched.address
                        //         ? "border-red-500"
                        //         : "border-gray-300"
                        //     }`}/>
                        //     {errors.address && touched.address && (
                        //         <p className="text-red-500 text-sm mt-1">
                        //             {errors.address}
                        //         </p>
                        //     )}
                        // </div>
                        // Landmark
                        // <div>
                        //     <label className="block text-sm font-semibold mb-2 text-gray-700">Landmark *</label>
                        //     <input type="text" name="landmark" value={form.landmark} onChange={handleChange} onBlur={handleBlur} placeholder="Landmark/Locatlity/Area" className={`${inputClass} h-12 rounded-xl border bg-gray-50 focus:bg-white transition-all ${
                        //         errors.landmark && touched.landmark
                        //         ? "border-red-500"
                        //         : "border-gray-300"
                        //     }`}/>
                        //     {errors.landmark && touched.landmark && (
                        //         <p className="text-red-500 text-sm mt-1">
                        //             {errors.landmark}
                        //         </p>
                        //     )}
                        // </div>
                        // State
                        // <div>
                        //     <label className="block text-sm font-semibold mb-2 text-gray-700">State *</label>
                        //     <input type="text" name="state" value={form.state} onChange={handleChange} onBlur={handleBlur} placeholder="Enter state" className={`${inputClass} h-12 rounded-xl border bg-gray-50 focus:bg-white transition-all ${
                        //         errors.state && touched.state
                        //         ? "border-red-500"
                        //         : "border-gray-300"
                        //     }`}/>
                        //     {errors.state && touched.state && (
                        //         <p className="text-red-500 text-sm mt-1">
                        //             {errors.state}
                        //         </p>
                        //     )}
                        // </div>
                        // Pincode
                        // <div>
                            // <label className="block text-sm font-semibold mb-2 text-gray-700">Pincode *</label>
                            // <input type="text" name="pincode" value={form.pincode} onChange={handleChange} onBlur={handleBlur} placeholder="Enter pincode" className={`${inputClass} h-12 rounded-xl border bg-gray-50 focus:bg-white transition-all ${
                            //     errors.pincode && touched.pincode
                            //     ? "border-red-500"
                            //     : "border-gray-300"
                            // }`}/>
                            // {errors.pincode && touched.pincode && (
                            //     <p className="text-red-500 text-sm mt-1">
                            //         {errors.pincode}
                            //     </p>
                            // )}
                        // </div>

                        Product Details
                        <div className="col-span-1 md:col-span-2 mt-1">
                            //<label className="block text-sm font-semibold mb-1 text-gray-700">Product Details *</label>
                            <div className="space-y-4">
                                {products.map((product, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-4 items-end">
                                        Product Name
                                        <div>
                                            <label className="block text-sm font-semibold mb-2 text-gray-700">Product / Requirement</label>
                                            <input type="text" placeholder="Enter product name" value={product.product_name} onChange={(e) =>handleProductChange(
                                                index,
                                                "product_name",
                                                e.target.value
                                            )}
                                            className={`w-full h-12 rounded-2xl border bg-gray-50 px-4 focus:outline-none focus:bg-white ${
                                            errors.products?.[index]?.product_name
                                                ? "border-red-500"
                                                : "border-gray-300"
                                            }`}/>
                                            {errors.products?.[index]?.product_name && (
                                                <p className="text-red-500 text-sm mt-1">
                                                {errors.products[index].product_name}
                                                </p>
                                            )}
                                        </div>

                                        Product Quantity
                                        <div>
                                            <label className="block text-sm font-semibold mb-2 text-gray-700">Approx Quantity *</label>
                                            <input type="number" placeholder="Enter quantity" value={product.product_quantity} onChange={(e) =>handleProductChange(
                                                index,
                                                "product_quantity",
                                                e.target.value
                                            )}
                                            className={`w-full h-12 rounded-2xl border bg-gray-50 px-4 focus:outline-none focus:bg-white ${
                                            errors.products?.[index]?.product_quantity
                                                ? "border-red-500"
                                                : "border-gray-300"
                                            }`}/>
                                            {errors.products?.[index]?.product_quantity && (
                                                <p className="text-red-500 text-sm mt-1">
                                                {errors.products[index].product_quantity}
                                                </p>
                                            )}
                                        </div>
                                        
                                        Add Button
                                        <button type="button" onClick={addProductRow} className="h-12 w-12 rounded-2xl bg-black text-white text-3xl flex items-center justify-center">+</button>
                                        Delete Button
                                        {products.length > 1 && (
                                            <button type="button" onClick={() => removeProductRow(index)} className="h-12 w-12 rounded-2xl bg-red-500 text-white text-3xl flex items-center justify-center">×</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        Honeypot
                        <div style={{position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden",}}aria-hidden="true">
                            <input type="text" name="_hp" value={form._hp} onChange={handleChange} tabIndex="-1" autoComplete="off"/>
                        </div>

                        Submit
                        <div className="md:col-span-2 pt-2">
                            <button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0b1235] to-[#004d43] hover:opacity-90 text-white font-semibold transition-all duration-300">
                                {loading ? "Submitting..." : "Get Corporate Pricing"}
                            </button>
                            {responseMsg && (
                                <p className="text-center text-green-600 font-medium mt-4">
                                    {responseMsg}
                                </p>
                            )}
                        </div>
                    </form>
                </div>
            </div> */}
        </>
    );
}