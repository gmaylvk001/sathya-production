"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  FiTruck,
  FiCalendar,
  FiMail,
  FiPhone,
  FiMapPin,
  FiShield,
  FiHelpCircle,
  FiPlus,
  FiMinus,
  FiCheckCircle,
} from "react-icons/fi";
import { FaStore, FaUsers, FaTools, FaWind, FaTv, FaSnowflake } from "react-icons/fa";
import { GiWashingMachine } from "react-icons/gi";
import { MdMicrowave, MdLocalShipping, MdSettings } from "react-icons/md";
import { BsDropletHalf } from "react-icons/bs";

const installationProducts = [
  { name: "Air Conditioners", icon: FaSnowflake },
  { name: "Televisions", icon: FaTv },
  { name: "Refrigerators", icon: BsDropletHalf },
  { name: "Washing Machines", icon: GiWashingMachine },
  { name: "Dishwashers", icon: FaWind },
  { name: "Microwaves", icon: MdMicrowave },
];

const faqs = [
  {
    question: "How long does Sathya Stores take to deliver appliances?",
    answer:
      "Most orders are delivered within 2-5 working days. Customers near our showrooms may be eligible for same-day or next-day local delivery.",
  },
  {
    question: "Does Sathya Stores provide AC installation?",
    answer:
      "Yes, AC installation is arranged through our authorized brand service partners within 24-48 hours of delivery.",
  },
  {
    question: "Does Sathya Stores deliver TVs, refrigerators, and washing machines?",
    answer:
      "Yes, we deliver all major home appliances including TVs, refrigerators, washing machines, air conditioners and more across Tamil Nadu.",
  },
  {
    question: "Can I pickup my order from a Sathya Stores showroom?",
    answer:
      "Yes, you can choose the Store Pickup option at checkout and collect your order from your nearest Sathya Stores showroom once it's ready.",
  },
  {
    question: "Does Sathya Stores deliver outside Coimbatore?",
    answer:
      "Yes, we deliver across Tamil Nadu through our network of stores, covering major cities and surrounding areas.",
  },
  {
    question: "Which areas does Sathya Stores deliver in Tamil Nadu?",
    answer:
      "We currently deliver to Coimbatore, Salem, Erode, Tirupur, Namakkal, Dharmapuri, Krishnagiri, Trichy and many more locations across Tamil Nadu.",
  },
  {
    question: "How can I track my Sathya Stores order?",
    answer:
      "You can track your order anytime using the 'Track Order' option on our website, or by contacting our customer support team.",
  },
];

const ShippingPolicy = () => {
  const [lastUpdated, setLastUpdated] = useState("");
  const [openFaq, setOpenFaq] = useState(null);
  
  // Dynamic database states
  const [storesList, setStoresList] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [showAllCities, setShowAllCities] = useState(false);

  useEffect(() => {
    setLastUpdated(
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );

    // Dynamic Database Fetching Pipeline
    async function fetchDatabaseCities() {
      try {
        const res = await fetch("/api/store/get");
        const data = await res.json();
        if (data.success) {
          setStoresList(data.data.filter((s) => s.status === "Active"));
        }
      } catch (err) {
        console.error("Failed to dynamically load database locations:", err);
      } finally {
        setLoadingLocations(false);
      }
    }
    fetchDatabaseCities();
  }, []);

  // Dynamically computes unique, clean, sorted city profiles directly from the DB response
  const dbCities = useMemo(() => {
    return [...new Set(storesList.map((s) => s.city).filter(Boolean))]
      .filter((city) => city.toUpperCase().trim() !== "AMBASAMUTHIRAM") // Case-insensitive exclusion
      .sort();
  }, [storesList]);

  const visibleCities = showAllCities ? dbCities : dbCities.slice(0, 8);
  const hasMoreCities = dbCities.length > 8;
  
  // Calculates the dynamic store count based on active database rows (fallback to 47)
  const storeCount = storesList.length > 0 ? storesList.length : 47;

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="w-full max-w-full sm:max-w-[720px] md:max-w-[960px] lg:max-w-[1320px] xl:max-w-[1520px] 2xl:max-w-[1680px] mx-auto px-0 sm:px-3 md:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="max-w-12xl mx-auto px-4 md:px-6 pt-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-[#d72828] flex items-center gap-1">
            <span>🏠</span> Home
          </Link>
          <span>›</span>
          <Link href="/privacy-policy" className="hover:text-[#d72828]">
            Policies
          </Link>
          <span>›</span>
          <span className="text-[#d72828] font-medium">Shipping &amp; Delivery Policy</span>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-12xl mx-auto px-4 md:px-6 pt-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <FiTruck className="text-[#d72828] text-2xl" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#d72828] mb-2">
              Shipping &amp; Delivery Policy
            </h1>
            <h2 className="text-lg md:text-xl font-semibold text-[#d72828] mb-4">
              Fast &amp; reliable electronics delivery across Tamil Nadu
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Sathya Stores delivers televisions,
              refrigerators, washing machines, air conditioners and home
              appliances across Tamil Nadu through our {storeCount}+ showroom network.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FiCalendar />
              <span>Last updated: {lastUpdated}</span>
            </div>
          </div>
          <div className="flex justify-center">
            <img
              src="/store/BEA_Service_Lorry.png"
              alt="Sathya Stores delivery truck and tracking"
              className="w-full h-auto max-h-80 object-contain"
            />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-12xl mx-auto px-4 md:px-6 pb-16 space-y-6">
        {/* Row 1: Delivery Coverage + Delivery Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Delivery Coverage */}
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
            <h3 className="text-xl font-bold text-[#d72828] flex items-center gap-2 mb-2">
              <FiMapPin className="text-[#d72828]" />
              1. Delivery Coverage
            </h3>
            <p className="text-gray-600 mb-4">
              We deliver across Tamil Nadu through our extensive {storeCount}+ showroom
              network. Our major service locations include:
            </p>
            <div className="flex flex-wrap gap-2">
              {loadingLocations ? (
                <span className="text-xs text-gray-400 animate-pulse py-1">Loading locations from database...</span>
              ) : (
                <>
                  {visibleCities.map((city, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1.5 text-sm text-gray-700 bg-gray-50"
                    >
                      <FiMapPin className="text-[#d72828] text-xs flex-shrink-0" />
                      {city}
                    </span>
                  ))}
                  
                  {/* Dynamic interactive badge toggle that triggers layout expansion cleanly */}
                  {!showAllCities && hasMoreCities && (
                    <button
                      type="button"
                      onClick={() => setShowAllCities(true)}
                      className="inline-flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1.5 text-sm text-gray-700 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors focus:outline-none"
                    >
                      <FiMapPin className="text-[#d72828] text-xs flex-shrink-0" />
                      more...
                    </button>
                  )}
                  {showAllCities && (
                    <button
                      type="button"
                      onClick={() => setShowAllCities(false)}
                      className="inline-flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1.5 text-sm text-gray-700 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors focus:outline-none"
                    >
                      <FiMapPin className="text-[#d72828] text-xs flex-shrink-0" />
                      show less...
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 2. Delivery Timeline */}
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
            <h3 className="text-xl font-bold text-[#d72828] flex items-center gap-2 mb-4">
              <FiCalendar className="text-[#d72828]" />
              2. Delivery Timeline
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <MdLocalShipping className="text-green-600 text-2xl mx-auto mb-2" />
                <p className="font-semibold text-gray-800 text-sm mb-1">
                  Local Delivery
                  <br />
                  (Same / Next Day)*
                </p>
                <p className="text-xs text-gray-500">
                  Available for pin codes near Sathya Stores showrooms.
                </p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4 text-center">
                <MdLocalShipping className="text-indigo-600 text-2xl mx-auto mb-2" />
                <p className="font-semibold text-gray-800 text-sm mb-1">
                  Standard Delivery
                  <br />
                  (2 - 5 Working Days)
                </p>
                <p className="text-xs text-gray-500">
                  For all other locations across Tamil Nadu.
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <FaTools className="text-purple-600 text-2xl mx-auto mb-2" />
                <p className="font-semibold text-gray-800 text-sm mb-1">
                  Authorized Installation Support
                  <br />
                  (Within 24 - 48 Hrs)
                </p>
                <p className="text-xs text-gray-500">
                  Installation will be arranged through authorized brand
                  service partners.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Store Pickup + Delivery Process */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 3. Store Pickup Option */}
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
            <h3 className="text-xl font-bold text-[#d72828] flex items-center gap-2 mb-4">
              <FaStore className="text-[#d72828]" />
              3. Store Pickup Option
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <FiCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
                  Customers can choose Store Pickup at checkout and collect
                  their order from the nearest Sathya Stores showroom.
                </li>
                <li className="flex items-start gap-2">
                  <FiCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
                  Convenient and contactless pickup
                </li>
                <li className="flex items-start gap-2">
                  <FiCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
                  Our team will keep your product ready for collection
                </li>
              </ul>
             <div className="rounded-xl overflow-hidden">
  <img
    src="/store/BEA_Store.png"
    alt="Sathya Stores store pickup"
    className="w-full h-auto object-cover"
  />
</div>
            </div>
          </div>

          {/* 4. Delivery Process */}
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
            <h3 className="text-xl font-bold text-[#d72828] flex items-center gap-2 mb-4">
              <MdLocalShipping className="text-[#d72828]" />
              4. Delivery Process
            </h3>
            <p className="text-gray-600 mb-6">
              We follow a safe and transparent delivery process to ensure
              your product reaches you in perfect condition.
            </p>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {[
                { label: "Order Confirmed", icon: FiCheckCircle },
                { label: "Product Packed", icon: FiCheckCircle },
                { label: "Delivery Scheduled", icon: FiCalendar },
                { label: "Delivered Safely", icon: FiShield },
                { label: "Installation Support", icon: FaTools },
              ].map((step, idx, arr) => (
                <React.Fragment key={step.label}>
                  <div className="flex flex-col items-center text-center w-20">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-[#d72828] mb-2">
                      <step.icon />
                    </div>
                    <span className="text-xs text-gray-600">{step.label}</span>
                  </div>
                  {idx < arr.length - 1 && (
                    <span className="text-gray-300 hidden sm:inline">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Installation Support */}
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
          <h3 className="text-xl font-bold text-[#d72828] flex items-center gap-2 mb-4">
            <FaTools className="text-[#d72828]" />
            5. Installation Support
          </h3>

          {/* 3-Column Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left Column: Description & Products (Span 6) */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-gray-600 mb-6 font-medium">
                Installation will be arranged through authorized brand service
                partners for the following products:
              </p>
              
              <div className="flex flex-wrap gap-4">
                {installationProducts.map((p) => (
                  <div
                    key={p.name}
                    className="w-[80px] h-[85px] flex flex-col items-center justify-center border border-gray-200 rounded-xl bg-white hover:shadow-md transition-shadow gap-3 p-2"
                  >
                    <p.icon className="text-3xl text-gray-600" />
                    <span className="text-[11px] text-gray-700 text-center font-semibold leading-tight">
                      {p.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Middle Column: Benefits List (Span 3) */}
            <div className="lg:col-span-3 flex flex-col justify-center border-t border-gray-100 pt-6 lg:pt-0 lg:border-t-0 lg:border-l lg:border-gray-100 lg:pl-8 mt-4 lg:mt-0">
              <ul className="space-y-5 text-gray-700 font-medium text-sm">
                <li className="flex items-center gap-3">
                  <FiCheckCircle className="text-green-500 text-xl flex-shrink-0" />
                  Genuine Installation
                </li>
                <li className="flex items-center gap-3">
                  <FiCheckCircle className="text-green-500 text-xl flex-shrink-0" />
                  Trained Technicians
                </li>
                <li className="flex items-center gap-3">
                  <FiCheckCircle className="text-green-500 text-xl flex-shrink-0" />
                  Brand Warranty Protected
                </li>
                <li className="flex items-center gap-3">
                  <FiCheckCircle className="text-green-500 text-xl flex-shrink-0" />
                  Safe &amp; Professional Service
                </li>
              </ul>
            </div>

            {/* Right Column: Full-height Image (Span 3) */}
            <div className="lg:col-span-3 min-h-[250px] rounded-xl overflow-hidden relative mt-6 lg:mt-0">
              <img
                src="/store/BEA_Service.png"
                alt="Technician installing appliance"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            </div>
            
          </div>
        </div>

        {/* Row 4: Why Trust + Need Help */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 6. Why Trust Sathya Stores Delivery */}
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
            <h3 className="text-xl font-bold text-[#d72828] flex items-center gap-2 mb-4">
              <FiShield className="text-[#d72828]" />
              6. Why Trust Sathya Stores Delivery?
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="border border-gray-100 rounded-lg p-4 text-center">
                <FaStore className="text-[#d72828] text-xl mx-auto mb-2" />
                <p className="font-bold text-gray-800">{storeCount}+</p>
                <p className="text-xs text-gray-500">Stores Across Tamil Nadu</p>
              </div>
              <div className="border border-gray-100 rounded-lg p-4 text-center">
                <FaUsers className="text-[#d72828] text-xl mx-auto mb-2" />
                <p className="font-bold text-gray-800">50 Lakh+</p>
                <p className="text-xs text-gray-500">Happy Customers</p>
              </div>
              <div className="border border-gray-100 rounded-lg p-4 text-center">
                <FiShield className="text-[#d72828] text-xl mx-auto mb-2" />
                <p className="font-bold text-gray-800">Authorized</p>
                <p className="text-xs text-gray-500">Brand Partner</p>
              </div>
              <div className="border border-gray-100 rounded-lg p-4 text-center">
                <MdSettings className="text-[#d72828] text-xl mx-auto mb-2" />
                <p className="font-bold text-gray-800">Expert</p>
                <p className="text-xs text-gray-500">Installation Support</p>
              </div>
            </div>
          </div>

          {/* 7. Need Help With Your Delivery */}
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
            <h3 className="text-xl font-bold text-[#d72828] flex items-center gap-2 mb-2">
              <FiHelpCircle className="text-[#d72828]" />
              7. Need Help With Your Delivery?
            </h3>
            <p className="text-gray-600 mb-4">
              Our support team is here to help you.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href="tel:9842344323"
                className="border border-gray-100 rounded-lg p-4 text-center hover:bg-red-50 transition-colors"
              >
                <FiPhone className="text-[#d72828] text-xl mx-auto mb-2" />
                <p className="font-semibold text-gray-800 text-sm">Call Support</p>
                <p className="text-sm text-gray-600">9842344323</p>
                <p className="text-xs text-gray-400">(9 AM - 9 PM)</p>
              </a>
              <a
                href="mailto:customercare@sathya.store"
                className="border border-gray-100 rounded-lg p-4 text-center hover:bg-red-50 transition-colors"
              >
                <FiMail className="text-[#d72828] text-xl mx-auto mb-2" />
                <p className="font-semibold text-gray-800 text-sm">Email Support</p>
                <p className="text-sm text-gray-600 break-all">
                  customercare@sathya.store
                </p>
              </a>
            </div>
          </div>
        </div>

        {/* Row 5: FAQs */}
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
          <h3 className="text-xl font-bold text-[#d72828] flex items-center gap-2 mb-4">
            <FiHelpCircle className="text-[#d72828]" />
            8. Frequently Asked Questions
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="border-b border-gray-100 py-3 cursor-pointer"
                onClick={() => toggleFaq(idx)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800">
                    {idx + 1}. {faq.question}
                  </p>
                  {openFaq === idx ? (
                    <FiMinus className="text-[#d72828] flex-shrink-0" />
                  ) : (
                    <FiPlus className="text-[#d72828] flex-shrink-0" />
                  )}
                </div>
                {openFaq === idx && (
                  <p className="text-sm text-gray-500 mt-2 pr-6">{faq.answer}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingPolicy;