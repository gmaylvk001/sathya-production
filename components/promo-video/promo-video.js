"use client";

import { useEffect, useState } from "react";
import { FaPhoneAlt, FaEnvelope } from "react-icons/fa";

export default function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email_address: "",
    mobile_number: "",
    city: "",
    product: "",
    _hp: "",
  });
  const [formLoadTime] = useState(() => Date.now());

  const [openMission, setOpenMission] = useState(true);   // default OPEN
const [openSuccess, setOpenSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [responseMsg, setResponseMsg] = useState("");

  const [touched, setTouched] = useState({});
 
  const handleBlur = (e) => {
    setTouched({ ...touched, [e.target.name]: true });
  };
 

  /* const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  }; */

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
    
    if (!form.email_address.trim()) {
      newErrors.email_address = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(form.email_address)) {
      newErrors.email_address = "Email is invalid";
    }
 
    if (!form.mobile_number.trim()) {
      newErrors.mobile_number = "";
    } else if (!/^\d{10,15}$/.test(form.mobile_number)) {
      newErrors.mobile_number = "Invalid Mobile Number";
    }
 
    if (!form.city.trim()) newErrors.city = "City is required";
    if (!form.product.trim()) newErrors.product = "product is required";
 
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
      const res = await fetch("/api/promo-video/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
          const Promovideo = data.data;
          const adminemailFormData = new FormData();
          adminemailFormData.append("campaign_id", "0790ce5c-7017-4006-b3b7-9861ef84c8b8");
          adminemailFormData.append(
            "params",
            JSON.stringify([Promovideo.name,Promovideo.mobile_number,Promovideo.email_address,Promovideo.city,Promovideo.product])
          );
  
          const emailadmin = ["arunkarthik@sathya.store","ecom@sathya.store","Customercare@sathya.store"];
          emailadmin.forEach(async (emailadmin) => {
            adminemailFormData.set("email", emailadmin);
          let adminresponse = { ok: true, status: 200, json: async () => ({ success: true, message: 'Disabled' }), text: async () => '{}' };
  
          let adminData = await adminresponse.json();
          });
          setResponseMsg("Message sent successfully!");
          setForm({ name: "", email_address: "", mobile_number: "", city: "", product: "", _hp: "" });
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
      setResponseMsg("Server error");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full border rounded-md px-3 py-2 focus:outline-none";

  return (
    <>
        <section className="w-full bg-white">
            <img src="/uploads/Sathya Stores-WEB-BANNER.jpeg" alt="Republic Day Sale Banner" className="w-full h-auto"/>
        </section>

        <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="max-w-5xl mx-auto mb-5">
                {/* Write Us Form (Now on Right) */}
                <div className="p-5 border border-2 rounded">
                    <h2 className="text-3xl font-bold mb-3 text-center text-customBlue"> Special Offers </h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* Name */}
                    <div>
                        <label className="block font-medium mb-1">Name<span className="text-red-600">*</span></label>
                        <input type="text" name="name" value={form.name} onChange={handleChange} onBlur={handleBlur} className={`${inputClass} ${errors.name && (touched.name || submitted) ? "border-red-500" : "border-gray-300"}`}/>
                    </div>
                    {/* Phone */}
                    <div>
                        <label className="block font-medium mb-1">Phone <span className="text-red-600">*</span></label>
                        <input type="text" name="mobile_number" value={form.mobile_number} onChange={handleChange} onBlur={handleBlur} maxLength={10}
                        // className={`${inputClass} ${errors.mobile_number && (touched.mobile_number || submitted) ? "border-red-500" : "border-gray-300"}`}
                        className={`${inputClass} ${'mobile_number' in errors && touched.mobile_number ? "border-red-500" : "border-gray-300"}`}
                        />
                        {errors.mobile_number && touched.mobile_number && (
                  <p className="text-red-500 text-sm mt-1">{errors.mobile_number}</p>
                )}
                    </div>
                    
                    {/* Email */}
                    <div>
                        <label className="block font-medium mb-1">Email Address<span className="text-red-600">*</span></label>
                        <input type="email" name="email_address" value={form.email_address} onChange={handleChange} onBlur={handleBlur} className={`${inputClass} ${errors.email_address && (touched.email_address || submitted) ? "border-red-500" : "border-gray-300"}`}/>
                    </div>
                    {/* City */}
                    <div>
                        <label className="block font-medium mb-1">City <span className="text-red-600">*</span></label>
                        <input type="text" name="city" value={form.city} onChange={handleChange} onBlur={handleBlur} className={`${inputClass} ${errors.city && (touched.city || submitted) ? "border-red-500" : "border-gray-300"}`}/>
                    </div>
                    {/* product - Full Width */}
                    <div className="md:col-span-2">
                        <label className="block font-medium mb-1">Select Products<span className="text-red-600">*</span></label>
                        <select name="product" value={form.product} onChange={handleChange} onBlur={handleBlur}  className={`${inputClass} ${errors.product && (touched.product || submitted) ? "border-red-500" : "border-gray-300"}`}>
                            <option value="">-- Select Category --</option>
                            <option value="Television">Television</option>
                            <option value="Refrigerators">Refrigerators</option>
                            <option value="Washing Machine">Washing Machine</option>
                            <option value="Air Conditioners">Air Conditioners</option>
                            <option value="Small Appliances">Small Appliances</option>
                            <option value="Dish Washers">Dish Washers</option>
                            <option value="Mobiles">Mobiles</option>
                            <option value="Others">Others</option>
                        </select>
                    </div>

                    {/* Honeypot — hidden from humans, bots will fill this */}
                    <div style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
                      <input type="text" name="_hp" value={form._hp} onChange={handleChange} tabIndex="-1" autoComplete="off" />
                    </div>

                    {/* Submit Button - Full Width */}
                    <div className="md:col-span-2 text-center">
                        <button
                        type="submit"
                        disabled={loading}
                        className="bg-[#d72828] text-white px-6 py-2 rounded-md"
                        >
                        {loading ? "Submitting..." : "Submit"}
                        </button>

                        {responseMsg && (
                        <p className="text-green-600 font-medium mt-2">{responseMsg}</p>
                        )}
                    </div>
                    </form>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-5">
                {/* Promo Video Brand Image (Moved to Left) */}
                <div className="p-2">
                    <div className="space-y-4">
                    <img src="/uploads/promo-video-bands-images.png" alt="Republic Day Sale Banner" className="w-full h-auto"/>
                    </div>
                </div>
            {/* DETAILS (Right Side) */}
                <div>
                    {/* OUR KEY TO SUCCESS */}
                    <div className={`border border-gray-300 ${openMission ? "bg-customBlue" : "bg-gray-100"}`}>
                        <div className="flex justify-between items-center px-6 py-4 cursor-pointer" onClick={() => setOpenMission(!openMission)}>
                            <h2 className={`font-bold text-lg ${openMission ? "text-[#f58b31]" : "text-[#d72828]"}`}>OUR KEY TO SUCCESS</h2>
                            <div className={`w-7 h-7 flex items-center justify-center text-white rounded-full text-lg font-bold ${openMission ? "bg-[#f58b31]" : "bg-[#d72828]"}`}>
                                {openMission ? "−" : "+"}
                            </div>
                        </div>

                        <div className={`overflow-hidden transition-all duration-300 ${openMission ? "max-h-40 px-6 pb-4" : "max-h-0 px-6 pb-0"} text-white`}>
                            Quality Products, Customer Service, After Sales Service, Right Pricing, Customer Friendly Employees, Right Showrooms With Good Infrastructure Have Been The Key For Our Success. Attractive finance schemes with EMI options available.
                        </div>
                    </div>

                    {/* OUR MISSION */}
                    <div className={`border border-gray-300 ${openSuccess ? "bg-customBlue" : "bg-gray-100"}`}>
                        <div className="flex justify-between items-center px-6 py-4 cursor-pointer" onClick={() => setOpenSuccess(!openSuccess)}>
                            <h2 className={`font-bold text-lg ${openSuccess ? "text-[#f58b31]" : "text-[#d72828]"}`}>OUR MISSION</h2>
                            <div className={`w-7 h-7 flex items-center justify-center text-white rounded-full text-lg font-bold ${openSuccess ? "bg-orange-600" : "bg-[#d72828]"}`}>
                                {openSuccess ? "−" : "+"}
                            </div>
                        </div>

                        <div className={`overflow-hidden transition-all duration-300 ${openSuccess ? "max-h-60 px-6 pb-4" : "max-h-0 px-6 pb-0"} text-white`}>
                            Our mission is to expand our branches all over Tamilnadu in short duration. To reach the customers easily, And also be a market leader all over TamilNadu.
                        </div>
                    </div>
                </div>
            </div>
        </div>
<section className="w-full bg-gray-200 py-6">
  <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">

    {/* LEFT MESSAGE BOX */}
    <div className="bg-white shadow-md rounded-md p-4 text-sm text-gray-700 max-w-xs">
      <p className="font-semibold">Thank you for reaching us!</p>
      <p className="mt-1">
        For Immediate Response, Call <br />

        {/* CLICK TO CALL */}
        <a
          href="tel:9842344323"
          className="font-bold text-[#d72828] hover:underline"
        >
          9842344323
        </a>
      </p>
    </div>


    {/* CENTER TEXT + BUTTON BELOW */}
    <div className="text-center flex-1">
      <h2 className="text-lg md:text-xl font-semibold text-gray-800">
        Contact Us For More Details
      </h2>

      {/* BUTTON BELOW TEXT */}
      <a
        href="/contact"   // change route if needed
        className="inline-block mt-3 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 rounded-md shadow-md transition"
      >
        Click Here!
      </a>
    </div>

  </div>
</section>

    </>
  );
}
