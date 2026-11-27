"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";
import {
  FaWhatsapp,
  FaPhoneAlt,
  FaSearch,
  FaBoxOpen,
  FaUndoAlt,
  FaStore,
  FaChevronDown,
  FaCheckCircle,
  FaHeadset,
  FaClock,
  FaEnvelope,
} from "react-icons/fa";

const WHATSAPP_NUMBER = "918880598985";

const CHAT_TOPICS = [
  {
    label: "Order Status",
    message: "Hi Sathya Support, I would like to check the status of my order.",
  },
  {
    label: "Product Enquiry",
    message: "Hi Sathya Support, I have a question about a product on Sathya Store.",
  },
  {
    label: "Return / Replacement",
    message: "Hi Sathya Support, I need help with a return or replacement request.",
  },
  {
    label: "Payment / EMI",
    message: "Hi Sathya Support, I need assistance with payment or EMI options.",
  },
];

const CALLBACK_TOPICS = [
  "Order & Delivery",
  "Product & Offers",
  "Return / Refund",
  "Installation & Warranty",
  "Other",
];

const CALLBACK_SLOTS = [
  "ASAP (Within 30 mins)",
  "Morning (9:30 AM – 1 PM)",
  "Afternoon (1 PM – 5 PM)",
  "Evening (5 PM – 9:30 PM)",
];

const FAQ_CATEGORIES = [
  "All",
  "Orders & Delivery",
  "Payments & EMI",
  "Returns & Refunds",
  "Warranty & Installation",
];

const FAQS = [
  {
    category: "Orders & Delivery",
    question: "How can I track my Sathya Store order?",
    answer:
      "You can track your order anytime using the Track Your Order tool above with your Order Number and Mobile/Email, or by visiting My Orders after signing in.",
  },
  {
    category: "Orders & Delivery",
    question: "What are the delivery timelines for appliances and electronics?",
    answer:
      "Standard orders are typically delivered within 1–4 working days depending on your pincode. Heavy appliances (ACs, Refrigerators, Washing Machines, Large TVs) use Scheduled Delivery.",
  },
  {
    category: "Orders & Delivery",
    question: "Can I pick up my order from a nearby Sathya Store?",
    answer:
      "Yes! At checkout, choose Store pickup under Delivery options to collect your order from any of our 440+ stores across South India.",
  },
  {
    category: "Payments & EMI",
    question: "What payment methods and EMI options are available?",
    answer:
      "We accept UPI, Credit/Debit Cards, Net Banking, and No-Cost / Standard EMI on eligible bank cards and Bajaj Finserv EMI at checkout.",
  },
  {
    category: "Payments & EMI",
    question: "How do I get a GST invoice for my business purchase?",
    answer:
      "On the Checkout page, check 'Need a GST invoice? (Business)' and enter your valid 15-digit GSTIN before completing your payment.",
  },
  {
    category: "Returns & Refunds",
    question: "What is Sathya Store's return and replacement policy?",
    answer:
      "Eligible products carry a 3-Day Replacement policy for damaged, defective, or wrong items delivered. Please keep original packaging, invoice, and accessories intact. Visit our Cancellation Policy page for full terms.",
  },
  {
    category: "Returns & Refunds",
    question: "How long do refunds take after cancellation or return?",
    answer:
      "Once approved, refunds are initiated to your original payment method and typically reflect within 5–7 business days depending on your bank.",
  },
  {
    category: "Warranty & Installation",
    question: "How is installation arranged for ACs, TVs, and Washing Machines?",
    answer:
      "Brand-authorized technician installation is scheduled after delivery. You can also reach our support team on +91 88805 98985 (09:30 AM – 09:30 PM) or request a callback above.",
  },
  {
    category: "Warranty & Installation",
    question: "Where can I contact Sathya Customer Care?",
    answer:
      "Call or WhatsApp us at +91 88805 98985, or email info@sathya.store. Our support team is available Monday to Sunday, 09:30 AM – 09:30 PM.",
  },
];

export default function HelpCenterClient() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Order lookup state
  const [orderNumber, setOrderNumber] = useState("");
  const [orderContact, setOrderContact] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderResult, setOrderResult] = useState(null);

  // FAQ state
  const [faqSearch, setFaqSearch] = useState("");
  const [faqCategory, setFaqCategory] = useState("All");
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Callback form state
  const [cbName, setCbName] = useState("");
  const [cbPhone, setCbPhone] = useState("");
  const [cbTopic, setCbTopic] = useState(CALLBACK_TOPICS[0]);
  const [cbSlot, setCbSlot] = useState(CALLBACK_SLOTS[0]);
  const [cbOrderId, setCbOrderId] = useState("");
  const [cbNotes, setCbNotes] = useState("");
  const [cbLoading, setCbLoading] = useState(false);
  const [cbError, setCbError] = useState("");
  const [cbSuccess, setCbSuccess] = useState(null);

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const decoded = jwtDecode(token);
      setIsLoggedIn(true);
      const decodedName = decoded?.name || decoded?.username || "";
      const rawPhone = String(decoded?.phonenumber || decoded?.phone || decoded?.mobile || "").replace(/\D/g, "");
      const cleanPhone = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;
      if (decodedName) setCbName((prev) => prev || decodedName);
      if (cleanPhone.length === 10) setCbPhone((prev) => prev || cleanPhone);
    } catch {
      // Ignore invalid/expired token
    }
  }, []);

  const filteredFaqs = useMemo(() => {
    const q = faqSearch.trim().toLowerCase();
    return FAQS.filter((item) => {
      const catMatch = faqCategory === "All" || item.category === faqCategory;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [faqSearch, faqCategory]);

  const handleOrderLookup = async (e) => {
    e.preventDefault();
    setOrderError("");
    setOrderResult(null);

    if (!orderNumber.trim() || !orderContact.trim()) {
      setOrderError("Please enter both Order Number and Mobile / Email.");
      return;
    }

    setOrderLoading(true);
    try {
      const res = await fetch("/api/help/order-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          contact: orderContact.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setOrderError(data?.message || "Order not found.");
      } else {
        setOrderResult(data.order);
      }
    } catch {
      setOrderError("Unable to check order status right now. Please try again.");
    } finally {
      setOrderLoading(false);
    }
  };

  const handleCallbackSubmit = async (e) => {
    e.preventDefault();
    if (cbLoading) return;
    setCbError("");

    const cleanPhone = cbPhone.replace(/\D/g, "").slice(-10);
    if (cbName.trim().length < 2) {
      setCbError("Please enter your full name.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setCbError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setCbLoading(true);
    try {
      const res = await fetch("/api/help/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cbName.trim(),
          phone: cleanPhone,
          topic: cbTopic,
          timeSlot: cbSlot,
          orderId: cbOrderId.trim(),
          notes: cbNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setCbError(data?.message || "Failed to submit callback request.");
      } else {
        setCbSuccess(data);
        setCbNotes("");
        setCbOrderId("");
      }
    } catch {
      setCbError("Network error. Please try again.");
    } finally {
      setCbLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-[#d72828] to-[#b71c1c] text-white py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest font-semibold text-red-100 mb-1">
                Sathya Store Support
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Help Center — How can we help you today?
              </h1>
              <p className="text-sm text-red-100 mt-1.5">
                Instant WhatsApp Chat, Callback Requests &amp; Self-Service Order Tracking
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs bg-white/10 border border-white/20 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <FaClock className="text-red-100 shrink-0" />
                <span>Mon – Sun: 09:30 AM – 09:30 PM</span>
              </div>
              <span className="hidden sm:inline text-white/40">|</span>
              <a href="tel:+918880598985" className="flex items-center gap-1.5 font-semibold hover:underline">
                <FaPhoneAlt className="text-red-100 shrink-0" />
                <span>+91 88805 98985</span>
              </a>
              <span className="hidden sm:inline text-white/40">|</span>
              <a href="mailto:info@sathya.store" className="flex items-center gap-1.5 hover:underline">
                <FaEnvelope className="text-red-100 shrink-0" />
                <span>info@sathya.store</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 mt-8 space-y-8">
        {/* 1. Self-Service Quick Actions */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Self-Service</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Track Your Order */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center">
                      <FaBoxOpen className="w-4 h-4" />
                    </span>
                    <h3 className="font-semibold text-gray-900 text-sm">Track Your Order</h3>
                  </div>
                  {isLoggedIn && (
                    <Link
                      href="/orders"
                      className="text-xs font-semibold text-[#d72828] hover:underline"
                    >
                      My Orders →
                    </Link>
                  )}
                </div>

                <form onSubmit={handleOrderLookup} className="space-y-2.5">
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="Order Number (e.g. ORD-...)"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#d72828]"
                  />
                  <input
                    type="text"
                    value={orderContact}
                    onChange={(e) => setOrderContact(e.target.value)}
                    placeholder="Registered Mobile or Email"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#d72828]"
                  />
                  <button
                    type="submit"
                    disabled={orderLoading}
                    className="w-full bg-[#d72828] hover:bg-[#b71c1c] text-white text-xs font-semibold py-2 rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {orderLoading ? "Checking..." : "Check Order Status"}
                  </button>
                </form>

                {orderError && (
                  <p className="mt-2 text-xs text-red-600 font-medium">{orderError}</p>
                )}

                {orderResult && (
                  <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold text-emerald-900">
                      <span>{orderResult.orderNumber}</span>
                      <span className="uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">
                        {orderResult.status}
                      </span>
                    </div>
                    <p className="text-emerald-800">
                      Payment: <strong>{orderResult.paymentStatus}</strong> · Items:{" "}
                      <strong>{orderResult.itemCount}</strong>
                    </p>
                    <p className="text-emerald-800">
                      Total: <strong>₹{Number(orderResult.totalAmount || 0).toLocaleString("en-IN")}</strong>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Returns, Replacement & Cancellation */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <FaUndoAlt className="w-4 h-4" />
                  </span>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    Returns, Replacement &amp; Cancellation
                  </h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Eligible items are covered under Sathya&apos;s{" "}
                  <strong className="text-gray-800">3-Day Replacement</strong> policy for
                  damaged, defective, or wrong deliveries. Review full cancellation &amp; refund
                  timelines anytime.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <Link
                  href="/cancellation-policy"
                  className="text-xs font-semibold text-[#d72828] hover:underline"
                >
                  View Cancellation Policy →
                </Link>
                {isLoggedIn && (
                  <Link href="/orders" className="text-xs font-medium text-gray-600 hover:underline">
                    Manage Orders
                  </Link>
                )}
              </div>
            </div>

            {/* Find Nearest Store */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <FaStore className="w-4 h-4" />
                  </span>
                  <h3 className="font-semibold text-gray-900 text-sm">Find Nearest Store</h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Visit any of our <strong className="text-gray-800">440+ Stores in South India</strong>{" "}
                  for live product demos, in-store pickup, or local assistance.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <Link
                  href="/store"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#d72828] hover:underline"
                >
                  Open Store Locator →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Chat & Request a Callback */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chat with Us */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FaWhatsapp className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Chat with Us</h2>
                  <p className="text-xs text-gray-500">Instant WhatsApp Support (+91 88805 98985)</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                Select a topic below to start a pre-filled WhatsApp conversation with our support
                specialists.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CHAT_TOPICS.map((topic) => (
                  <a
                    key={topic.label}
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(topic.message)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-900 text-xs font-semibold transition-colors"
                  >
                    <span>{topic.label}</span>
                    <FaWhatsapp className="w-4 h-4 text-emerald-600 shrink-0" />
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Available 09:30 AM – 09:30 PM</span>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-emerald-700 hover:underline"
              >
                Open WhatsApp →
              </a>
            </div>
          </div>

          {/* Request a Callback */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-red-50 text-[#d72828] flex items-center justify-center">
                <FaHeadset className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900">Request a Callback</h2>
                <p className="text-xs text-gray-500">
                  Leave your details and our team will call you back at your preferred time.
                </p>
              </div>
            </div>

            {cbSuccess ? (
              <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <FaCheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Callback Request Confirmed!</span>
                </div>
                <p className="text-xs text-emerald-900">
                  Reference ID: <strong className="font-mono">{cbSuccess.referenceId}</strong>
                </p>
                <p className="text-xs text-emerald-800">
                  Topic: <strong>{cbSuccess.topic}</strong> · Preferred Slot:{" "}
                  <strong>{cbSuccess.timeSlot}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => setCbSuccess(null)}
                  className="mt-2 inline-block text-xs font-semibold text-emerald-800 underline cursor-pointer"
                >
                  Submit another request
                </button>
              </div>
            ) : (
              <form onSubmit={handleCallbackSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={cbName}
                      onChange={(e) => setCbName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                      className="w-full text-xs px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-[#d72828]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Mobile Number <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="tel"
                      value={cbPhone}
                      onChange={(e) => setCbPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      required
                      className="w-full text-xs px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-[#d72828]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Topic</label>
                    <select
                      value={cbTopic}
                      onChange={(e) => setCbTopic(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-[#d72828]"
                    >
                      {CALLBACK_TOPICS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Preferred Time Slot
                    </label>
                    <select
                      value={cbSlot}
                      onChange={(e) => setCbSlot(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-[#d72828]"
                    >
                      {CALLBACK_SLOTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Order ID (optional)
                    </label>
                    <input
                      type="text"
                      value={cbOrderId}
                      onChange={(e) => setCbOrderId(e.target.value)}
                      placeholder="e.g. ORD-..."
                      className="w-full text-xs px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-[#d72828]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Notes (optional)
                    </label>
                    <input
                      type="text"
                      value={cbNotes}
                      onChange={(e) => setCbNotes(e.target.value)}
                      placeholder="Brief details about your query"
                      className="w-full text-xs px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-[#d72828]"
                    />
                  </div>
                </div>

                {cbError && <p className="text-xs text-red-600 font-medium">{cbError}</p>}

                <button
                  type="submit"
                  disabled={cbLoading}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#d72828] hover:bg-[#b71c1c] text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {cbLoading ? "Submitting..." : "Request Callback"}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* 3. Searchable FAQ Accordion */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Frequently Asked Questions</h2>
              <p className="text-xs text-gray-500">Quick answers on orders, delivery, EMI &amp; returns</p>
            </div>
            <div className="relative w-full sm:w-72">
              <FaSearch className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={faqSearch}
                onChange={(e) => {
                  setFaqSearch(e.target.value);
                  setOpenFaqIndex(0);
                }}
                placeholder="Search FAQs..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#d72828]"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {FAQ_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setFaqCategory(cat);
                  setOpenFaqIndex(0);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  faqCategory === cat
                    ? "bg-[#d72828] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredFaqs.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">
              No matching FAQs found. Try another keyword or chat with us on WhatsApp.
            </p>
          ) : (
            <div className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden">
              {filteredFaqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={faq.question} className="bg-white">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                      className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#d72828] block mb-0.5">
                          {faq.category}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{faq.question}</span>
                      </div>
                      <FaChevronDown
                        className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-xs text-gray-600 leading-relaxed bg-gray-50/50">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
