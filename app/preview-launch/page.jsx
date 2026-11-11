"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

// Mock Data
const MOCK_PRODUCT = {
  title: "iPhone 18 Pro",
  tagline: "Titanium. So strong. So light. So Pro.",
  reviews: { score: 4.9, count: 124 },
  images: [
    "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-1inch-blacktitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1692846360609",
    "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-1inch-bluetitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1692846360609"
  ],
  highlights: [
    { title: "A18 Pro chip", desc: "A monster win for gaming and efficiency." },
    { title: "Titanium design", desc: "Aerospace-grade. Exceptionally durable." },
    { title: "Pro camera system", desc: "48MP Main camera. 5x Telephoto." },
    { title: "Action button", desc: "A fast track to your favorite feature." },
    { title: "All-day battery", desc: "Up to 29 hours video playback." }
  ],
  overview: [
    { label: "Display", value: "6.1-inch Super Retina XDR display with ProMotion." },
    { label: "Capacity", value: "Available in 128GB, 256GB, 512GB, 1TB." },
    { label: "Water Resistance", value: "Rated IP68 (maximum depth of 6 meters up to 30 minutes)." }
  ],
  features: [
    { icon: "lucide:cpu", title: "A18 Pro chip", desc: "The fastest chip ever in a smartphone." },
    { icon: "lucide:camera", title: "Pro Camera", desc: "Capture spatial video for Apple Vision Pro." },
    { icon: "lucide:battery-charging", title: "MagSafe", desc: "Faster wireless charging up to 25W." },
    { icon: "lucide:wifi", title: "Wi-Fi 7", desc: "Up to 2x faster wireless speeds." }
  ]
};

export default function LaunchPreview() {
  const [activeImage, setActiveImage] = useState(0);
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Simulate scroll spy for sticky bottom CTA
  useEffect(() => {
    const handleScroll = () => {
      // Show sticky CTA if scrolled past 600px
      setShowStickyCTA(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFFFF] font-sans text-[#0A0A0A] selection:bg-[#FEF2F2] selection:text-[#D7191F]">
      
      {/* 1. Launch Hero Strip */}
      <div className="bg-[#FAFAFA] border-b border-[#E4E4E7] py-2 px-4 text-center">
        <div className="max-w-[1280px] mx-auto flex items-center justify-center gap-2 text-[13px] font-medium text-[#0A0A0A]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D7191F] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D7191F]"></span>
          </span>
          Pre-bookings open for {MOCK_PRODUCT.title}. Limited stock available.
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[13px] text-[#71717A] mb-8">
          <span className="hover:text-[#0A0A0A] cursor-pointer transition-colors">Home</span>
          <Icon icon="lucide:chevron-right" className="w-3 h-3" />
          <span className="hover:text-[#0A0A0A] cursor-pointer transition-colors">Mobiles</span>
          <Icon icon="lucide:chevron-right" className="w-3 h-3" />
          <span className="font-medium text-[#0A0A0A]">{MOCK_PRODUCT.title}</span>
        </nav>

        {/* 2. Main Grid */}
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          
          {/* Left: Gallery (Simplified for Preview) */}
          <div className="flex-1 lg:w-[60%] flex gap-4">
            <div className="hidden lg:flex flex-col gap-3 w-[72px] shrink-0">
              {MOCK_PRODUCT.images.map((img, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setActiveImage(idx)}
                  className={`w-full aspect-square rounded-[12px] overflow-hidden bg-[#F5F5F7] cursor-pointer border-2 transition-all ${activeImage === idx ? 'border-[#D7191F]' : 'border-transparent hover:border-[#E4E4E7]'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover p-1" />
                </div>
              ))}
            </div>
            <div className="flex-1 bg-[#F5F5F7] rounded-[24px] h-[400px] lg:h-[640px] flex items-center justify-center p-8 relative group overflow-hidden">
              <img src={MOCK_PRODUCT.images[activeImage]} alt="" className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-[1.03]" />
              <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur px-3 py-1 rounded-[999px] text-[12px] font-medium text-[#52525B] shadow-[0_1px_3px_rgba(0,0,0,.06)]">
                {activeImage + 1} / {MOCK_PRODUCT.images.length}
              </div>
            </div>
          </div>

          {/* Right: Buy Box */}
          <div className="lg:w-[40%] shrink-0">
            <div className="sticky top-24">
              <div className="inline-block bg-[#FEF2F2] text-[#D7191F] px-2 py-0.5 rounded-[999px] text-[12px] font-bold tracking-widest uppercase mb-4">
                New Release
              </div>
              
              <h1 className="text-[40px] lg:text-[48px] font-semibold tracking-[-0.03em] leading-[1.1] text-[#0A0A0A] mb-2">
                {MOCK_PRODUCT.title}
              </h1>
              <p className="text-[16px] text-[#52525B] mb-6 font-medium">
                {MOCK_PRODUCT.tagline}
              </p>

              {/* Offers */}
              <div className="border border-[#E4E4E7] rounded-[16px] p-4 mb-8 bg-[#FAFAFA] hover:bg-white transition-colors cursor-pointer">
                <div className="flex justify-between items-center mb-3">
                  <div className="font-semibold text-[14px]">Available Offers</div>
                  <div className="text-[13px] text-[#2563EB] hover:underline font-medium">View plans</div>
                </div>
                <div className="flex items-center gap-3 text-[13px] text-[#52525B]">
                  <Icon icon="lucide:credit-card" className="w-4 h-4 shrink-0" />
                  <span>No Cost EMI starts at <span className="font-semibold text-[#0A0A0A] tabular-nums">₹5,416/mo</span></span>
                </div>
              </div>

              {/* Main CTA */}
              <button className="w-full h-[56px] bg-[#D7191F] text-white rounded-[12px] text-[16px] font-semibold tracking-wide shadow-[0_8px_20px_rgba(215,25,31,.25)] hover:bg-[#B91419] hover:-translate-y-[1px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-4 group relative overflow-hidden">
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                Pre-Book Now
                <Icon icon="lucide:arrow-right" className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <div className="text-center text-[13px] text-[#71717A] mb-6">
                No payment required now. Our team will contact you within 24 hours.
              </div>

              {/* Trust Strip */}
              <div className="flex justify-between items-center py-4 border-y border-[#E4E4E7] mb-8">
                <div className="flex flex-col items-center gap-1.5 text-center flex-1">
                  <Icon icon="lucide:shield-check" className="w-5 h-5 text-[#0A0A0A]" />
                  <span className="text-[12px] font-medium text-[#52525B]">Auth Reseller</span>
                </div>
                <div className="w-[1px] h-8 bg-[#E4E4E7]"></div>
                <div className="flex flex-col items-center gap-1.5 text-center flex-1">
                  <Icon icon="lucide:lock" className="w-5 h-5 text-[#0A0A0A]" />
                  <span className="text-[12px] font-medium text-[#52525B]">Secure</span>
                </div>
                <div className="w-[1px] h-8 bg-[#E4E4E7]"></div>
                <div className="flex flex-col items-center gap-1.5 text-center flex-1">
                  <Icon icon="lucide:headphones" className="w-5 h-5 text-[#0A0A0A]" />
                  <span className="text-[12px] font-medium text-[#52525B]">24/7 Support</span>
                </div>
              </div>

              {/* Highlights */}
              <div>
                <h3 className="text-[14px] font-semibold text-[#0A0A0A] mb-4">Highlights</h3>
                <ul className="space-y-3">
                  {MOCK_PRODUCT.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-[14px] leading-[1.6]">
                      <Icon icon="lucide:check-circle-2" className="w-5 h-5 text-[#16A34A] shrink-0 mt-[2px]" />
                      <div>
                        <span className="font-semibold text-[#0A0A0A]">{highlight.title}</span>
                        <span className="text-[#52525B]"> - {highlight.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* 3. Why Pre-Book Strip */}
      <section className="bg-[#FAFAFA] border-y border-[#E4E4E7] py-20 mt-16">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <h2 className="text-[32px] font-semibold tracking-tight text-center mb-12">Why pre-book with Sathya?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-[16px] border border-[#E4E4E7] shadow-[0_1px_3px_rgba(0,0,0,.06)]">
              <Icon icon="lucide:star" className="w-8 h-8 text-[#D7191F] mb-4" />
              <div className="font-semibold text-[16px] mb-2">Priority allocation</div>
              <div className="text-[14px] text-[#52525B] leading-[1.6]">Skip the line. Get your hands on the latest tech before anyone else.</div>
            </div>
            <div className="bg-white p-6 rounded-[16px] border border-[#E4E4E7] shadow-[0_1px_3px_rgba(0,0,0,.06)]">
              <Icon icon="lucide:truck" className="w-8 h-8 text-[#D7191F] mb-4" />
              <div className="font-semibold text-[16px] mb-2">Launch-day delivery</div>
              <div className="text-[14px] text-[#52525B] leading-[1.6]">Delivered directly to your door on the official release day.</div>
            </div>
            <div className="bg-white p-6 rounded-[16px] border border-[#E4E4E7] shadow-[0_1px_3px_rgba(0,0,0,.06)]">
              <Icon icon="lucide:gift" className="w-8 h-8 text-[#D7191F] mb-4" />
              <div className="font-semibold text-[16px] mb-2">Exclusive offers</div>
              <div className="text-[14px] text-[#52525B] leading-[1.6]">Special bank discounts and exchange bonuses for early birds.</div>
            </div>
            <div className="bg-white p-6 rounded-[16px] border border-[#E4E4E7] shadow-[0_1px_3px_rgba(0,0,0,.06)]">
              <Icon icon="lucide:store" className="w-8 h-8 text-[#D7191F] mb-4" />
              <div className="font-semibold text-[16px] mb-2">Dedicated support</div>
              <div className="text-[14px] text-[#52525B] leading-[1.6]">Pick up in-store or get VIP setup assistance from our experts.</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Overview Section */}
      <section className="max-w-[800px] mx-auto px-6 lg:px-12 py-24">
        
        {/* Sticky Tabs */}
        <div className="flex gap-8 border-b border-[#E4E4E7] mb-12 sticky top-0 bg-white/90 backdrop-blur z-40 pt-4">
          {["overview", "features", "specs", "faq"].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-[15px] font-medium transition-colors relative capitalize ${activeTab === tab ? 'text-[#0A0A0A]' : 'text-[#71717A] hover:text-[#0A0A0A]'}`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#D7191F]"></div>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {MOCK_PRODUCT.overview.map((item, idx) => (
            <div key={idx} className="flex flex-col md:flex-row py-6 border-b border-[#E4E4E7] last:border-0">
              <div className="w-[200px] text-[13px] font-semibold uppercase tracking-wider text-[#52525B] mb-2 md:mb-0 shrink-0">
                {item.label}
              </div>
              <div className="flex-1 text-[15px] leading-[1.6] text-[#0A0A0A]">
                {item.value}
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* 6. Final CTA Banner */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 pb-24">
        <div className="bg-[#0A0A0A] rounded-[24px] p-12 lg:p-20 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <img src={MOCK_PRODUCT.images[0]} alt="" className="w-full h-full object-cover blur-[60px] scale-150" />
          </div>
          <h2 className="text-[40px] lg:text-[56px] font-semibold tracking-tight text-white mb-6 relative z-10">
            Be among the first to own it.
          </h2>
          <button className="h-[56px] px-8 bg-[#D7191F] text-white rounded-[12px] text-[16px] font-semibold tracking-wide shadow-[0_8px_20px_rgba(215,25,31,.25)] hover:bg-[#B91419] transition-all relative z-10">
            Pre-Book Now
          </button>
        </div>
      </section>

      {/* 7. Sticky Bottom Bar */}
      <div className={`fixed bottom-0 left-0 w-full bg-white/85 backdrop-blur-[12px] border-t border-[#E4E4E7] p-4 lg:p-4 z-40 transform transition-transform duration-[320ms] ease-out ${showStickyCTA ? 'translate-y-0' : 'translate-y-[120%]'}`}>
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[14px] font-medium text-[#0A0A0A] hidden sm:block">
            Don't miss out - Grab yours now before we sell out again!
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button onClick={() => setIsModalOpen(true)} className="flex-1 sm:w-auto h-[44px] px-8 bg-[#16A34A] text-white rounded-[999px] text-[15px] font-semibold shadow-sm hover:bg-[#15803d] transition-all">
              Pre Order Now
            </button>
            <button onClick={() => setShowStickyCTA(false)} className="p-2 text-[#71717A] hover:bg-slate-100 rounded-full transition-colors">
              <Icon icon="lucide:x" className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 8. Pre-Book Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-fadeIn">
          {/* Modal Container */}
          <div className="bg-white w-full max-w-[880px] rounded-[16px] overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,.18)] flex flex-col md:flex-row animate-scaleUp relative">
            
            {/* Close Button */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-[#52525B] hover:text-[#0A0A0A] shadow-sm transition-colors"
            >
              <Icon icon="lucide:x" className="w-4 h-4" />
            </button>

            {/* Left: Form */}
            <div className="w-full md:w-[55%] p-8 lg:p-12 order-2 md:order-1 flex flex-col justify-center bg-white">
              <div className="text-[12px] font-bold tracking-[0.12em] text-[#D7191F] uppercase mb-2">
                Sathya Store
              </div>
              <h2 className="text-[28px] font-semibold tracking-tight text-[#0A0A0A] mb-2 leading-tight">
                Pre-Book Enquiry
              </h2>
              <p className="text-[14px] text-[#52525B] mb-8">
                Reserve your {MOCK_PRODUCT.title} today. Please fill in your details below.
              </p>

              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Enquiry Submitted!"); setIsModalOpen(false); }}>
                <div className="relative">
                  <Icon icon="lucide:user" className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A1A1AA] w-5 h-5" />
                  <input type="text" placeholder="Full Name" required className="w-full h-[48px] pl-11 pr-4 bg-[#FAFAFA] border border-[#E4E4E7] rounded-[8px] text-[15px] outline-none transition-all focus:border-[#D7191F] focus:ring-[3px] focus:ring-[#D7191F]/20 hover:border-[#D4D4D8]" />
                </div>
                <div className="relative flex">
                  <span className="inline-flex items-center justify-center px-4 bg-[#F5F5F7] border border-r-0 border-[#E4E4E7] rounded-l-[8px] text-[#52525B] text-[15px] font-medium">
                    +91
                  </span>
                  <input type="tel" placeholder="Mobile Number" required pattern="[0-9]{10}" maxLength={10} className="w-full h-[48px] px-4 bg-[#FAFAFA] border border-[#E4E4E7] rounded-r-[8px] text-[15px] outline-none transition-all focus:border-[#D7191F] focus:ring-[3px] focus:ring-[#D7191F]/20 hover:border-[#D4D4D8]" />
                </div>
                <div className="relative">
                  <Icon icon="lucide:map-pin" className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A1A1AA] w-5 h-5" />
                  <select required className="w-full h-[48px] pl-11 pr-10 bg-[#FAFAFA] border border-[#E4E4E7] rounded-[8px] text-[15px] outline-none transition-all focus:border-[#D7191F] focus:ring-[3px] focus:ring-[#D7191F]/20 hover:border-[#D4D4D8] appearance-none text-[#52525B] cursor-pointer">
                    <option value="" disabled selected>Select Nearest Store</option>
                    <option value="tnagar">T. Nagar, Chennai</option>
                    <option value="velachery">Velachery, Chennai</option>
                    <option value="anna-nagar">Anna Nagar, Chennai</option>
                  </select>
                  <Icon icon="lucide:chevron-down" className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A1A1AA] w-4 h-4 pointer-events-none" />
                </div>
                
                <button type="submit" className="w-full h-[52px] mt-4 bg-[#D7191F] text-white rounded-[8px] text-[16px] font-semibold tracking-wide shadow-[0_8px_20px_rgba(215,25,31,.25)] hover:bg-[#B91419] transition-all flex justify-center items-center gap-2">
                  Submit Enquiry
                </button>
              </form>
              
              <div className="mt-6 text-center text-[12px] text-[#71717A] flex items-center justify-center gap-1.5">
                <Icon icon="lucide:info" className="w-4 h-4" /> No payment required now.
              </div>
            </div>

            {/* Right: Immersive Image */}
            <div className="w-full md:w-[45%] h-[200px] md:h-auto order-1 md:order-2 relative bg-[#F5F5F7]">
              <img src={MOCK_PRODUCT.images[0]} alt="iPhone" className="w-full h-full object-cover object-center absolute inset-0 mix-blend-multiply" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
