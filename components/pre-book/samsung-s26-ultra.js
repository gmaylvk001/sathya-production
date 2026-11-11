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
  });

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

    setLoading(true);
    setResponseMsg("");

    try {
      const res = await fetch("/api/pre-book/samsung-s26-ultra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
          const SamsungS26Ultra = data.data;
          const adminemailFormData = new FormData();
          adminemailFormData.append("campaign_id", "929d4648-fa87-42c6-aed2-ead2e30ce213");
          adminemailFormData.append(
            "params",
            JSON.stringify([SamsungS26Ultra.name,SamsungS26Ultra.mobile_number,SamsungS26Ultra.email_address,SamsungS26Ultra.city,SamsungS26Ultra.product])
          );
  
          const emailadmin = ["arunkarthik@sathya.store","Customercare@sathya.store"];
          emailadmin.forEach(async (emailadmin) => {
            adminemailFormData.set("email", emailadmin);
          let adminresponse = { ok: true, status: 200, json: async () => ({ success: true, message: 'Disabled' }), text: async () => '{}' };
  
          let adminData = await adminresponse.json();
          });
          setResponseMsg("Message sent successfully!");
          setForm({ name: "", email_address: "", mobile_number: "", city: "", product: "" });
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
            <img src="/uploads/samsung-s26-2560-1440.jpeg" alt="Samsung S26 Ultra Banner" className="w-full h-auto"/>
        </section>

        <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="max-w-5xl mx-auto mb-5">
                {/* Write Us Form (Now on Right) */}
                <div className="p-5 border border-2 rounded">
                    <h2 className="text-3xl font-bold mb-3 text-center text-customBlue"> Pre Book - Samsung S26 Ultra </h2>
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
                            <option value="">-- Select Product --</option>
                            <option value="Samsung S26 Ultra">Samsung S26 Ultra</option>
                        </select>
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
