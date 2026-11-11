"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#d72828]"></div>
    </div>
  ),
});

// Parse lat/lng from location_map if available
function getStaticCoords(store) {
  if (store.location_map?.lat && store.location_map?.lng) {
    return { lat: store.location_map.lat, lng: store.location_map.lng };
  }
  return null;
}

// Geocode a query string using Nominatim (free, no API key)
async function nominatimSearch(query) {
  const q = encodeURIComponent(query);
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
    { headers: { "Accept-Language": "en" } }
  );
  const data = await res.json();
  if (data?.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }
  return null;
}

// Geocode with fallback: full address → city → organisation name
async function geocodeAddress(store) {
  try {
    // Try full address first
    const address = store.location || store.address;
    if (address) {
      const coords = await nominatimSearch(address + ", Tamil Nadu, India");
      if (coords) return coords;
    }
    // Fallback: try city
    if (store.city) {
      const coords = await nominatimSearch(store.city + ", Tamil Nadu, India");
      if (coords) return coords;
    }
    // Fallback: try organisation name as location hint
    if (store.organisation_name) {
      const coords = await nominatimSearch(store.organisation_name + ", Tamil Nadu, India");
      if (coords) return coords;
    }
  } catch {}
  return null;
}

function StoreDetail({ store, onBack }) {
  const img = store.store_images?.[0] || store.images?.[0];
  // const imgSrc = img ? (img.startsWith("http") ? img : `/uploads/${img}`) : null;
  const imgSrc = img ? (img.startsWith("http") ? img : `${img}`) : null;

  const mapsQuery = store._coords
    ? `${store._coords.lat},${store._coords.lng}`
    : encodeURIComponent(store.location || store.address || store.organisation_name);
  const mapsUrl = store._coords
    ? `https://www.google.com/maps?q=${mapsQuery}`
    : `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Store image with close button */}
      <div className="relative w-full h-48 bg-gray-100 flex-shrink-0">
        {imgSrc ? (
          <img src={imgSrc} alt={store.organisation_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <img src="uploads/default_geocode-1x.png" alt={store.organisation_name} className="w-full h-full object-cover" />
            {/* <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg> */}
          </div>
        )}
        <button
          onClick={onBack}
          className="absolute top-2 right-2 bg-white rounded-full w-7 h-7 flex items-center justify-center shadow text-gray-600 hover:bg-gray-100 text-lg font-bold"
        >
          ×
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{store.organisation_name}</h3>
          {(store.address || store.location) && (
            <p className="text-sm text-gray-500 mt-0.5">{store.address || store.location}</p>
          )}
        </div>

        <div className="flex gap-2">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 border border-gray-300 rounded-full px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Get Directions
          </a>
        </div>

        <div className="flex flex-col gap-2 text-sm border-t pt-3">
          {store.phone && (
            <a href={`tel:${store.phone}`} className="flex items-center gap-2 text-gray-700 hover:text-[#d72828]">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.684l1.518 4.553a1 1 0 01-.272 1.06l-1.2 1.2a16.001 16.001 0 006.586 6.586l1.2-1.2a1 1 0 011.06-.272l4.553 1.518a1 1 0 01.684.95V19a2 2 0 01-2 2h-1C9.163 21 3 14.837 3 7V5z" />
              </svg>
              {store.phone}
            </a>
          )}
          {store.website && (
            <a href={store.website.startsWith("http") ? store.website : `https://${store.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#d72828] hover:underline truncate">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="truncate">{store.website}</span>
            </a>
          )}
          {store.email && (
            <a href={`mailto:${store.email}`} className="flex items-center gap-2 text-[#d72828] hover:underline truncate">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="truncate">{store.email}</span>
            </a>
          )}
          {store.service_area && (
            <div className="flex items-center gap-2 text-gray-600">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {store.service_area}
            </div>
          )}
        </div>

        {store.businessHours?.length > 0 && (
          <div className="border-t pt-3">
            {store.businessHours.map((h, i) => (
              <div key={i} className="flex justify-between text-sm py-0.5">
                <span className="text-gray-600">{h.day}</span>
                <span className="text-gray-800 font-medium">{h.timing}</span>
              </div>
            ))}
          </div>
        )}

        {store.description && (
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-700 mb-1">{store.organisation_name}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{store.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OurLocations() {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("All");
  const [geocoding, setGeocoding] = useState(false);

  // Cache geocoded coords so we don't re-fetch — keyed by store _id
  const geocacheRef = useRef({});

  useEffect(() => {
    fetch("/api/mapstores/location")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          // Attach static coords where available
          const withCoords = data.data.map((s) => ({
            ...s,
            _coords: getStaticCoords(s),
          }));
          setStores(withCoords);
        }
      })
      .catch(() => {});
  }, []);

  const cities = useMemo(() => {
    const all = stores.map((s) => s.city).filter(Boolean);
    return ["All", ...Array.from(new Set(all)).sort()];
  }, [stores]);

  const filtered = useMemo(() => {
    return stores.filter((s) => {
      const matchSearch =
        s.organisation_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.address?.toLowerCase().includes(search.toLowerCase()) ||
        s.location?.toLowerCase().includes(search.toLowerCase()) ||
        s.city?.toLowerCase().includes(search.toLowerCase());
      const matchCity = filterCity === "All" || s.city === filterCity;
      return matchSearch && matchCity;
    });
  }, [stores, search, filterCity]);

  const handleSelect = async (store) => {
    setShowDetail(true);

    // Already has coordinates — just select
    if (store._coords?.lat) {
      setSelectedStore(store);
      return;
    }

    // Check geocache
    if (geocacheRef.current[store._id]) {
      const cached = geocacheRef.current[store._id];
      const updated = { ...store, _coords: cached };
      setSelectedStore(updated);
      updateStoreCoords(store._id, cached);
      return;
    }

    // Geocode on demand — try address, city, then name as fallbacks
    setGeocoding(true);
    setSelectedStore(store); // show detail immediately while geocoding
    const coords = await geocodeAddress(store);
    setGeocoding(false);

    if (coords) {
      geocacheRef.current[store._id] = coords;
      const updated = { ...store, _coords: coords };
      setSelectedStore(updated);
      updateStoreCoords(store._id, coords);
    }
  };

  // Update coords in the stores list so the marker shows on map
  const updateStoreCoords = (id, coords) => {
    setStores((prev) =>
      prev.map((s) => (s._id === id ? { ...s, _coords: coords } : s))
    );
  };

  const handleBack = () => {
    setShowDetail(false);
  };

  const getStoreImage = (store) => {
    const img = store.store_images?.[0] || store.images?.[0];
    if (!img) return null;
    if (img.startsWith("http")) return img;
    return `${img}`;
    // return `/uploads/${img}`;
  };

  return (
    // <section style={{ marginBottom: "4px" }}>
      <section className="pt-5 mb-[4px]">
  <div className="px-3 md:px-10 pt-5">
    <div className="flex flex-col-reverse md:flex-row border border-gray-200 rounded-xl shadow-md overflow-hidden w-full md:h-[520px]">

      {/* ── LEFT PANEL ── */}
      <div className="w-full md:w-[360px] md:min-w-[360px] md:max-w-[360px] flex flex-col bg-white border-b md:border-b-0 md:border-r border-gray-200 overflow-hidden">

        {showDetail && selectedStore ? (
          <StoreDetail store={selectedStore} onBack={handleBack} />
        ) : (
          <>
            {/* Search */}
            <div className="p-3 border-b flex-shrink-0 bg-white sticky top-0 z-10">
              <div className="flex items-center border rounded-md px-3 py-2 bg-gray-50">
                <svg className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* City filter */}
            <div className="px-3 py-2 border-b flex-shrink-0 bg-white sticky top-[60px] z-10">
              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="w-full text-sm border rounded-md px-2 py-1.5 focus:outline-none text-gray-600"
              >
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c === "All" ? "Filter Locations" : c}
                  </option>
                ))}
              </select>
            </div>

            {/* Store grid */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-center text-gray-400 text-sm mt-10">
                  No stores found
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  {filtered.map((store) => {
                    const img = getStoreImage(store);
                    const isSelected = selectedStore?._id === store._id;

                    return (
                      <div
                        key={store._id}
                        onClick={() => handleSelect(store)}
                        className={`cursor-pointer border-b border-r p-2 transition-colors ${
                          isSelected
                            ? "bg-red-50 border-l-4 border-l-blue-600"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="w-full h-24 bg-gray-100 rounded overflow-hidden mb-1.5">
                          {img ? (
                            <img
                              src={img}
                              alt={store.organisation_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <img
                              src="/uploads/default_geocode-1x.png"
                              alt={store.organisation_name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        <p
                          className={`text-xs font-semibold leading-tight ${
                            isSelected
                              ? "text-[#d72828]"
                              : "text-[#d72828]"
                          }`}
                        >
                          {store.organisation_name}
                        </p>

                        {(store.address || store.location) && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {store.address || store.location}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── RIGHT PANEL: MAP ── */}
      <div className="flex-1 relative overflow-hidden h-[55vh] md:h-auto">
        {geocoding && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[9999] bg-white shadow rounded-full px-3 py-1 text-xs text-gray-600 flex items-center gap-2">
            <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-[#d72828]"></div>
            Locating on map...
          </div>
        )}

        <MapView
          stores={filtered}
          selectedStore={selectedStore}
          onSelectStore={handleSelect}
        />
      </div>
    </div>
  </div>

  {/* Footer count */}
  {!showDetail && filtered.length > 0 && (
    <p className="text-xs text-gray-400 mt-2 text-right px-3 md:px-10">
      {filtered.length} location
      {filtered.length !== 1 ? "s" : ""}
      {filterCity !== "All" ? ` in ${filterCity}` : ""}
    </p>
  )}
</section>
  );
}
