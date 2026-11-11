"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  FaVideo,
  FaTimes,
  FaUser,
  FaPhoneAlt,
  FaEnvelope,
  FaCalendarAlt,
  FaClock,
  FaLock,
  FaCheckCircle,
  FaBalanceScale,
  FaComments,
  FaShieldAlt,
  FaWhatsapp,
  FaArrowRight,
} from "react-icons/fa";
import { MdVideoCall } from "react-icons/md";

const CATEGORIES = [
  "Televisions",
  "Refrigerators",
  "Washing Machines",
  "Air Conditioners",
  "Mobiles",
  "Kitchen Appliances",
  "I'm not sure yet",
];

const TIME_SLOTS = [
  "10:00 AM - 10:30 AM",
  "10:30 AM - 11:00 AM",
  "11:00 AM - 11:30 AM",
  "11:30 AM - 12:00 PM",
  "12:00 PM - 12:30 PM",
  "12:30 PM - 1:00 PM",
  "2:00 PM - 2:30 PM",
  "2:30 PM - 3:00 PM",
  "3:00 PM - 3:30 PM",
  "3:30 PM - 4:00 PM",
  "4:00 PM - 4:30 PM",
  "4:30 PM - 5:00 PM",
  "5:00 PM - 5:30 PM",
  "5:30 PM - 6:00 PM",
  "6:00 PM - 6:30 PM",
  "6:30 PM - 7:00 PM",
  "7:00 PM - 7:30 PM",
  "7:30 PM - 8:00 PM",
];

const CONNECT_OPTIONS = [
  { id: "whatsapp", label: "WhatsApp Video", sub: "Recommended", Icon: FaWhatsapp },
  { id: "meet", label: "Google Meet", sub: "", Icon: FaVideo },
  { id: "normal", label: "Normal Video Call", sub: "", Icon: MdVideoCall },
];

const initialForm = {
  fullName: "",
  mobile: "",
  email: "",
  category: "I'm not sure yet",
  requirement: "",
  preferredDate: "",
  preferredTime: "",
  connectMethod: "whatsapp",
  additionalInfo: "",
};

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LiveDemoModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const minDate = useMemo(() => todayISO(), []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required";
    if (!/^[0-9]{10}$/.test(form.mobile.trim())) e.mobile = "Enter a valid 10-digit mobile number";
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.category) e.category = "Select a category";
    if (!form.preferredDate) e.preferredDate = "Select a date";
    else if (form.preferredDate < minDate) e.preferredDate = "Past dates are not allowed";
    if (!form.preferredTime) e.preferredTime = "Select a time";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => {
    if (!validateStep1()) return;
    setStep(2);
  };

  const handleSchedule = async () => {
    if (!validateStep1()) {
      toast.error("Please fill required fields.");
      setStep(1);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/live-demo/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          mobile: form.mobile.trim(),
          email: (form.email || "").trim(),
          category: form.category,
          requirement: (form.requirement || "").trim(),
          preferredDate: form.preferredDate,
          preferredTime: form.preferredTime,
          connectMethod:
            CONNECT_OPTIONS.find((c) => c.id === form.connectMethod)?.label ||
            form.connectMethod,
          additionalInfo: (form.additionalInfo || "").trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send request");
      }

      if (data.whatsappUrl) {
        setWhatsappUrl(data.whatsappUrl);
        window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
      }

      setStep(3);
    } catch (err) {
      console.error("Live demo submit failed:", err);
      toast.error(err.message || "Failed to send request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (hasErr) =>
    `w-full border rounded-xl pl-10 pr-3 py-2.5 text-sm outline-none transition ${
      hasErr ? "border-red-400 bg-red-50" : "border-gray-300 bg-white focus:border-[#d72828]"
    }`;

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-5xl max-h-[95vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800"
          aria-label="Close"
        >
          <FaTimes />
        </button>

        {step === 1 ? (
          <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
            {/* Left promo */}
            <div className="bg-[#eef4ff] p-5 sm:p-7 rounded-t-2xl lg:rounded-tr-none lg:rounded-l-2xl">
              <div className="inline-flex items-center gap-2 bg-white text-[#d72828] text-xs font-bold px-3 py-1.5 rounded-full mb-4">
                <FaVideo /> Sathya Stores LIVE EXPERT
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0a1d56] mb-2">
                Talk to a Sathya Stores Expert
              </h2>
              <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                Get personalised advice and see products live on a video call. 100% free. No obligation to buy.
              </p>
              <ul className="space-y-3 mb-6">
                {[
                  { Icon: FaVideo, text: "Live product demonstration" },
                  { Icon: FaBalanceScale, text: "Compare different brands & models" },
                  { Icon: FaComments, text: "Ask unlimited questions" },
                  { Icon: FaShieldAlt, text: "No obligation to buy" },
                ].map(({ Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-sm text-[#0a1d56] font-medium">
                    <span className="w-8 h-8 rounded-full bg-white text-[#d72828] flex items-center justify-center shrink-0">
                      <Icon size={14} />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
              <div className="flex items-end gap-3 mt-4 ml-4 sm:mt-6 sm:ml-8">
                <img
                  src="/uploads/live-demo-popup.png"
                  alt="Sathya Stores Live Demo"
                  className="w-44 sm:w-56 md:w-64 h-auto object-contain bg-transparent translate-y-2 sm:translate-y-4"
                />
                <div className="hidden sm:block bg-white rounded-xl px-3 py-2 text-xs text-gray-600 shadow-sm max-w-[160px] mb-6">
                  We&apos;re here to help you make the right choice!
                </div>
              </div>
            </div>

            {/* Right form */}
            <div className="p-5 sm:p-7">
              <h3 className="text-xl font-bold text-[#0a1d56] mb-1">Book a Live Demo</h3>
              <p className="text-sm text-gray-500 mb-5">
                Fill in your details and we&apos;ll schedule a video call with our product expert.
              </p>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(e) => setField("fullName", e.target.value)}
                      placeholder="Enter your full name"
                      className={inputClass(errors.fullName)}
                    />
                  </div>
                  {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FaPhoneAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <div className="absolute left-9 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">
                      +91
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.mobile}
                      onChange={(e) => setField("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="Enter mobile number"
                      className={`${inputClass(errors.mobile)} !pl-16`}
                    />
                  </div>
                  {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <div className="relative">
                    <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                      placeholder="Enter your email address"
                      className={inputClass(errors.email)}
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    I&apos;m interested in
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setField("category", cat)}
                        className={`text-left text-xs font-semibold rounded-xl border px-3 py-2.5 transition ${
                          form.category === cat
                            ? "border-[#d72828] bg-red-50 text-[#d72828] border-dashed"
                            : "border-gray-200 bg-white text-gray-700 hover:border-[#d72828]"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    What are you looking for?
                  </label>
                  <textarea
                    rows={3}
                    value={form.requirement}
                    onChange={(e) => setField("requirement", e.target.value)}
                    placeholder='Tell us what you are looking for. Example: Looking for a 65" Sony TV'
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#d72828] resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Preferred Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
                      <input
                        type="date"
                        min={minDate}
                        value={form.preferredDate}
                        onChange={(e) => setField("preferredDate", e.target.value)}
                        className={inputClass(errors.preferredDate)}
                      />
                    </div>
                    {errors.preferredDate && (
                      <p className="text-red-500 text-xs mt-1">{errors.preferredDate}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Preferred Time <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FaClock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
                      <select
                        value={form.preferredTime}
                        onChange={(e) => setField("preferredTime", e.target.value)}
                        className={`${inputClass(errors.preferredTime)} appearance-none`}
                      >
                        <option value="">Select time</option>
                        {TIME_SLOTS.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.preferredTime && (
                      <p className="text-red-500 text-xs mt-1">{errors.preferredTime}</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleContinue}
                  className="w-full h-12 rounded-xl bg-[#d72828] hover:bg-[#1a3fa8] text-white font-bold text-sm flex items-center justify-center gap-2 transition"
                >
                  <FaVideo />
                  Continue
                  <FaArrowRight size={12} />
                </button>
                <p className="text-[11px] text-gray-500 flex items-center justify-center gap-1.5">
                  <FaLock className="text-gray-400" />
                  Your details are safe with us. We never share your information.
                </p>
              </div>
            </div>
          </div>
        ) : step === 2 ? (
          <div className="p-5 sm:p-8 max-w-2xl mx-auto">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-11 h-11 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                <FaCheckCircle size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#0a1d56]">Confirm &amp; Schedule</h3>
                <p className="text-sm text-gray-500">
                  Choose how you want to connect and confirm your demo.
                </p>
              </div>
            </div>

            <p className="text-sm font-semibold text-gray-800 mb-2">
              How would you like us to connect?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
              {CONNECT_OPTIONS.map(({ id, label, sub, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setField("connectMethod", id)}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    form.connectMethod === id
                      ? "border-[#d72828] bg-red-50"
                      : "border-gray-200 bg-white hover:border-[#d72828]"
                  }`}
                >
                  <Icon
                    className={`mb-1 ${id === "whatsapp" ? "text-green-500" : "text-[#d72828]"}`}
                    size={20}
                  />
                  <div className="text-sm font-bold text-gray-800">{label}</div>
                  {sub ? <div className="text-[11px] text-[#d72828] font-medium">{sub}</div> : null}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Email Address (Optional)
              </label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="Enter your email address"
                  className={inputClass(false)}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Anything specific you would like us to show?
              </label>
              <textarea
                rows={3}
                value={form.additionalInfo}
                onChange={(e) => setField("additionalInfo", e.target.value)}
                placeholder="e.g. Show inside view, compare with other models, explain features, etc."
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#d72828] resize-none"
              />
            </div>

            <p className="text-sm font-semibold text-gray-800 mb-2">Your Preferred Schedule</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="relative">
                <FaCalendarAlt className="absolute left-3 top-3.5 text-gray-400 text-sm pointer-events-none" />
                <input
                  type="date"
                  min={minDate}
                  value={form.preferredDate}
                  onChange={(e) => setField("preferredDate", e.target.value)}
                  className={inputClass(false)}
                />
                <p className="text-[11px] text-gray-500 mt-1 pl-1">
                  {formatDisplayDate(form.preferredDate) || "Select date"}
                </p>
              </div>
              <div className="relative">
                <FaClock className="absolute left-3 top-3.5 text-gray-400 text-sm pointer-events-none" />
                <select
                  value={form.preferredTime}
                  onChange={(e) => setField("preferredTime", e.target.value)}
                  className={`${inputClass(false)} appearance-none`}
                >
                  <option value="">Select time</option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1 pl-1">30 mins</p>
              </div>
            </div>

            <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-[#d72828] mb-4 flex items-start gap-2">
              <span className="font-bold mt-0.5">i</span>
              You will receive a confirmation on WhatsApp shortly.
            </div>

            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 h-12 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSchedule}
                className="flex-1 h-12 rounded-xl bg-[#d72828] hover:bg-[#1a3fa8] disabled:bg-gray-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition"
              >
                {submitting ? "Sending..." : "Schedule My Demo →"}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 flex items-center justify-center gap-1.5">
              <FaShieldAlt className="text-green-500" />
              Your data is safe with us. We never share your information.
            </p>
          </div>
        ) : (
          <div className="p-8 sm:p-12 max-w-lg mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
              <FaCheckCircle size={36} />
            </div>
            <h3 className="text-2xl font-extrabold text-[#0a1d56] mb-2">
              Response Submitted
            </h3>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-6">
              Your response submitted. We will reach you soon.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-[#25D366] hover:bg-[#20c05c] text-white font-bold text-sm transition"
                >
                  <FaWhatsapp size={18} />
                  Open WhatsApp
                </a>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center h-11 px-8 rounded-xl bg-[#d72828] hover:bg-[#1a3fa8] text-white font-bold text-sm transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
