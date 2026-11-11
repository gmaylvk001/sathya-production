"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

const STORE_TYPE_OPTIONS = [
  "All Store Types",
  "Multi Brand Store",
  "Executive Store",
];

function getStoreTypeLabel(store) {
  return store?.multibrandstore === true
    ? "Multi Brand Store"
    : "Executive Store";
}

function matchesStoreTypeFilter(store, filterValue = "") {
  const value = String(filterValue || "").trim();
  if (!value || value === "All Store Types") return true;
  if (value === "Multi Brand Store") return store?.multibrandstore === true;
  if (value === "Executive Store") return store?.multibrandstore !== true;
  return true;
}

// ─── Why Shop Items with asset icons ─────────────────────────────────────────
const WHY_SHOP_ITEMS = [
  { icon: "/location/AuthraizedBrand.png", title: "Authorized Brand Partner",  desc: "100% genuine products with official warranty" },
  { icon: "/location/FastDelivery.png", title: "Fast Delivery",              desc: "Quick & safe delivery across Tamil Nadu" },
  { icon: "/location/EasyEMI.png", title: "Easy EMI Options",           desc: "Flexible finance schemes for all" },
  { icon: "/location/Support.png", title: "Reliable Support",           desc: "Pre & post purchase support you can trust" },
  { icon: "/location/BestOffer.png", title: "Best Offers",                desc: "Exciting deals & exclusive store offers" },
];

// ─── Icons ────────────────────────────────────────────────────────────────────
function PhoneIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.57 3.54 2 2 0 0 1 3.54 1.35h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 5.86 5.86l.88-.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.99 17z" />
    </svg>
  );
}

function DirectionsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function LocationPinIcon({ color = "#d72828", size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function StoreTypeIcon({ color = "#d72828", size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

// ─── Store Card ───────────────────────────────────────────────────────────────
function StoreCard({ store }) {
  const capitalize = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const titleCase = (str) =>
    str ? str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "";

  return (
    <div className="bg-white border border-gray-200 rounded-[10px] overflow-hidden flex flex-col h-full">
      {/* Top: image + info */}
      <div className="flex gap-3 px-3.5 pt-3.5 pb-0">
        {/* Store image */}
        <div className="w-[130px] h-[140px] rounded-md flex-shrink-0 bg-[#1e3a8a] overflow-hidden flex items-center justify-center">
          {store.logo ? (
            <img
              src={store.logo}
              alt={store.organisation_name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : (
            <span className="text-[#d72828] text-[11px] font-bold text-center px-1">Sathya Stores</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[13px] text-gray-900 mb-1 leading-snug">
            {store.organisation_name}
          </div>
          {(store.multibrandstore === true || store.multibrandstore === false || store.category || store.service_area) && (
            <span className="bg-red-100 text-[#d72828] text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mb-1.5">
              {getStoreTypeLabel(store)}
            </span>
          )}
          {store.city && (
            <div className="text-[11px] text-gray-500 font-semibold mb-0.5">
              {capitalize(store.city)}
            </div>
          )}
          {store.address && (
            <div className="text-[11px] text-gray-500 leading-relaxed line-clamp-3">
              {titleCase(store.address)}
            </div>
          )}
          {store.phone && (
            <div className="flex items-center gap-1.5 mt-1.5 text-gray-700 text-[12px]">
              <PhoneIcon /> {store.phone}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center   px-3.5 pt-2.5 pb-3.5 mt-auto gap-2">
        {/* View Details — takes remaining space */}
        <Link href={`/store/${store.location_id || store.slug}`} className="flex-1">
          <button className="w-[100px] lg:ml-[10px] bg-[#d72828] hover:bg-[#d72828] text-white border-none rounded-md py-[7px] px-3 text-[12px] font-semibold cursor-pointer transition-colors whitespace-nowrap">
            View Details
          </button>
        </Link>

        {/* Get Direction — icon only on mobile, text on sm+ */}
        <a
          href={`https://www.google.com/maps?q=${encodeURIComponent(
            `${store.organisation_name} ${store.website}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <button className="bg-transparent text-[#d72828] border border-[#d72828] hover:bg-red-50 rounded-md py-[7px] px-2 sm:px-3 cursor-pointer flex items-center justify-center gap-1 transition-colors">
            <DirectionsIcon />
            <span className="hidden sm:inline text-[12px] font-semibold whitespace-nowrap">Get Direction</span>
          </button>
        </a>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BEABranchesPage() {

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState("All Cities");
  const [selectedType, setSelectedType] = useState("All Store Types");
  const [showAll, setShowAll] = useState(false);
  const [appliedCity, setAppliedCity] = useState("All Cities");
  const [appliedType, setAppliedType] = useState("All Store Types");

  useEffect(() => {
    async function fetchStores() {
      try {
        const res = await fetch("/api/store/get");
        const data = await res.json();
        if (data.success) {
          setStores(data.data.filter((s) => s.status === "Active"));
        }
      } catch (err) {
        console.error("Failed to fetch stores", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStores();
  }, []);

  const cities = useMemo(() => {
    const unique = [...new Set(stores.map((s) => s.city).filter(Boolean))].sort();
    return ["All Cities", ...unique];
  }, [stores]);

  const storeTypes = STORE_TYPE_OPTIONS;

  const filtered = useMemo(() => {
    return stores.filter((s) => {
      const cityMatch = appliedCity === "All Cities" || s.city === appliedCity;
      const typeMatch = matchesStoreTypeFilter(s, appliedType);
      return cityMatch && typeMatch;
    });
  }, [stores, appliedCity, appliedType]);

  const INITIAL_COUNT = 8;
  const visibleStores = showAll ? filtered : filtered.slice(0, INITIAL_COUNT);
  const hasMore = filtered.length > INITIAL_COUNT;

  const totalStores = stores.length;
  const totalCities = new Set(stores.map((s) => s.city).filter(Boolean)).size;

  return (
    <>
     <div className="relative w-full hidden sm:block">
        <img
          src="/location/LocationBanner1.png"
          alt="Sathya Stores Store Network"
          className="relative z-0 w-full h-auto block"
          onError={(e) => { e.target.style.display = "none"; }}
        />

        {/* White gradient overlay */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background: 'linear-gradient(to right, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 25%, rgba(255,255,255,0.3) 42%, rgba(255,255,255,0) 58%)',
          }}
        />

        {/* Left overlay text */}
        <div className="absolute inset-0 z-[2] flex items-center px-[clamp(1rem,3vw,2.5rem)]">
          <div className="ml-0 md:ml-8 lg:ml-14 max-w-[min(400px,42vw)]">
            <p className="text-[clamp(1.1rem,2vw+0.4rem,2.25rem)] font-bold text-[#d72828] mb-1">
              Sathya Stores Store Network.
            </p>
            <div className="leading-tight mb-0.5">
              <span className="text-[clamp(1.5rem,3vw+0.5rem,3rem)] font-black text-[#d72828]">
                {totalStores > 0 ? `${totalStores}+` : "47+"}
              </span>
              <span className="text-[clamp(1.5rem,3vw+0.5rem,3rem)] font-bold text-[#d72828] ml-2">Showrooms.</span>
            </div>
            <div className="leading-tight mb-0.5">
              <span className="text-[clamp(1.5rem,3vw+0.5rem,3rem)] font-black text-[#d72828]">
                {totalCities > 0 ? `${totalCities}+` : "17+"}
              </span>
              <span className="text-[clamp(1.5rem,3vw+0.5rem,3rem)] font-bold text-[#d72828] ml-2">Cities.</span>
            </div>
            <div className="text-[clamp(1.2rem,2.2vw+0.4rem,2.375rem)] font-black text-[#d72828] mb-3">One Trusted Name.</div>
            <p className="text-[clamp(0.75rem,0.6vw+0.5rem,0.9rem)] text-[#d72828] leading-relaxed max-w-[300px]">
              Find your nearest Sathya Stores showroom and experience Tamil Nadu&apos;s favourite
              destination for electronics &amp; home appliances.
            </p>
          </div>
        </div>

        {/* Stats bar — overlapping bottom */}
        <div className="absolute left-0 right-0 bottom-0 translate-y-1/2 z-10">
          <div style={{ marginLeft: '2.5rem', marginRight: '30%' }}>
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 grid grid-cols-4 divide-x divide-gray-100">
              {[
                { icon: "/location/ShowRoom.png", value: `${totalStores > 0 ? totalStores : 47}+`, label: "Showrooms", sub: "Across Tamil Nadu" },
                { icon: "/location/Location.png", value: `${totalCities > 0 ? totalCities : 17}+`, label: "Cities",    sub: "Strong Presence" },
                { icon: "/location/HappyCustomer.png", value: "50 Lakh+",                           label: "Happy",     sub: "Customers" },
                { icon: "/location/25Years.png", value: "25+",                                      label: "Years of",  sub: "Trust & Excellence" },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-4">
                  <img
                    src={stat.icon}
                    alt={stat.label}
                    className="w-[55px] h-[55px] object-contain flex-shrink-0"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                  <div>
                    <div className="text-[20px] font-black text-[#d72828] leading-none">{stat.value}</div>
                    <div className="text-[15px] font-semibold text-gray-800">{stat.label}</div>
                    <div className="text-[10.5px] text-gray-500">{stat.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    <div className="w-full max-w-full sm:max-w-[720px] md:max-w-[960px] lg:max-w-[1320px] xl:max-w-[1520px] 2xl:max-w-[1680px] mx-auto px-0 sm:px-3 md:px-6 lg:px-8">

      {/* ── Hero Banner ── */}

      {/* DESKTOP — overlay layout (unchanged) */}
     

      {/* Desktop spacer */}
      <div className="hidden sm:block h-[70px] bg-[#f8fafc]" />

      {/* MOBILE & TABLET — banner image top, content stacked below */}
      <div className="block sm:hidden">
        {/* Banner image — full width, natural height (no crop) */}
        <div className="relative w-full overflow-hidden">
          <img
            src="/location/LocationBanner1.png"
            alt="Sathya Stores Store Network"
            className="relative z-0 w-full h-auto block"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        </div>

        {/* Content below banner */}
        <div className="bg-white px-5 pt-5 pb-4">
          <p className="text-[11px] font-semibold text-gray-500 mb-1">
            Sathya Stores Store Network.
          </p>
          <div className="leading-tight mb-0.5">
            <span className="text-[34px] font-black text-[#d72828]">
              {totalStores > 0 ? `${totalStores}+` : "47+"}
            </span>
            <span className="text-[26px] font-black text-gray-900 ml-1.5">Showrooms.</span>
          </div>
          <div className="leading-tight mb-0.5">
            <span className="text-[34px] font-black text-[#d72828]">
              {totalCities > 0 ? `${totalCities}+` : "17+"}
            </span>
            <span className="text-[26px] font-black text-gray-900 ml-1.5">Cities.</span>
          </div>
          <div className="text-[20px] font-black text-gray-900 mb-2">One Trusted Name.</div>
          <p className="text-[12px] text-gray-600 leading-relaxed mb-5">
            Find your nearest Sathya Stores showroom and experience Tamil Nadu&apos;s favourite
            destination for electronics &amp; home appliances.
          </p>

          {/* Stats — 2x2 grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "/location/ShowRoom.png",      value: `${totalStores > 0 ? totalStores : 47}+`, label: "Showrooms", sub: "Across Tamil Nadu" },
              { icon: "/location/Location.png",       value: `${totalCities > 0 ? totalCities : 17}+`, label: "Cities",    sub: "Strong Presence" },
              { icon: "/location/HappyCustomer.png",  value: "50 Lakh+",                               label: "Happy",     sub: "Customers" },
              { icon: "/location/25Years.png",         value: "25+",                                    label: "Years of",  sub: "Trust & Excellence" },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#f8fafc] rounded-xl px-4 py-3 border border-gray-100">
                <img
                  src={stat.icon}
                  alt={stat.label}
                  className="w-8 h-8 object-contain flex-shrink-0"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
                <div>
                  <div className="text-[16px] font-black text-[#d72828] leading-none">{stat.value}</div>
                  <div className="text-[11px] font-semibold text-gray-800">{stat.label}</div>
                  <div className="text-[10px] text-gray-500">{stat.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Find Store Section ── */}
      <div id="find-store-section" className="bg-white px-6 sm:px-10 pt-10 pb-8">
        <h2 className="text-center text-[21px] font-bold text-gray-900 mb-5">
          Find Your Nearest Sathya Stores Store
        </h2>

        {/* ── Filters Row ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-7">

  {/* City Dropdown */}
  <div className="relative flex-1">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
      <LocationPinIcon color="#d72828" size={14} />
    </span>
    <select
      value={selectedCity}
      onChange={(e) => { setSelectedCity(e.target.value); setShowAll(false); }}
      className="w-full h-[44px] pl-8 pr-9 border border-gray-300 rounded-lg text-[13.5px] appearance-none bg-white cursor-pointer focus:outline-none focus:border-[#d72828]"
    >
      {cities.map((c) => <option key={c}>{c}</option>)}
    </select>
    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-sm">▾</span>
  </div>

  {/* Store Type Dropdown */}
  <div className="relative flex-1">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
      <StoreTypeIcon color="#d72828" size={14} />
    </span>
    <select
      value={selectedType}
      onChange={(e) => { setSelectedType(e.target.value); setShowAll(false); }}
      className="w-full h-[44px] pl-8 pr-9 border border-gray-300 rounded-lg text-[13.5px] appearance-none bg-white cursor-pointer focus:outline-none focus:border-[#d72828]"
    >
      {storeTypes.map((t) => <option key={t}>{t}</option>)}
    </select>
    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-sm">▾</span>
  </div>

  {/* Find Store Button */}
  <button
    onClick={() => {
      setAppliedCity(selectedCity);
      setAppliedType(selectedType);
      setShowAll(false);
    }}
className="h-[44px]  flex-1 bg-[#d72828] hover:bg-[#d72828] text-white border-none rounded-lg px-6 text-[13.5px] font-bold cursor-pointer flex items-center justify-center gap-2 transition-colors"  >
    Find Store <SearchIcon />
  </button>
</div>

        {/* Loading */}
        {loading ? (
          <div className="text-center py-16 text-gray-500">
            <div className="w-10 h-10 border-[3px] border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading stores...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-[15px]">No stores found for the selected filters.</p>
          </div>
        ) : (
          <>
            {/* ── Store Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
              {visibleStores.map((store) => (
                <StoreCard key={store._id} store={store} />
              ))}

              {/* "And Many More" card */}
              {!showAll && hasMore && (
                <div className="bg-white border border-gray-200 rounded-[10px] flex flex-col items-center justify-center px-5 py-8 gap-2.5 min-h-[200px]">
                  <img
                    src="/location/ShowRoom.png"
                    alt="More Stores"
                    className="w-14 h-14 object-contain"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                  <div className="font-bold text-[15px] text-gray-900 text-center">And Many More...</div>
                  <div className="text-gray-500 text-[12px] text-center leading-relaxed">
                    {totalStores}+ showrooms across<br />{totalCities}+ cities in Tamil Nadu
                  </div>
                  <button
                    onClick={() => setShowAll(true)}
                    className="bg-transparent text-[#d72828] border-none font-bold text-[13px] cursor-pointer underline"
                  >
                    View All Stores
                  </button>
                </div>
              )}
            </div>

            {/* View All / Show Less */}
            <div className="text-center pt-5 pb-2">
              <button
                onClick={() => setShowAll(!showAll)}
                className="bg-transparent text-[#d72828] border border-[#d72828] hover:bg-red-50 rounded-lg px-7 py-2.5 text-[13.5px] font-bold cursor-pointer inline-flex items-center gap-2 transition-colors"
              >
                {showAll ? "Show Less ▲" : `View All Stores (${filtered.length}) ▾`}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Why Shop at Sathya Stores ── */}
      <div className="bg-white px-6 sm:px-10 pt-12 pb-0">

        {/* LocationBanner2 */}
        <div className="relative rounded-xl overflow-hidden mb-7">
          <img
            src="/location/LocationBanner2.png"
            alt=""
            className="relative z-0 w-full h-auto block"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        </div>

        {/* Section Title */}
        <h2 className="text-center text-[21px] font-bold text-gray-900 mb-6">
          Why Shop at Sathya Stores?
        </h2>

        {/* ── Why Shop Cards ── */}
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 mb-10">
          {WHY_SHOP_ITEMS.map((item, i) => (
            <div
              key={i}
              className="bg-[#f8fafc] border border-gray-200 rounded-xl px-4 py-4 flex items-center gap-3 flex-[1_1_180px] max-w-[220px]"
            >
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                <img
                  src={item.icon}
                  alt={item.title}
                  className="w-[50px] h-[50px] object-contain"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[12.5px] text-gray-900 mb-0.5 leading-snug">{item.title}</div>
                <div className="text-[11px] text-gray-500 leading-relaxed">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* LocationBanner3 */}
        <div className="rounded-xl overflow-hidden">

          {/* DESKTOP — buttons overlay on banner */}
          <div className="relative hidden sm:block">
            <img
              src="/location/LocationBanner3.png"
              alt="Visit Sathya Stores Store"
              className="relative z-0 w-full h-auto block"
              onError={(e) => { e.target.style.display = "none"; }}
            />
            <div className="absolute inset-0 z-[2] flex items-center justify-end pr-[clamp(1rem,4vw,2.5rem)]">
              <div className="flex items-center gap-3">
                <a href="#find-store-section">
                  <button className="flex items-center gap-2 bg-[#d72828] hover:bg-[#d72828] text-white font-bold rounded-lg px-5 py-2.5 text-[clamp(0.75rem,0.8vw+0.5rem,0.85rem)] transition-colors whitespace-nowrap">
                    Find Store
                    <LocationPinIcon color="white" size={15} />
                  </button>
                </a>
                <Link href="/">
                  <button className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#d72828] font-bold rounded-lg px-5 py-2.5 text-[clamp(0.75rem,0.8vw+0.5rem,0.85rem)] border border-white transition-colors whitespace-nowrap">
                    Shop Online
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* MOBILE & TABLET — banner image, then buttons below (no background color) */}
          <div className="block sm:hidden">
            <img
              src="/location/LocationBanner3.png"
              alt="Visit Sathya Stores Store"
              className="w-full h-auto block"
              onError={(e) => { e.target.style.display = "none"; }}
            />
            <div className="flex items-center gap-3 justify-center py-4">
              <a href="#find-store-section">
                <button className="flex items-center gap-2 bg-[#d72828] hover:bg-[#d72828] text-white font-bold rounded-lg px-5 py-2.5 text-[13px] transition-colors whitespace-nowrap">
                  Find Store
                  <LocationPinIcon color="white" size={14} />
                </button>
              </a>
              <Link href="/">
                <button className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#d72828] font-bold rounded-lg px-5 py-2.5 text-[13px] border border-red-200 transition-colors whitespace-nowrap">
                  Shop Online
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                </button>
              </Link>
            </div>
          </div>

        </div>
      </div>

    </div>
    </>
  );
}