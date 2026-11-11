"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { X, Check, Copy, Share2 } from "lucide-react";
import { FaWhatsapp, FaFacebookF, FaXTwitter, FaEnvelope } from "react-icons/fa6";
import { toast } from "react-toastify";
import { getDiscountInfo } from "@/lib/discountHelper";

const ASSET_FALLBACK_BASE = (process.env.NEXT_PUBLIC_ASSET_FALLBACK_URL || "https://estore.bharathelectronics.in").replace(/\/+$/, "");

export default function ShareModal({ isOpen, onClose, product }) {
  const [copied, setCopied] = useState(false);
  const [canWebShare, setCanWebShare] = useState(false);
  const [imgSrc, setImgSrc] = useState("/uploads/products/placeholder.jpg");
  const [retryFailed, setRetryFailed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && !!navigator.share) {
      setCanWebShare(true);
    }
  }, []);

  useEffect(() => {
    if (product) {
      const validImage = Array.isArray(product.images)
        ? product.images.find(img => img && typeof img === "string" && img.trim() !== "" && img.trim().toLowerCase() !== "null" && img.trim().toLowerCase() !== "undefined")
        : (typeof product.images === "string" && product.images.trim() ? product.images : null);

      const raw = validImage || product.imgSrc || product.image || "";
      if (raw) {
        if (raw.startsWith("http")) {
          setImgSrc(raw);
        } else {
          const clean = raw.replace(/^\/?(uploads\/products\/)?/, "").replace(/^\/+/, "");
          setImgSrc(`/uploads/products/${clean}`);
        }
      } else {
        setImgSrc("/uploads/products/placeholder.jpg");
      }
      setRetryFailed(false);
    }
  }, [product]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const productUrl = typeof window !== "undefined" 
    ? window.location.href 
    : `https://sathyastore.com/product/${product.slug || product._id}`;

  const sellingPrice = Number(product.special_price > 0 ? product.special_price : product.price || 0);
  const originalPrice = Number(product.price || 0);
  const { discountPercent, showDiscount: hasDiscount } = getDiscountInfo(originalPrice, sellingPrice);

  const shareText = `Check out ${product.name} on Sathya Store at ₹${sellingPrice.toLocaleString("en-IN")}!`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(productUrl);
      } else {
        const input = document.createElement("input");
        input.value = productUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopied(true);
      toast.success("Link copied to clipboard!", { autoClose: 2000, position: "bottom-center" });
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleDeviceShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: shareText,
          url: productUrl,
        });
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Device share failed:", err);
        }
      }
    }
  };

  const socialChannels = [
    {
      name: "WhatsApp",
      shortName: "WhatsApp",
      icon: FaWhatsapp,
      color: "bg-[#25D366] hover:bg-[#20bd5a] text-white",
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${productUrl}`)}`,
    },
    {
      name: "Facebook",
      shortName: "Facebook",
      icon: FaFacebookF,
      color: "bg-[#1877F2] hover:bg-[#0d65d9] text-white",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`,
    },
    {
      name: "X (Twitter)",
      shortName: "X",
      icon: FaXTwitter,
      color: "bg-black hover:bg-neutral-800 text-white",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(productUrl)}`,
    },
    {
      name: "Email",
      shortName: "Email",
      icon: FaEnvelope,
      color: "bg-[#d72828] hover:bg-red-700 text-white",
      href: `mailto:?subject=${encodeURIComponent(product.name)}&body=${encodeURIComponent(`${shareText}\n\nView details: ${productUrl}`)}`,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all animate-scaleUp my-auto box-border"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-red-50 text-[#d72828] flex items-center justify-center shrink-0">
              <Share2 size={16} />
            </div>
            <h3 id="share-modal-title" className="text-sm sm:text-base font-bold text-gray-900 truncate">
              Share Product
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors shrink-0 ml-2 cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 w-full min-w-0 overflow-hidden box-border">
          {/* Product Mini Preview */}
          <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 rounded-xl border border-gray-200/80 w-full min-w-0 overflow-hidden">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-lg border border-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center p-1">
              <Image
                src={imgSrc}
                alt={product.name || "Product"}
                fill
                className="object-contain p-1"
                unoptimized
                onError={() => {
                  if (!retryFailed && imgSrc.startsWith("/uploads/products/") && !imgSrc.includes("placeholder")) {
                    const clean = imgSrc.replace("/uploads/products/", "");
                    setRetryFailed(true);
                    setImgSrc(`${ASSET_FALLBACK_BASE}/uploads/products/${clean}`);
                  } else {
                    setRetryFailed(true);
                    setImgSrc("/uploads/products/placeholder.jpg");
                  }
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug break-words">
                {product.name}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs sm:text-sm font-extrabold text-[#d72828] whitespace-nowrap">
                  ₹ {sellingPrice.toLocaleString("en-IN")}
                </span>
                {hasDiscount && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 whitespace-nowrap">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Social Share Grid */}
          <div className="w-full min-w-0">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              Share Via
            </p>
            <div className="grid grid-cols-4 gap-2 sm:gap-2.5 w-full">
              {socialChannels.map((channel) => {
                const IconComponent = channel.icon;
                return (
                  <a
                    key={channel.name}
                    href={channel.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center justify-center gap-1 sm:gap-1.5 py-2.5 px-1 sm:py-3 sm:px-2 rounded-xl transition-all shadow-2xs hover:shadow-md hover:scale-105 active:scale-95 text-center min-w-0 overflow-hidden ${channel.color}`}
                    title={`Share on ${channel.name}`}
                  >
                    <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-semibold truncate max-w-full leading-tight text-center px-0.5 select-none">
                      {channel.shortName || channel.name}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Device Share Button (if supported) */}
          {canWebShare && (
            <button
              onClick={handleDeviceShare}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all active:scale-98 cursor-pointer"
            >
              <Share2 size={15} />
              <span>Share via other Apps...</span>
            </button>
          )}

          {/* Copy Link Section */}
          <div className="w-full min-w-0">
            <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Or copy link
            </p>
            <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-100/90 border border-gray-300 rounded-xl p-1 sm:p-1.5 w-full min-w-0 overflow-hidden focus-within:border-[#d72828] focus-within:ring-2 focus-within:ring-red-100 transition-all">
              <input
                type="text"
                readOnly
                value={productUrl}
                onFocus={(e) => e.target.select()}
                className="flex-1 min-w-0 bg-transparent text-xs text-gray-700 px-2 py-1 outline-none font-medium truncate select-all"
                aria-label="Product link"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`shrink-0 flex-shrink-0 whitespace-nowrap inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-[#d72828] hover:bg-red-700 text-white active:scale-95 cursor-pointer"
                }`}
                aria-label="Copy product link"
              >
                {copied ? (
                  <>
                    <Check size={14} strokeWidth={3} className="shrink-0" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} className="shrink-0" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
