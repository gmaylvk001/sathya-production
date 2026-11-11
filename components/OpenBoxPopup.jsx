'use client';

import React from 'react';
import { FaPhoneAlt, FaEnvelope, FaTimes } from 'react-icons/fa';
import { CLEARANCE_CONTACT } from '@/lib/openBoxHelper';

/**
 * OpenBoxPopup
 * Isolated, modern, offline-resilient modal for EOL / FOCUS clearance products.
 * Uses 100% inline SVG illustrations (zero external CDN or broken image dependencies).
 */
export function OpenBoxPopup({
  onClose,
  productName = 'Clearance Product',
  productSlug = '',
  stockQuantity = 1,
}) {
  const phone = CLEARANCE_CONTACT?.phone || '9842344323';
  const phoneDisplay = CLEARANCE_CONTACT?.phoneDisplay || '98423 44323';
  const email = CLEARANCE_CONTACT?.email || 'customercare@sathya.store';

  const productUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/product/${productSlug}`
    : `https://sathya.store/product/${productSlug}`;

  const mailUrl = `mailto:${email}?subject=${encodeURIComponent(
    `Clearance Unit Enquiry: ${productName}`
  )}&body=${encodeURIComponent(
    `Hi Sathya Stores Team,\n\nI am interested in purchasing this clearance/open-box item:\n\nProduct: ${productName}\nLink: ${productUrl}\n\nPlease confirm availability, physical unit condition, and store pickup options.\n\nThank you!`
  )}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="open-box-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && typeof onClose === 'function') {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative overflow-hidden transition-all">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors cursor-pointer"
        >
          <FaTimes size={14} />
        </button>

        {/* Hero Vector Illustration (100% Inline SVG, Zero Broken Images) */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 p-3 rounded-full flex items-center justify-center relative shadow-inner mb-3">
            <svg
              className="w-9 h-9 text-amber-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
              <path d="m7.5 4.5 9 5" />
            </svg>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 text-white text-[9px] font-bold items-center justify-center">
                ✦
              </span>
            </span>
          </div>

          {/* Title */}
          <h3
            id="open-box-title"
            className="text-xl font-bold text-gray-900 tracking-tight"
          >
            Open Box Product
          </h3>

          {/* Alert Badge */}
          <div className="mt-2">
            <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Limited Stock Available (Only {stockQuantity} units left!)</span>
            </span>
          </div>

          {/* Sub-header description */}
          <p className="text-xs text-gray-600 leading-relaxed text-center px-2 mt-3">
            This is an{' '}
            <strong className="text-amber-800 font-semibold">
              Open Box / Clearance Sale
            </strong>{' '}
            item with limited stock availability. Home delivery may not be
            available for this unit. Please contact our team directly to check
            showroom availability, condition, price, and pickup options.
          </p>
        </div>

        {/* 3 Service Features Checklist Cards */}
        <div className="grid grid-cols-3 gap-2 my-4">
          <div className="bg-gray-50/80 hover:bg-gray-50 border border-gray-100 rounded-xl p-2.5 flex flex-col items-center text-center transition-colors">
            <div className="w-7 h-7 rounded-lg bg-white border border-gray-200/60 flex items-center justify-center text-gray-700 mb-1.5 shadow-2xs">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              </svg>
            </div>
            <span className="text-[10px] font-bold text-gray-800 leading-tight">Store Pickup</span>
            <span className="text-[9px] text-gray-500 leading-tight mt-0.5">Recommended</span>
          </div>

          <div className="bg-gray-50/80 hover:bg-gray-50 border border-gray-100 rounded-xl p-2.5 flex flex-col items-center text-center transition-colors">
            <div className="w-7 h-7 rounded-lg bg-white border border-gray-200/60 flex items-center justify-center text-gray-700 mb-1.5 shadow-2xs">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <span className="text-[10px] font-bold text-gray-800 leading-tight">Limited Stock</span>
            <span className="text-[9px] text-gray-500 leading-tight mt-0.5">Available</span>
          </div>

          <div className="bg-gray-50/80 hover:bg-gray-50 border border-gray-100 rounded-xl p-2.5 flex flex-col items-center text-center transition-colors">
            <div className="w-7 h-7 rounded-lg bg-white border border-gray-200/60 flex items-center justify-center text-gray-700 mb-1.5 shadow-2xs">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
            </div>
            <span className="text-[10px] font-bold text-gray-800 leading-tight">Quality Checked</span>
            <span className="text-[9px] text-gray-500 leading-tight mt-0.5">Sathya Team</span>
          </div>
        </div>

        {/* Final Confirmed Price Notice Note */}
        <div className="bg-rose-50/60 border border-rose-100 rounded-lg p-2.5 text-xs text-rose-800 text-center font-medium flex items-center justify-center gap-2 mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d72828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span className="text-[11px] leading-tight">
            Final price & showroom availability will be confirmed by Sathya Stores team.
          </span>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col gap-2.5">
          <a
            href={`tel:${phone}`}
            className="bg-[#d72828] hover:bg-red-700 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] shadow-md shadow-red-500/10 cursor-pointer"
          >
            <FaPhoneAlt className="w-4 h-4 text-white shrink-0" />
            <div className="flex items-center gap-1.5 text-sm">
              <span>Call Us:</span>
              <span className="font-extrabold tracking-wide">{phoneDisplay}</span>
            </div>
          </a>

          <a
            href={mailUrl}
            className="bg-slate-900 hover:bg-slate-800 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] cursor-pointer"
          >
            <FaEnvelope className="w-4 h-4 text-white shrink-0" />
            <div className="flex items-center gap-1.5 text-sm">
              <span>Email Us:</span>
              <span className="font-normal opacity-90 text-xs">{email}</span>
            </div>
          </a>
        </div>

        {/* Privacy Note */}
        <div className="flex items-center justify-center gap-1.5 mt-3.5 text-[10.5px] text-gray-400">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          </svg>
          <span>Your details are safe with us. Authorized Sathya Clearance Support.</span>
        </div>
      </div>
    </div>
  );
}

export default OpenBoxPopup;
