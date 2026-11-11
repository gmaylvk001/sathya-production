"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from '@iconify/react';
import { getDiscountInfo } from "@/lib/discountHelper";
import { useRegion } from "@/context/RegionContext";
import { useFilteredStores } from "@/hooks/useFilteredStores";

export default function OfferClient({ offer, products }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stores, setStores] = useState([]);
  const { district: userDistrict, city: userCity } = useRegion();
  const activeDistrict = userDistrict || userCity || '';
  const { filteredStores, isFallback, fallbackMessage } = useFilteredStores(stores, activeDistrict);
  
  // Form State
  const [formData, setFormData] = useState({
    lead_type: 'Enquiry',
    name: '',
    email: '',
    mobile: '',
    product: '',
    invoice: '',
    store: '',
    message: '',
    timings: '10 - 12AM'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    // Fetch store listings
    const fetchStores = async () => {
      try {
        const res = await fetch("/api/store_listings/get");
        if (res.ok) {
          const data = await res.json();
          setStores(Array.isArray(data) ? data : (data.storeListing || []));
        }
      } catch (error) {
        console.error("Error fetching stores", error);
      }
    };
    fetchStores();
  }, []);

  const handleOpenModal = (productName = "") => {
    setFormData(prev => ({
      ...prev,
      product: productName,
      lead_type: 'Enquiry'
    }));
    setIsModalOpen(true);
  };

  const getCookie = (name) => {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client Validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.mobile.trim() || !formData.store) {
      alert("Please fill in all required fields (Name, Email, Mobile, Store)");
      return;
    }
    
    if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
      alert("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsSubmitting(true);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const payload = {
        ...formData,
        lead_title: "Special Event Offer",
        referrel_url: window.location.href,
        utm_source: urlParams.get('utm_source') || '',
        utm_campaign: urlParams.get('utm_campaign') || '',
        cookie_id: getCookie('emaduuid') || ''
      };

      const res = await fetch("/api/connect-store-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setToastMessage(data.message || "Thank you!. Your message has been sent.");
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        alert(data.message || "Failed to submit enquiry. Please try again.");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Submission Error", error);
      alert("Something went wrong. Please try again later.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-12 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded shadow-lg transition-opacity duration-300">
          {toastMessage}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="bg-white py-3 border-b">
        <div className="container mx-auto px-4 lg:px-8 flex justify-end">
          <div className="text-sm text-gray-500 font-medium">
            <Link href="/" className="hover:text-red-600">HOME</Link>
            <span className="mx-2">/</span>
            <span className="uppercase">{offer.offerName}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 mt-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold text-red-600 uppercase">{offer.offerName}</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => handleOpenModal("")}
              className="bg-red-600 text-white font-bold px-4 py-2 text-sm hover:bg-red-700 transition"
            >
              Enquire Now
            </button>
          </div>
        </div>

        {/* Product Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {products.map((product) => (
              <div key={product._id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden group">
                <div className="p-4 flex justify-center items-center h-48 bg-white relative">
                  {product.primaryImage ? (
                    <Image
                      src={`/uploads/OfferProducts/${product.primaryImage}`}
                      alt={product.productName}
                      fill
                      className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                  ) : (
                    <div className="text-gray-300 text-sm">No Image Available</div>
                  )}
                </div>
                <div className="p-4 text-center border-t border-gray-50">
                  <h3 className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[40px] mb-2">{product.productName}</h3>
                  {(() => {
                    const { showDiscount } = getDiscountInfo(product.price, product.specialPrice);
                    return (
                      <div className="flex justify-center items-baseline gap-2 mb-4">
                        {showDiscount && (
                          <span className="text-gray-400 text-sm line-through">₹{parseFloat(product.price).toLocaleString()}</span>
                        )}
                        <span className="text-gray-900 font-bold text-lg">
                          ₹{parseFloat(showDiscount ? product.specialPrice : (product.specialPrice || product.price)).toLocaleString()}
                        </span>
                      </div>
                    );
                  })()}
                  <button 
                    onClick={() => handleOpenModal(product.productName)}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold w-full py-2 text-sm transition-colors"
                  >
                    KNOW MORE
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No products found for this offer yet.
          </div>
        )}
      </div>

      {/* Enquiry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white shadow-xl w-full max-w-md relative flex flex-col max-h-[90vh]">
            {/* Close Button */}
            <button 
              onClick={() => !isSubmitting && setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl leading-none"
            >
              &times;
            </button>

            {/* Modal Header */}
            <div className="px-4 py-3 text-center border-b border-gray-200 shrink-0">
              <h2 className="text-lg font-semibold text-red-600 mb-1">CONNECT TO STORE</h2>
              <p className="text-gray-500 text-xs">
                Fill in the form below. Our store manager will get in touch with you soon!
              </p>
            </div>

            {/* Modal Body */}
            <div className="px-5 py-4 overflow-y-auto">
              <h3 className="font-semibold text-gray-800 text-[13px] mb-3">Leave Your Details For Us To Call You Back</h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                
                <div>
                  <select
                    value={formData.lead_type}
                    onChange={(e) => setFormData({ ...formData, lead_type: e.target.value, invoice: '', product: '' })}
                    className="w-full border border-gray-300 rounded py-2 px-2 text-[13px] text-gray-700 focus:outline-none focus:border-gray-400"
                    required
                  >
                    <option value="Enquiry">Enquiry</option>
                    <option value="Complaint">Complaint</option>
                  </select>
                </div>

                {formData.lead_type === 'Enquiry' ? (
                  <div>
                    <input
                      type="text"
                      placeholder="Product looking for"
                      value={formData.product}
                      onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                      className="w-full border border-gray-300 rounded py-2 px-2 text-[13px] text-gray-700 focus:outline-none focus:border-gray-400"
                    />
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="Invoice ID"
                      value={formData.invoice}
                      onChange={(e) => setFormData({ ...formData, invoice: e.target.value })}
                      className="w-full border border-gray-300 rounded py-2 px-2 text-[13px] text-gray-700 focus:outline-none focus:border-gray-400"
                      required
                    />
                  </div>
                )}

                <div>
                  <input
                    type="text"
                    placeholder="Name *"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded py-2 px-2 text-[13px] text-gray-700 focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
                
                <div>
                  <input
                    type="email"
                    placeholder="Email *"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded py-2 px-2 text-[13px] text-gray-700 focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
                
                <div>
                  <input
                    type="tel"
                    placeholder="Mobile *"
                    maxLength={10}
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })}
                    className="w-full border border-gray-300 rounded py-2 px-2 text-[13px] text-gray-700 focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
                
                <div>
                  <select
                    value={formData.store}
                    onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                    className="w-full border border-gray-300 rounded py-2 px-2 text-[13px] text-gray-700 focus:outline-none focus:border-gray-400"
                    required
                  >
                    <option value="">
                      {isFallback && fallbackMessage
                        ? `${fallbackMessage} - Showing all stores`
                        : activeDistrict
                        ? `Select store near you (${activeDistrict.charAt(0).toUpperCase() + activeDistrict.slice(1)}) *`
                        : "Select store near you *"}
                    </option>
                    {filteredStores.map(s => (
                      <option key={s._id} value={s._id}>{s.title || s.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <textarea
                    placeholder="Remark"
                    rows="2"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full border border-gray-300 rounded py-2 px-2 text-[13px] text-gray-700 focus:outline-none focus:border-gray-400 resize-none"
                  ></textarea>
                </div>
                
                <div className="pt-1">
                  <h3 className="font-semibold text-gray-800 text-[13px] mb-2">Preferred time to call back?</h3>
                  <select
                    value={formData.timings}
                    onChange={(e) => setFormData({ ...formData, timings: e.target.value })}
                    className="w-full border border-gray-300 rounded py-2 px-2 text-[13px] text-gray-700 focus:outline-none focus:border-gray-400"
                  >
                    <option value="10 - 12AM">10 - 12 AM</option>
                    <option value="12 - 02PM">12 - 02 PM</option>
                    <option value="02 - 04PM">02 - 04 PM</option>
                    <option value="04 - 06PM">04 - 06 PM</option>
                    <option value="06 - 08PM">06 - 08 PM</option>
                  </select>
                </div>

                <div className="pt-4 pb-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#d72828] hover:bg-red-700 disabled:opacity-50 text-white font-bold w-full py-2.5 rounded text-sm tracking-wide transition-colors"
                  >
                    {isSubmitting ? "SUBMITTING..." : "SUBMIT ENQUIRY"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
