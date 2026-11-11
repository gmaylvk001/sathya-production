"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FaPhoneAlt,
  FaEnvelope,
  FaStore,
  FaMapMarkerAlt,
  FaPaperPlane,
  FaSearch,
  FaArrowRight,
  FaVideo,
} from "react-icons/fa";
import { useModal } from "@/context/ModalContext";

// ── Helpers ──────────────────────────────────────────────────────────────────
const titleCase = (str) =>
  str ? str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "";
const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

// ── Contact Form ─────────────────────────────────────────────────────────────
function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email_address: "",
    mobile_number: "",
    city: "",
    enquiry_type: "",
    invoice_number: "",
    message: "",
    _hp: "",
  });
  const [formLoadTime] = useState(() => Date.now());
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [responseMsg, setResponseMsg] = useState("");
  const [touched, setTouched] = useState({});

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    if (name === "mobile_number") {
      if (!value.trim()) {
        setErrors((prev) => ({ ...prev, mobile_number: "Phone number is required" }));
      } else if (!/^[6-9]\d{9}$/.test(value.trim())) {
        setErrors((prev) => ({ ...prev, mobile_number: "Please enter a valid 10-digit mobile number" }));
      } else {
        setErrors((prev) => {
          const { mobile_number: _, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "mobile_number") {
      const digits = value.replace(/\D/g, "").slice(0, 10);
      setForm((prev) => ({ ...prev, [name]: digits }));
      if (touched.mobile_number) {
        if (!digits) {
          setErrors((prev) => ({ ...prev, mobile_number: "Phone number is required" }));
        } else if (digits.length === 10) {
          if (/^[6-9]\d{9}$/.test(digits)) {
            setErrors((prev) => {
              const { mobile_number: _, ...rest } = prev;
              return rest;
            });
          } else {
            setErrors((prev) => ({
              ...prev,
              mobile_number: "Mobile number must start with 6, 7, 8, or 9",
            }));
          }
        }
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
      if (errors[name]) {
        setErrors((prev) => {
          const { [name]: _, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email_address.trim()) e.email_address = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email_address)) e.email_address = "Email is invalid";
    if (!form.mobile_number || !form.mobile_number.trim()) {
      e.mobile_number = "Phone number is required";
    } else if (!/^[6-9]\d{9}$/.test(form.mobile_number.trim())) {
      e.mobile_number = "Please enter a valid 10-digit mobile number";
    }
    if (!form.city.trim()) e.city = "City is required";
    if (!form.enquiry_type) e.enquiry_type = "Please select enquiry type";
    if (!form.message.trim()) e.message = "Message is required";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allTouched = Object.keys(form).reduce((acc, k) => ({ ...acc, [k]: true }), {});
    setTouched(allTouched);
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    if (form._hp) return;
    if (Date.now() - formLoadTime < 3000) { setResponseMsg("Please take a moment before submitting."); return; }
    setLoading(true);
    setResponseMsg("");
    try {
      const res = await fetch("/api/contact/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setResponseMsg("Message sent successfully!");
        setForm({ name: "", email_address: "", mobile_number: "", city: "", enquiry_type: "", invoice_number: "", message: "", _hp: "" });
        setErrors({}); setTouched({});
        setTimeout(() => setResponseMsg(""), 3000);
      } else {
        setResponseMsg(data.message || "Something went wrong");
      }
    } catch { setResponseMsg("Something went wrong. Please check your details and try again."); }
    finally { setLoading(false); }
  };

  const inp = (hasErr) =>
    `w-full border rounded px-3 py-[9px] text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#d72828] transition-colors ${hasErr ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12.5px] font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input type="text" name="name" value={form.name} onChange={handleChange} onBlur={handleBlur} placeholder="Enter your name" className={inp(errors.name && touched.name)} />
          {errors.name && touched.name && <p className="text-red-500 text-[11px] mt-0.5">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-[12.5px] font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input type="email" name="email_address" value={form.email_address} onChange={handleChange} onBlur={handleBlur} placeholder="Enter your email" className={inp(errors.email_address && touched.email_address)} />
          {errors.email_address && touched.email_address && <p className="text-red-500 text-[11px] mt-0.5">{errors.email_address}</p>}
        </div>
      </div>
      {/* Phone + City */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12.5px] font-medium text-gray-700 mb-1">
            Phone <span className="text-red-500">*</span>
          </label>
          <input type="text" name="mobile_number" value={form.mobile_number} onChange={handleChange} onBlur={handleBlur} placeholder="Enter your phone number" maxLength={10} className={inp(errors.mobile_number && touched.mobile_number)} />
          {errors.mobile_number && touched.mobile_number && <p className="text-red-500 text-[11px] mt-0.5">{errors.mobile_number}</p>}
        </div>
        <div>
          <label className="block text-[12.5px] font-medium text-gray-700 mb-1">
            City <span className="text-red-500">*</span>
          </label>
          <input type="text" name="city" value={form.city} onChange={handleChange} onBlur={handleBlur} placeholder="Enter your city" className={inp(errors.city && touched.city)} />
          {errors.city && touched.city && <p className="text-red-500 text-[11px] mt-0.5">{errors.city}</p>}
        </div>
      </div>
      {/* Enquiry Type + Invoice */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12.5px] font-medium text-gray-700 mb-1">
            Enquiry Type <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select name="enquiry_type" value={form.enquiry_type} onChange={handleChange} onBlur={handleBlur} className={`${inp(errors.enquiry_type && touched.enquiry_type)} appearance-none pr-10 ${!form.enquiry_type ? "text-gray-400" : "text-gray-700"}`}>
              <option value="" disabled hidden>Select enquiry type</option>
              <option value="Product Inquiry" className="text-gray-700">Product Inquiry</option>
              <option value="Order Support" className="text-gray-700">Order Support</option>
              <option value="Service Request" className="text-gray-700">Service Request</option>
              <option value="EMI / Finance" className="text-gray-700">EMI / Finance</option>
              <option value="Feedback" className="text-gray-700">Feedback</option>
              <option value="Other" className="text-gray-700">Other</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
          {errors.enquiry_type && touched.enquiry_type && <p className="text-red-500 text-[11px] mt-0.5">{errors.enquiry_type}</p>}
        </div>
        <div>
          <label className="block text-[12.5px] font-medium text-gray-700 mb-1">
            Invoice Number
          </label>
          <input type="text" name="invoice_number" value={form.invoice_number} onChange={handleChange} placeholder="Enter invoice number (if any)" className={inp(false)} />
        </div>
      </div>
      {/* Message */}
      <div>
        <label className="block text-[12.5px] font-medium text-gray-700 mb-1">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea name="message" value={form.message} onChange={handleChange} onBlur={handleBlur} placeholder="Write your message here..." rows={4} className={`${inp(errors.message && touched.message)} resize-none`} />
        {errors.message && touched.message && <p className="text-red-500 text-[11px] mt-0.5">{errors.message}</p>}
      </div>
      {/* Honeypot */}
      <div style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
        <input type="text" name="_hp" value={form._hp} onChange={handleChange} tabIndex="-1" autoComplete="off" />
      </div>
      {/* Submit */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pt-1">
        <button type="submit" disabled={loading} className="flex items-center gap-2 bg-[#d72828] hover:bg-[#d72828] disabled:opacity-60 text-white font-semibold rounded-lg px-5 py-2.5 text-[13px] transition-colors">
          <FaPaperPlane size={12} />
          {loading ? "Submitting..." : "Submit Message"}
        </button>
        {responseMsg && (
          <p className={`text-[12.5px] font-medium ${responseMsg.includes("success") ? "text-green-600" : "text-red-500"}`}>
            {responseMsg}
          </p>
        )}
      </div>
    </form>
  );
}

// ── Store Card (exact reference match) ───────────────────────────────────────
function StoreCard({ store }) {
  const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    `${store.organisation_name} ${store.website || ""}`
  )}`;
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col w-full min-w-[170px] max-w-[200px] sm:min-w-[180px]">
      {/* Image */}
      <div className="relative w-full bg-[#d72828] overflow-hidden flex-shrink-0 h-[100px] sm:h-[110px]">
        {store.banners?.[0] ? (
          <img src={store.banners[0]} alt={store.organisation_name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
        ) : store.logo ? (
          <img src={store.logo} alt={store.organisation_name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><span className="text-[#d72828] font-bold text-sm">Sathya Stores</span></div>
        )}
        {/* City badge */}
        {store.city && (
          <span className="absolute top-1.5 left-1.5 bg-[#d72828] text-white text-[9.5px] font-bold px-1.5 py-0.5 rounded">
            {capitalize(store.city)}
          </span>
        )}
      </div>
      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="text-[12.5px] font-bold text-gray-900 mb-1 leading-snug line-clamp-1">
          {store.organisation_name}
        </h3>
        {store.address && (
          <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 mb-1.5 flex-1">
            {titleCase(store.address)}{store.city ? `, ${capitalize(store.city)}` : ""}
            {store.zipcode ? ` - ${store.zipcode}` : ""}
          </p>
        )}
        {store.phone && (
          <a href={`tel:${store.phone}`} className="flex items-center gap-1.5 text-[11px] text-[#d72828] font-medium mb-3 hover:underline">
            <FaPhoneAlt size={9} className="flex-shrink-0" />
            {store.phone}
          </a>
        )}
        {/* Buttons */}
        <div className="flex gap-2 mt-auto">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
            <button className="w-full border border-[#d72828] text-[#d72828] hover:bg-red-50 rounded py-1.5 text-[11px] font-semibold transition-colors">
              Get Directions
            </button>
          </a>
          <Link href={`/store/${store.slug}`} className="flex-1">
            <button className="w-full bg-[#d72828] hover:bg-[#d72828] text-white rounded py-1.5 text-[11px] font-semibold transition-colors">
              View Store
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ContactPage() {
  const { openLiveDemoModal } = useModal();
  const [stores, setStores] = useState([]);
  const [totalStores, setTotalStores] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredStores, setFilteredStores] = useState([]);

  useEffect(() => {
    async function fetchStores() {
      try {
        const res = await fetch("/api/store/get");
        const data = await res.json();
        if (data.success) {
          const active = data.data.filter((s) => s.status === "Active");
          setTotalStores(active.length);
          setStores(active);
          setFilteredStores(active.slice(0, 6));
        }
      } catch (err) {
        console.error("Failed to fetch stores", err);
      }
    }
    fetchStores();
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredStores(stores.slice(0, 5));
      return;
    }
    const q = searchQuery.toLowerCase();
    const results = stores.filter(
      (s) =>
        s.city?.toLowerCase().includes(q) ||
        s.organisation_name?.toLowerCase().includes(q) ||
        s.zipcode?.includes(q) ||
        s.address?.toLowerCase().includes(q)
    );
    setFilteredStores(results.slice(0, 6));
  };

  return (
    <div className="font-sans bg-white text-gray-900">

      {/* ══════════════════════════════════════════════════
          SECTION 1 — BANNER IMAGE
      ══════════════════════════════════════════════════ */}
      <section className="w-full">
        {/* Banner Image */}
        <img src="/uploads/frontend_images/sathya_contact.png" alt="Sathya Store" className="w-full h-auto max-h-[500px] object-cover" />
      </section>

      {/* ══════════════════════════════════════════════════
          SECTION 2 — 3 SUPPORT CARDS
      ══════════════════════════════════════════════════ */}
      <section className="w-full max-w-full sm:max-w-[720px] md:max-w-[960px] lg:max-w-[1320px] xl:max-w-[1520px] 2xl:max-w-[1680px] mx-auto px-0 sm:px-3 md:px-6 lg:px-8 mt-6 md:mt-8">
        <div className="max-w-12xl mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">

          {/* Email Card */}
          <div className="border border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center text-center gap-3 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 rounded-full bg-[#d72828] flex items-center justify-center flex-shrink-0">
              <FaEnvelope className="text-white text-[22px]" />
            </div>
            <div>
              <div className="text-[16px] font-bold text-gray-900 mb-2">Email Support</div>
              <p className="text-[13px] text-gray-500 leading-relaxed mb-3">
                Drop us an email. We typically respond within 24 hours.
              </p>
              <a href="mailto:info@sathya.store" className="text-[#d72828] font-bold text-[14px] hover:underline">
                info@sathya.store
              </a>
            </div>
          </div>

          {/* Location Card */}
          <div className="border border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center text-center gap-3 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 rounded-full bg-[#d72828] flex items-center justify-center flex-shrink-0">
              <FaMapMarkerAlt className="text-white text-[22px]" />
            </div>
            <div>
              <div className="text-[16px] font-bold text-gray-900 mb-2">Store Locations</div>
              <p className="text-[13px] text-gray-500 leading-relaxed mb-3">
                {totalStores > 0 ? totalStores : "427"} showrooms across Tamil Nadu. Find the one near you.
              </p>
              <a
                href="https://sathya.adtarbo.com/stores"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#d72828] font-bold text-[14px] hover:underline inline-flex items-center gap-1.5"
              >
                Store Locator <FaArrowRight size={12} />
              </a>
            </div>
          </div>

          {/* Address Card */}
          <div className="border border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center text-center gap-3 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 rounded-full bg-[#d72828] flex items-center justify-center flex-shrink-0">
              <FaStore className="text-white text-[22px]" />
            </div>
            <div className="w-full flex flex-col h-full">
              <div className="text-[16px] font-bold text-gray-900 mb-3 text-center">Our Offices</div>
              <div className="text-[12px] text-gray-500 leading-relaxed mb-4 space-y-3 text-left">
                <div>
                  <strong className="text-gray-700 block mb-0.5">Corporate Office</strong>
                  Plot No. 178, Kumaran Colony Main Road, Vadapalani, Chennai - 600 026, Tamil Nadu, India
                </div>
                <div>
                  <strong className="text-gray-700 block mb-0.5">Registered Office</strong>
                  No.2/174/4 & 2/174/5, Palayamkottai Main Road, NH-7A, Maravanmadam, Tuticorin - 628 101, Tamil Nadu, India
                </div>
              </div>
              <div className="text-center mt-auto pt-2">
                <a href="tel:9842344323" className="text-[#d72828] font-bold text-[14px] hover:underline">
                  ☎ 98423 44323
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          SECTION 3 — FORM (left) + MAP (right)
      ══════════════════════════════════════════════════ */}
      <section className="w-full max-w-full sm:max-w-[720px] md:max-w-[960px] lg:max-w-[1320px] xl:max-w-[1520px] 2xl:max-w-[1680px] mx-auto px-0 sm:px-3 md:px-6 lg:px-8 mt-8 md:mt-10">
        <div className="max-w-12xl mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 lg:gap-8 items-start pb-12">

          {/* Left — Form */}
          <div>
            <h2 className="text-lg sm:text-[20px] font-bold text-gray-900 mb-1">Send Us a Message</h2>
            <p className="text-[13px] text-gray-500 mb-5">
              Fill out the form and our team will get back to you.
            </p>
            <ContactForm />
          </div>

          {/* Right — Map Only */}
          <div className="h-full flex flex-col">
            <h2 className="text-base sm:text-[17px] font-bold text-gray-900 mb-4">Our Location</h2>
            {/* Map */}
            <div className="rounded-xl overflow-hidden border border-gray-200 h-full min-h-[400px]">
              <iframe
                title="Sathya Stores Location Map"
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                referrerPolicy="no-referrer-when-downgrade"
                src="https://maps.google.com/maps?q=Sathya+Stores+Corporate+Office,+Chennai&output=embed"
                allowFullScreen
              />
            </div>
          </div>

        </div>
      </section>


    </div>
  );
}