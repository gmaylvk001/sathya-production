"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import Link from "next/link";
import { getDiscountInfo } from "@/lib/discountHelper";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

// ─── Static Data ──────────────────────────────────────────────────────────────

const STATIC_STATS = [
  { value: "25+", label: "Years of Trust" },
  { value: "47+", label: "Stores Across Tamil Nadu" },
  { value: "50 Lakh+", label: "Happy Customers" },
  { value: "5000+", label: "Products Across Categories" },
  { value: "100%", label: "Authorised Brands" },
  { value: "Easy", label: "EMI Options & No Cost EMI" },
  { value: "Fast", label: "Delivery & Installation" },
  { value: "After Sales", label: "Service & Support" },
];

const STATIC_CATEGORIES = [
  { icon: "📺", label: "Televisions" },
  { icon: "❄️", label: "Air Conditioners" },
  { icon: "🧊", label: "Refrigerators" },
  { icon: "🫧", label: "Washing Machines" },
  { icon: "🍳", label: "Kitchen Appliances" },
  { icon: "🎵", label: "Audio Systems" },
  { icon: "💻", label: "Laptops" },
  { icon: "📱", label: "Mobiles & Tablets" },
  { icon: "🔌", label: "Small Appliances" },
  { icon: "⌨️", label: "Accessories" },
];


const STATIC_HIGHLIGHTS_TEXT = [
  "Spacious showroom with wide range of latest products",
  "Trained and friendly product experts",
  "Best prices & exciting exchange offers",
  "Easy EMI and finance options",
  "Quick delivery & professional installation",
  "Dedicated after-sales service & support",
];

const STATIC_PAYMENT_SERVICES = [
  { icon: "/Store/EasyEMI.png", title: "Easy EMI", desc: "On Select Cards" },
  { icon: "/Store/FastDelivery.png", title: "Fast Delivery", desc: "Across Coimbatore" },
  { icon: "/Store/tool.png", title: "Free Installation", desc: "On Select Products" },
  { icon: "/Store/lock.png", title: "Secure Payments", desc: "100% Safe" },
  { icon: "/Store/AfterSales.png", title: "After Sales Support", desc: "Always Here" },
];

const STATIC_FAQS = [
  {
    q: "What is Sathya Stores?",
    a: "Sathya Stores is one of South India's leading electronics and home appliances retailers, trusted by thousands of customers for genuine products, competitive prices, and reliable after-sales support across 47+ showrooms.",
  },
  {
    q: "Which brands are available at Sathya Stores?",
    a: "Sathya Stores is an authorized dealer for 100+ leading brands including LG, Samsung, Sony, Whirlpool, Panasonic, Bosch, Daikin, Haier, Voltas, and many more across TVs, ACs, refrigerators, washing machines, and kitchen appliances.",
  },
  {
    q: "Are EMI and No Cost EMI options available?",
    a: "Yes. Sathya Stores offers easy EMI and No Cost EMI on select products through leading banks and finance partners, making it easier to purchase appliances and electronics in convenient monthly instalments.",
  },
  {
    q: "Does Sathya Stores provide home delivery?",
    a: "Yes. Sathya Stores offers safe and timely home delivery across our service areas. Delivery availability and timelines may vary by product category and location.",
  },
  {
    q: "Does Sathya Stores provide installation for appliances?",
    a: "Yes. Professional installation support is available for air conditioners, televisions, washing machines, and other appliances as per brand guidelines and product requirements.",
  },
  {
    q: "What are Sathya Stores showroom timings?",
    a: "Most Sathya Stores showrooms are open from 10:00 AM to 9:00 PM. Store timings may vary slightly by location — please check the store details above or contact the showroom directly.",
  },
  {
    q: "Does Sathya Stores provide after-sales support?",
    a: "Yes. Sathya Stores provides after-sales assistance for products purchased from our showrooms and website, including help with warranty guidance, brand service coordination, and customer support queries.",
  },
  {
    q: "How can I contact Sathya Stores customer care?",
    a: "You can reach Sathya Stores Customer Care at 9842344323 or email customercare@sathya.store for product enquiries, delivery support, installation assistance, and service-related help.",
  },
];

const STATIC_AREAS = [
  "Singanallur", "Peelamedu", "Ondipudur", "Ramanathapuram",
  "Uppilipalayam", "Saravanampatti", "Gandhipuram", "Hope College", "And More...",
];

// ─── Icons ────────────────────────────────────────────────────────────────────
function MapPinIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
function PhoneIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.57 3.54 2 2 0 0 1 3.54 1.35h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 5.86 5.86l.88-.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.99 17z"/>
    </svg>
  );
}
function ClockIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
function ChevronDownIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
function CheckCircleIcon({ size = 16, color = "#d72828" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}
function StarIcon({ filled = true, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#FBBF24" : "none"} stroke="#FBBF24" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}
function ArrowRightIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}
function DirectionsIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11"/>
    </svg>
  );
}
// ─── Section Title ────────────────────────────────────────────────────────────
function SectionTitle({ children, center = true }) {
  return (
    <h2 className={`text-[18px] text-[#d72828] font-bold mb-5 ${center ? "text-center" : ""}`}>
      {children}
    </h2>
  );
}
// ─── FAQ Item ─────────────────────────────────────────────────────────────────
function FAQItem({ q, a, isOpen, onToggle }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-[13px] font-medium text-gray-800 bg-white hover:bg-gray-50 transition-colors"
      >
        <span>{q}</span>
        <span className={`flex-shrink-0 ml-2 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
          <ChevronDownIcon size={15} />
        </span>
      </button>
      {isOpen && (
        <div className="px-4 py-3 text-[12.5px] text-gray-600 bg-gray-50 border-t border-gray-200">
          {a}
        </div>
      )}
    </div>
  );
}
// ─── Main Component ───────────────────────────────────────────────────────────
export default function StoreDetail() {



  const { slug } = useParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [dynamicBrands, setDynamicBrands] = useState([]);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  useEffect(() => {
    if (slug) fetchStore();
  }, [slug]);

  // const fetchStore = async () => {
  //   try {
  //     const res = await fetch(`/api/store/${slug}`);
  //     const data = await res.json();
  //     setStore(data);
  //   } catch (e) {
  //     console.error("Error fetching store", e);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const fetchStore = async () => {
  try {
    const res = await fetch(`/api/store/${slug}`);
    const data = await res.json();
    
    // fetch featured products if IDs exist
    if (data.featuredProducts?.length > 0) {
      const featRes = await fetch("/api/product/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: data.featuredProducts }),
      });
      const featData = await featRes.json();
      data.featuredProducts = featData;
    }
    
    setStore(data);
  } catch (e) {
    console.error("Error fetching store", e);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories/get");
      const data = await res.json();
       console.log("API raw data:", data); 
      const arr = Array.isArray(data) ? data : (data?.data || data?.categories || []);
      const active = arr.filter(c => c.status === "Active");
      
      // Top-level categories only (parentid === "none")
      const topLevel = active.filter(c => c.parentid === "none");
      setDynamicCategories(topLevel);
      
      // Collect all unique brands from all categories
      const allBrands = [];
      const seenBrands = new Set();
      active.forEach(cat => {
        (cat.brands || []).forEach(brand => {
          const key = brand.brand_slug || brand._id;
          if (key && !seenBrands.has(key)) {
            seenBrands.add(key);
            allBrands.push(brand);
          }
        });
      });
      setDynamicBrands(allBrands.slice(0, 12));
    } catch (err) {
      console.error("Failed to fetch categories", err);
    }
  };
  fetchCategories();
}, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-[3px] border-gray-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
  if (!store) return <p className="p-10 text-center text-gray-500">Store not found.</p>;

 const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(
  `${store.organisation_name} ${store.website || ""}`
)}`;
  const callUrl = `tel:+91${store.phone}`;

  // Determine today's hours
  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayHours = store.businessHours?.find(b =>
    b.day?.toLowerCase().includes(todayName.toLowerCase().slice(0, 3))
  );

  return (

     

    <div className="font-sans bg-[#f8fafc] text-gray-900">
   
    <style>{`
  .bea-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    border: 1px solid rgba(0,0,0,0.04);
    padding: 16px;
  }
  .bea-card h3 .colorblue{
    color: #d72828;
  }
`}</style>

{/* ═══════════════════════════════════════════════════════
    SECTION 1 — STORE HEADER
═══════════════════════════════════════════════════════ */}

{/* DESKTOP — Banner with overlay */}
<section className="hidden sm:block relative w-full">
  {store.banners?.length > 0 ? (
    <div style={{ minHeight: '340px', maxHeight: '420px', overflow: 'hidden' }}>
      <img
        src={store.banners[0]}
        alt={store.organisation_name}
        className="w-full block object-cover"
        style={{ minHeight: '340px', maxHeight: '420px' }}
      />
    </div>
  ) : store.logo ? (
    <img
      src={store.logo}
      alt={store.organisation_name}
      className="w-full block object-cover"
      style={{ minHeight: '340px', maxHeight: '420px' }}
    />
  ) : (
    <div
      className="w-full bg-gradient-to-br from-[#d72828] to-[#d72828]"
      style={{ minHeight: '340px', maxHeight: '420px' }}
    />
  )}

  {/* White gradient overlay — left side */}
  <div
    className="absolute inset-0"
    style={{
      background: 'linear-gradient(to right, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.90) 28%, rgba(255,255,255,0.35) 48%, rgba(255,255,255,0) 65%)',
    }}
  />

  {/* Left overlay content */}
  <div className="absolute inset-0 flex items-center">
    <div className="ml-14 max-w-[420px]">

      {/* Breadcrumb */}
      <div className="text-[11px] text-gray-400 mt-4 mb-2 flex items-center gap-1 flex-nowrap whitespace-nowrap overflow-hidden">
        <Link href="/" className="hover:text-[#d72828] flex-shrink-0">Home</Link>
        <span className="flex-shrink-0">›</span>
        <Link href="/our-branches" className="hover:text-[#d72828] flex-shrink-0">Our Stores</Link>
        <span className="flex-shrink-0">›</span>
        <span className="text-gray-600 flex-shrink-0">{store.city}</span>
        <span className="flex-shrink-0">›</span>
        <span className="text-[#d72828] font-medium truncate">{store.organisation_name}</span>
      </div>

      {/* Name + Badge */}
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <h1 className="text-[22px] font-bold text-gray-900 leading-tight">
          {store.organisation_name}
        </h1>
        {(store.category || store.service_area) && (
          <span className="bg-[#d72828] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
            {store.category || store.service_area}
          </span>
        )}
      </div>

      {/* Google Rating */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[13px] font-bold text-gray-700">G</span>
        <span className="text-[14px] font-bold text-gray-900">4.8</span>
        <div className="flex items-center gap-0.5">
          {[1,2,3,4,5].map(i => <StarIcon key={i} filled={true} size={13}/>)}
        </div>
        <span className="text-[12px] text-gray-500">(300+ Reviews)</span>
      </div>

      {/* Address */}
      <div className="flex items-start gap-2 mb-2 text-[12.5px] text-gray-600">
        <span className="mt-0.5 flex-shrink-0 text-[#d72828]"><MapPinIcon size={13}/></span>
        <span>{store.address}{store.zipcode ? `, ${store.zipcode}` : ""}</span>
      </div>

      {/* Phone */}
      {store.phone && (
        <div className="flex items-center gap-2 mb-2 text-[12.5px] text-gray-600">
          <span className="text-[#d72828]"><PhoneIcon size={13}/></span>
          <a href={callUrl} className="hover:text-[#d72828]">{store.phone}</a>
        </div>
      )}

      {/* Hours */}
      <div className="flex items-center gap-2 mb-4 text-[12.5px] text-gray-600">
        <span className="text-[#d72828]"><ClockIcon size={13}/></span>
        {todayHours ? (
          <span>Open Today: <strong>{todayHours.timing}</strong></span>
        ) : store.businessHours?.length > 0 ? (
          <span>Open Today: <strong>{store.businessHours[0].timing}</strong></span>
        ) : (
          <span>Open Today: <strong>9:30 AM – 9:30 PM</strong></span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
          <button className="flex items-center gap-1.5 bg-[#d72828] hover:bg-[#d72828] text-white rounded-lg px-4 py-2.5 text-[12.5px] font-semibold transition-colors">
            <DirectionsIcon size={13}/> Get Directions
          </button>
        </a>
        {store.phone && (
          <a href={callUrl}>
            <button className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-4 py-2.5 text-[12.5px] font-semibold transition-colors">
              <PhoneIcon size={13}/> Call Store
            </button>
          </a>
        )}
      </div>
    </div>
  </div>

  {/* Stats bar — overlapping bottom, full width with side space */}
  <div className="absolute left-0 right-0 bottom-[-6] pt-14  translate-y-1/2 z-10">
    <div className="mx-10 mt-6">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 grid grid-cols-8 divide-x divide-gray-100">
        {[
          { icon: "/Store/25+year.png", value: "25+",         label: "Years of Trust" },
          { icon: "/Store/storesCount.png", value: "47+",         label: "Stores Across Tamil Nadu" },
          { icon: "/Store/HappyCustomer.png", value: "50 Lakh+",    label: "Happy Customers" },
          { icon: "/Store/Products.png", value: "5000+",       label: "Products Across Categories" },
          { icon: "/Store/Authentic.png", value: "100%",        label: "Authorised Brands" },
          { icon: "/Store/EasyEMI.png", value: "Easy",        label: "EMI Options & No Cost EMI" },
          { icon: "/Store/FastDelivery.png", value: "Fast",        label: "Delivery & Installation" },
          { icon: "/Store/AfterSales.png", value: "After Sales", label: "Service & Support" },
        ].map((s, i) => (
<div key={i} className="flex flex-row items-center justify-center gap-2 py-3 px-2">
  <img
    src={s.icon}
    alt={s.label}
    className="w-9 h-9 object-contain flex-shrink-0"
    onError={(e) => { e.target.style.display = "none"; }}
  />
  <div className="flex flex-col">
    <span className="text-[13px] font-bold text-[#d72828] leading-tight">{s.value}</span>
    <span className="text-[9.5px] text-[#d72828] leading-tight">{s.label}</span>
  </div>
</div>
        ))}
      </div>
    </div>
  </div>
</section>

{/* Desktop spacer */}
<div className="hidden sm:block h-[60px] bg-[#f8fafc]" />

{/* MOBILE — No banner, white stacked layout */}
<section className="block sm:hidden bg-white px-5 pt-5 pb-4">

  {/* Breadcrumb */}
  <div className="text-[10px] text-gray-400 mb-3 flex items-center gap-1 flex-wrap">
    <Link href="/" className="hover:text-[#d72828]">Home</Link>
    <span>›</span>
    <Link href="/our-branches" className="hover:text-[#d72828]">Our Stores</Link>
    <span>›</span>
    <span className="text-[#d72828] font-medium">{store.organisation_name}</span>
  </div>

  {/* Name + Badge */}
  <div className="flex items-center gap-2 flex-wrap mb-1">
    <h1 className="text-[20px] font-bold text-gray-900 leading-tight">
      {store.organisation_name}
    </h1>
    {(store.category || store.service_area) && (
      <span className="bg-[#d72828] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
        {store.category || store.service_area}
      </span>
    )}
  </div>

  {/* Rating */}
  <div className="flex items-center gap-1.5 mb-3">
    <span className="text-[12px] font-bold text-gray-700">G</span>
    <span className="text-[13px] font-bold text-gray-900">4.8</span>
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => <StarIcon key={i} filled={true} size={11}/>)}
    </div>
    <span className="text-[11px] text-gray-500">(300+ Reviews)</span>
  </div>

  {/* Address */}
  <div className="flex items-start gap-2 mb-1.5 text-[12px] text-gray-600">
    <span className="mt-0.5 flex-shrink-0 text-[#d72828]"><MapPinIcon size={12}/></span>
    <span>{store.address}{store.zipcode ? `, ${store.zipcode}` : ""}</span>
  </div>

  {/* Phone */}
  {store.phone && (
    <div className="flex items-center gap-2 mb-1.5 text-[12px] text-gray-600">
      <span className="text-[#d72828]"><PhoneIcon size={12}/></span>
      <a href={callUrl} className="hover:text-[#d72828]">{store.phone}</a>
    </div>
  )}

  {/* Hours */}
  <div className="flex items-center gap-2 mb-4 text-[12px] text-gray-600">
    <span className="text-[#d72828]"><ClockIcon size={12}/></span>
    <span>Open Today: <strong>
      {todayHours?.timing || store.businessHours?.[0]?.timing || "9:30 AM – 9:30 PM"}
    </strong></span>
  </div>

  {/* Buttons */}
  <div className="flex items-center gap-2 flex-wrap mb-5">
    <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
      <button className="flex items-center gap-1.5 bg-[#d72828] text-white rounded-lg px-3.5 py-2 text-[12px] font-semibold">
        <DirectionsIcon size={12}/> Directions
      </button>
    </a>
    {store.phone && (
      <a href={callUrl}>
        <button className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg px-3.5 py-2 text-[12px] font-semibold">
          <PhoneIcon size={12}/> Call
        </button>
      </a>
    )}
  </div>

  {/* Stats — 2x2 grid mobile */}
  <div className="grid grid-cols-2 gap-2.5">
    {[
      { icon: "/Store/icon1.png", value: "25+",        label: "Years of Trust" },
      { icon: "/Store/icon2.png", value: "47+",        label: "Stores Across Tamil Nadu" },
      { icon: "/Store/icon3.png", value: "50 Lakh+",   label: "Happy Customers" },
      { icon: "/Store/icon4.png", value: "5000+",      label: "Products Across Categories" },
    ].map((s, i) => (
      <div key={i} className="bg-[#f8fafc] border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3">
        <img
          src={s.icon}
          alt={s.label}
          className="w-8 h-8 object-contain flex-shrink-0"
          onError={(e) => { e.target.style.display = "none"; }}
        />
        <div>
          <div className="text-[16px] font-bold text-[#d72828] leading-none">{s.value}</div>
          <div className="text-[10.5px] text-gray-500 mt-0.5 leading-tight">{s.label}</div>
        </div>
      </div>
    ))}
  </div>

</section>

{/* ═══════════════════════════════════════════════════════
    SECTION 2 — EXPERIENCE GALLERY (store_images — dynamic)
═══════════════════════════════════════════════════════ */}
{store.store_images?.length > 0 && (
  <section className="bg-white px-4 sm:px-8 pt-8 pb-8 mt-3">
    <h2 className="text-center text-[18px] font-bold text-[#d72828] mb-5">
      Experience {store.organisation_name}
    </h2>

    <style>{`
      .store-img-track::-webkit-scrollbar { display: none; }
      .store-img-track { -ms-overflow-style: none; scrollbar-width: none; }
      .store-img-item { width: calc(50% - 6px); }
      @media (min-width: 768px) { .store-img-item { width: calc(25% - 9px); } }
      @media (min-width: 1024px) { .store-img-item { width: calc(16.666% - 10px); } }
    `}</style>

    <div
      className="store-img-track flex gap-3 overflow-x-auto pb-2"
      style={{
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {store.store_images.map((img, idx) => (
        <div
          key={idx}
          className="store-img-item flex-shrink-0 bg-white rounded-xl overflow-hidden"
          style={{
            scrollSnapAlign: 'start',
            boxShadow: '0 2px 10px rgba(0,0,0,0.10)',
          }}
        >
          <div className="w-full overflow-hidden" style={{ aspectRatio: '4/3' }}>
            <img
              src={img}
              className="w-full h-full object-cover"
              alt={`Store image ${idx + 1}`}
            />
          </div>
        </div>
      ))}
    </div>
  </section>
)}
{/* ═══════════════════════════════════════════════════════
      SECTION 3 — ABOUT / HIGHLIGHTS / POPULAR PRODUCTS
  ═══════════════════════════════════════════════════════ */}
<section className="bg-white px-4 sm:px-8 py-8 mt-3">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

    {/* About */}
    <div className="bea-card bg-white-900 bea-card">
      <h3 className="text-[15px] font-bold text-[#d72828] mb-3">
        About {store.organisation_name} Store
      </h3>
      <p className="text-[12.5px] text-[#d72828] leading-relaxed">
        {store.description || `${store.organisation_name} is one of the most trusted electronics and home appliance stores in ${store.city}. We offer 5000+ products across televisions, air conditioners, refrigerators, washing machines, mobiles, laptops and kitchen appliances from leading brands.\n\nOur showroom is designed to help you experience the latest technology up close. Get expert advice, best prices, easy EMI options, quick delivery and professional installation support – all under one roof.`}
      </p>
    </div>

    {/* Store Highlights */}
    <div className="bea-card">
      <h3 className="text-[15px] font-bold text-[#d72828] mb-3">Store Highlights</h3>
      <ul className="space-y-2">
        {(store.highlights?.length > 0
          ? store.highlights.map(h => h.label)
          : STATIC_HIGHLIGHTS_TEXT
        ).map((text, i) => (
          <li key={i} className="flex items-start gap-2 text-[12.5px] text-[#d72828]">
            <span className="mt-0.5 flex-shrink-0"><CheckCircleIcon size={14} color="#d72828" /></span>
            {text}
          </li>
        ))}
      </ul>
    </div>

    {/* Popular Products */}
    <div className="bea-card">
      <h3 className="text-[15px] font-bold text-[#d72828] mb-3">Popular Products Available</h3>
      <div className="grid grid-cols-2 gap-2">
        {[
          { img: '/store/tv.png', label: 'Smart TVs & OLED TVs' },
          { img: '/store/refrigerator.png', label: 'Refrigerator' },
          { img: '/store/washing.png', label: 'Double Door Refrigerators' },
          { img: '/store/kitchen.png', label: 'Kitchen Appliances' },
          { img: '/store/laptop1.png', label: 'Laptop' },
          { img: '/store/ac.png', label: 'Invertor Air conditioner' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-2">
            <img
              src={item.img}
              alt={item.label}
              className="w-8 h-8 object-contain flex-shrink-0"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <span className="text-[11.5px] text-gray-700 font-medium leading-tight">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>

  </div>
</section>
{/* ═══════════════════════════════════════════════════════
    SECTION 4 — CATEGORY / BRANDS / OFFERS
═══════════════════════════════════════════════════════ */}
<section className="bg-white px-4 sm:px-8 py-8 mt-3">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

    {/* Shop by Category */}
    <div className="bea-card">
      <h3 className="text-[15px] font-bold text-[#d72828] mb-4 text-center">Shop by Category</h3>
      {dynamicCategories.length === 0 ? (
        <div className="flex justify-center items-center h-24 text-gray-400 text-[12px]">Loading...</div>
      ) : (
        <div className="grid grid-cols-5 gap-x-2 gap-y-3">
          {dynamicCategories.slice(0, 10).map((cat, i) => (
            <Link
              key={cat._id || i}
              href="/"
              className="flex flex-col items-center gap-1 cursor-pointer group"
            >
              <div className="w-12 h-12 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden group-hover:bg-red-50 group-hover:border-red-200 transition-colors">
                {cat.navImage ? (
                  <img
                    src={cat.navImage}
                    alt={cat.category_name}
                    className="w-full h-full object-contain p-1.5"
                  />
                ) : (
                  <span className="text-[12px] font-bold text-[#d72828]">
                    {(cat.category_name || "?").charAt(0)}
                  </span>
                )}
              </div>
              <span className="text-[9px] text-gray-600 text-center leading-tight line-clamp-2 w-full">
                {cat.category_name}
              </span>
            </Link>
          ))}
        </div>
      )}
      <div className="text-center mt-4">
        <Link
          href="/"
          className="text-[#d72828] text-[12px] font-semibold hover:underline inline-flex items-center gap-1"
        >
          View All Categories <ArrowRightIcon />
        </Link>
      </div>
    </div>

    {/* Authorized Brands */}
    <div className="bea-card">
      <h3 className="text-[15px] font-bold text-[#d72828] mb-4 text-center">Authorized Brands Available</h3>
      {dynamicBrands.length === 0 ? (
        <div className="flex justify-center items-center h-24 text-gray-400 text-[12px]">Loading...</div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {dynamicBrands.slice(0, 12).map((brand, i) => (
            <div
              key={brand._id || brand.brand_slug || i}
              className="bg-white border border-gray-100 rounded-lg flex items-center justify-center py-3 px-2 min-h-[52px]"
            >
              {brand.image ? (
                <>
                  <img
                    src={`/uploads/Brands/${brand.image}`}
                    alt={brand.brand_name}
                    className="h-8 max-w-[80px] object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling.style.display = 'block';
                    }}
                  />
                  <span className="text-[11px] font-bold text-gray-700 hidden">
                    {brand.brand_name}
                  </span>
                </>
              ) : (
                <span className="text-[11px] font-bold text-gray-700 text-center">
                  {brand.brand_name}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="text-center mt-4">
        <Link
          href="/"
          className="text-[#d72828] text-[12px] font-semibold hover:underline inline-flex items-center gap-1"
        >
          View All Brands <ArrowRightIcon />
        </Link>
      </div>
    </div>

    {/* Latest Offers */}
    <div className="bea-card">
      <h3 className="text-[15px] font-bold text-[#d72828] mb-4 text-center">Latest Offers at This Store</h3>
      {store.offers?.length > 0 ? (
        <div className="space-y-2">
          {store.offers.slice(0, 4).map((offer, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-lg p-2">
              {offer.image ? (
                <img
                  src={offer.image}
                  className="w-9 h-9 rounded-md object-cover flex-shrink-0"
                  alt={offer.title}
                />
              ) : (
                <div className="w-9 h-9 bg-orange-100 rounded-md flex items-center justify-center flex-shrink-0 text-[16px]">
                  🎁
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-gray-800 truncate">{offer.title}</div>
                {offer.validTill && (
                  <div className="text-[10px] text-gray-500">Valid till {offer.validTill}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {[
            { icon: "🎉", title: "Sathya Stores Summer Sale",   desc: "Up to 45% OFF on Select Products" },
            { icon: "💳", title: "No Cost EMI",        desc: "Easy EMI on Credit Cards" },
            { icon: "🔄", title: "Exchange Bonus",     desc: "Best Exchange Value Guaranteed" },
            { icon: "🛍️", title: "Combo Offers",      desc: "Buy More, Save More" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-lg p-2">
              <div className="w-9 h-9 bg-orange-100 rounded-md flex items-center justify-center flex-shrink-0 text-[15px]">
                {item.icon}
              </div>
              <div>
                <div className="text-[12px] font-semibold text-gray-800">{item.title}</div>
                <div className="text-[10px] text-gray-500">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="text-center mt-4">
        <button className="w-full bg-[#d72828] hover:bg-[#d72828] text-white rounded-lg py-2 text-[12px] font-semibold transition-colors">
          View All Offers
        </button>
      </div>
    </div>

  </div>
</section>
      {/* ═══════════════════════════════════════════════════════
          SECTION 5 — FEATURED PRODUCTS (dynamic)
      ═══════════════════════════════════════════════════════ */}
 {store.featuredProducts?.length > 0 && (
  <section className="bg-white px-4 sm:px-8 py-8 mt-3">
    <div className="flex items-center justify-between mb-4">
      <SectionTitle center={false}>Featured Products at This Store</SectionTitle>
      <button className="text-[#d72828] text-[12px] font-semibold hover:underline inline-flex items-center gap-1">
        View All Products <ArrowRightIcon />
      </button>
    </div>
    <Swiper
      modules={[Navigation]}
      navigation
      spaceBetween={16}
      breakpoints={{
        1200: { slidesPerView: 5 },
        992: { slidesPerView: 4 },
        768: { slidesPerView: 3 },
        480: { slidesPerView: 2 },
        0: { slidesPerView: 1 },
      }}
    >
      {store.featuredProducts.map((prod, idx) => (
        <SwiperSlide key={idx}>
          <Link href={`/product/${prod.slug}`}>
            <div className="bea-card flex flex-col items-center gap-2 cursor-pointer hover:shadow-md transition-shadow">
              <div className="w-full h-[140px] bg-white rounded-lg overflow-hidden flex items-center justify-center">
                {prod.images?.[0] ? (
                  <img
                    src={`/uploads/products/${prod.images[0]}`}
                    className="w-full h-full object-contain"
                    alt={prod.name}
                  />
                ) : (
                  <span className="text-4xl">📦</span>
                )}
              </div>
              <p className="text-[12px] text-gray-800 font-medium text-center line-clamp-2 w-full">
                {prod.name}
              </p>
              {(() => {
                const { showDiscount } = getDiscountInfo(prod.price, prod.special_price);
                const displayPrice = showDiscount ? prod.special_price : (prod.special_price || prod.price);
                return (
                  <div className="flex items-center gap-2 w-full justify-center">
                    <span className="text-[13px] font-bold text-[#d72828]">
                      ₹{Number(displayPrice).toLocaleString()}
                    </span>
                    {showDiscount && (
                      <span className="text-[11px] text-gray-400 line-through">
                        ₹{Number(prod.price).toLocaleString()}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </Link>
        </SwiperSlide>
      ))}
    </Swiper>
  </section>
)}
      {/* ═══════════════════════════════════════════════════════
          SECTION 6 — CUSTOMER REVIEWS (static)
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-white px-4 sm:px-8 py-8 mt-3">
        <SectionTitle>What Customers Say</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-start">
          {/* Rating summary */}
          <div className="bea-card flex flex-col items-center text-center">
            <span className="text-[13px] font-bold text-gray-500 mb-1">G Google</span>
            <span className="text-[42px] font-black text-gray-900 leading-none">4.8</span>
            <div className="flex items-center gap-0.5 my-2">
              {[1,2,3,4,5].map(i => <StarIcon key={i} filled={true} size={16}/>)}
            </div>
            <span className="text-[12px] text-gray-500 mb-3">Based on 300+ Reviews</span>
            <button className="text-[#d72828] text-[12px] font-semibold border border-red-200 rounded-lg px-4 py-1.5 hover:bg-red-50 transition-colors">
              Read All Reviews
            </button>
          </div>
          {/* Review cards — static */}
          <Swiper modules={[Navigation]} navigation spaceBetween={12}
            breakpoints={{ 900: { slidesPerView: 3 }, 600: { slidesPerView: 2 }, 0: { slidesPerView: 1 } }}>
            {[
              { name: "Arun Kumar", time: "2 weeks ago", text: "Best electronics showroom in Coimbatore. Wide range of products and excellent customer service.", stars: 5 },
              { name: "Priya Natarajan", time: "1 month ago", text: "Very good collection of ACs and TVs. Staff explained everything clearly. Happy with my purchase!", stars: 5 },
              { name: "Ramesh Babu", time: "3 weeks ago", text: "Good offers, easy EMI and fast delivery. Highly recommended!", stars: 5 },
              { name: "Meena S", time: "2 months ago", text: "Excellent after sales support. Installation was done very professionally.", stars: 5 },
            ].map((review, i) => (
              <SwiperSlide key={i}>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 h-full">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-9 h-9 rounded-full bg-[#d72828] flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0">
                      {review.name[0]}
                    </div>
                    <div>
                      <div className="text-[12.5px] font-semibold text-gray-800">{review.name}</div>
                      <div className="text-[10.5px] text-gray-400">{review.time}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 mb-2">
                    {[...Array(review.stars)].map((_, j) => <StarIcon key={j} filled={true} size={11}/>)}
                  </div>
                  <p className="text-[12px] text-gray-600 leading-relaxed">{review.text}</p>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

{/* ═══════════════════════════════════════════════════════
    SECTION 7 — HAPPY CUSTOMERS PHOTOS (customer_images — dynamic)
═══════════════════════════════════════════════════════ */}
{store.customer_images?.length > 0 && (
  <section className="bg-white px-4 sm:px-8 py-8 mt-3">
    <h2 className="text-center text-[18px] font-bold text-[#d72828] mb-5">
      Happy Customers, Happy Moments
    </h2>

    <style>{`
      .customer-img-track::-webkit-scrollbar { display: none; }
      .customer-img-track { -ms-overflow-style: none; scrollbar-width: none; }
    `}</style>

    <div className="relative">
      <div
        className="customer-img-track flex gap-3 overflow-x-auto pb-2"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {store.customer_images.map((img, idx) => (
          <div
            key={idx}
            className="flex-shrink-0 bea-card rounded-xl overflow-hidden bg-gray-100"
            style={{ width: '185px', height: '170px', scrollSnapAlign: 'start' }}
          >
            <img
              src={img}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
              alt={`Customer photo ${idx + 1}`}
            />
          </div>
        ))}

        {/* View More — last item */}
        <div
          className="flex-shrink-0 rounded-xl overflow-hidden  border border-red-100 flex flex-col items-center justify-center cursor-pointer hover:bg-red-100 transition-colors"
          style={{ width: '160px', height: '120px', scrollSnapAlign: 'start' }}
        >
          <ArrowRightIcon size={20} />
          <span className="text-[#d72828] text-[12px] font-semibold mt-1">View More</span>
        </div>
      </div>
    </div>
  </section>
)}
      {/* ═══════════════════════════════════════════════════════
          SECTION 8 — FIND US / AREAS / NEARBY STORES / TEAM
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-white px-4 sm:px-8 py-8 mt-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

  {/* Find Us — dynamic address */}
<div className="bea-card">
  <h3  className="text-[14px] font-bold text-[#d72828] mb-3">Find Us Here</h3>
  <div className="bg-gray-100 rounded-xl h-[160px] flex items-center justify-center mb-3 overflow-hidden">
    <iframe
      title="Store Location"
      width="100%"
      height="160"
      frameBorder="0"
      style={{ border: 0 }}
      referrerPolicy="no-referrer-when-downgrade"
      src={`https://maps.google.com/maps?q=${encodeURIComponent(
        `${store.organisation_name} ${store.website || ""}`
      )}&output=embed`}
      allowFullScreen
    />
  </div>
  <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
    <button className="w-full border border-[#d72828] text-[#d72828] hover:bg-red-50 rounded-lg py-2 text-[12px] font-semibold transition-colors">
      Open in Google Maps
    </button>
  </a>
</div>

          {/* Areas We Serve — static */}
          <div className="bea-card">
            <h3 className="text-[14px] font-bold text-[#d72828] mb-3">Areas We Serve</h3>
            <ul className="space-y-1.5">
              {STATIC_AREAS.map((area, i) => (
                <li key={i} className="flex items-center gap-2 text-[12.5px] text-gray-700">
                  <CheckCircleIcon size={13} color="#d72828" />
                  {area}
                </li>
              ))}
            </ul>
          </div>

          {/* Nearby Stores — dynamic */}
          <div className="bea-card">
            <h3 className="text-[14px] font-bold text-[#d72828] mb-3">More Sathya Stores Near You</h3>
            {store.nearbyStores?.length > 0 ? (
              <div className="space-y-2.5">
                {store.nearbyStores.slice(0, 3).map((ns, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 border border-gray-200 rounded-lg p-2.5">
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-gray-800 truncate">{ns.name}</div>
                      <div className="text-[11px] text-gray-500">{ns.address}</div>
                      {ns.distance && <div className="text-[11px] text-[#d72828] font-medium">{ns.distance}</div>}
                    </div>
                    <button className="flex-shrink-0 bg-[#d72828] text-white text-[10.5px] font-semibold px-2.5 py-1.5 rounded-lg hover:bg-[#d72828] transition-colors">
                      View Store
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-gray-500">Visit our <a href="https://sathya.adtarbo.com/stores" target="_blank" rel="noopener noreferrer" className="text-[#d72828] hover:underline">store locator</a> to find nearby showrooms.</p>
            )}
            <div className="text-center mt-3">
              <a
                href="https://sathya.adtarbo.com/stores"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#d72828] text-[12px] font-semibold hover:underline inline-flex items-center gap-1"
              >
                View All Stores <ArrowRightIcon />
              </a>
            </div>
          </div>

          {/* Store Team — static */}
          <div className="bea-card">
            <h3 className="text-[14px] font-bold text-[#d72828] mb-3">Meet Your Store Team</h3>
            <div className="bg-gray-100 rounded-xl h-[130px] flex items-center justify-center mb-3 overflow-hidden">
               <img src="/store/storeTeam.png" className="w-full h-full object-cover rounded-xl" alt="Store team" />
            </div>
            <p className="text-[11.5px] text-gray-600 leading-relaxed">
              Our appliance experts are always ready to help you choose the right product for your needs and budget.
            </p>
          </div>
        </div>.
      </section> 

      {/* ═══════════════════════════════════════════════════════
          SECTION 9 — BUSINESS HOURS + PAYMENT & SERVICES + APP
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-white px-4 sm:px-8 py-8 mt-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">

          {/* Business Hours — dynamic */}
          <div className="bea-card">
            <h3 className="text-[14px] font-bold text-gray-900 mb-3">Business Hours</h3>
            {store.businessHours?.length > 0 ? (
              <div className="space-y-1.5">
                {store.businessHours.map((b, i) => (
                  <div key={i} className="flex justify-between text-[12px] py-1 border-b border-gray-100 last:border-0">
                    <span className="text-gray-600 font-medium">{b.day}</span>
                    <span className="text-gray-800 font-semibold">{b.timing}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                {["Mon–Fri", "Saturday", "Sunday"].map((day, i) => (
                  <div key={i} className="flex justify-between text-[12px] py-1 border-b border-gray-100 last:border-0">
                    <span className="text-gray-600 font-medium">{day}</span>
                    <span className="text-gray-800 font-semibold">9:30 AM – 9:30 PM</span>
                  </div>
                ))}
              </div>
            )}
          </div>
{/* Payment & Services — static */}
<div className="bea-card">
  <h3 className="text-[14px] font-bold text-gray-900 mb-3">Payment & Services</h3>
  <div className="grid grid-cols-5 gap-3">
    {STATIC_PAYMENT_SERVICES.map((ps, i) => (
      <div key={i} className="flex flex-col items-center text-center gap-1.5">
        <div className=" rounded-xl flex items-center justify-center overflow-hidden">
          <img
            src={ps.icon}
            alt={ps.title}
            className="w-9 h-9 object-contain"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        </div>
        <div className="text-[11px] font-semibold text-gray-800">{ps.title}</div>
        <div className="text-[10px] text-gray-500 leading-tight">{ps.desc}</div>
      </div>
    ))}
  </div>
</div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 10 — FAQ (static)
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-white px-4 sm:px-8 py-8 mt-3">
  <SectionTitle>Frequently Asked Questions</SectionTitle>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">

    {STATIC_FAQS.map((faq, i) => (
      <FAQItem
        key={i}
        q={faq.q}
        a={faq.a}
        isOpen={openFaqIndex === i}
        onToggle={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
      />
    ))}
  </div>
</section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 11 — CTA BANNER (dynamic name/city)
      ═══════════════════════════════════════════════════════ */}
      <section className="mt-3 mb-0">
        <div className="bg-gradient-to-r from-[#d72828] to-[#d72828] px-6 sm:px-10 py-8">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
            <div className="flex gap-5 items-center">
              {store.banners?.[0] && (
                <div className="w-[100px] h-[70px] rounded-xl overflow-hidden flex-shrink-0 hidden sm:block">
                  <img src={store.banners[0]} className="w-full h-full object-cover" alt="" />
                </div>
              )}
              <div>
                <h2 className="text-[18px] font-bold text-white mb-1">
                  Visit {store.organisation_name} Today!
                </h2>
                <p className="text-[13px] text-[#d72828]">
                  Your Trusted Electronics & Home Appliances Store in {store.city}.
                  Great Offers, Expert Guidance & Unbeatable Service.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <button className="flex items-center gap-1.5 bg-white text-[#d72828] font-bold rounded-lg px-5 py-2.5 text-[13px] hover:bg-red-50 transition-colors">
                  <DirectionsIcon size={13}/> Get Directions
                </button>
              </a>
              {store.phone && (
                <a href={callUrl}>
                  <button className="flex items-center gap-1.5 bg-transparent border border-white text-white font-bold rounded-lg px-5 py-2.5 text-[13px] hover:bg-white/10 transition-colors">
                    <PhoneIcon size={13}/> Call Store
                  </button>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}