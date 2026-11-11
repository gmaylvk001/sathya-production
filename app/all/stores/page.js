"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

function isApproved(store) {
  return Number(store?.approved) === 1;
}

function storeSearchText(store) {
  return [
    store?.title,
    store?.address,
    store?.phone,
    store?.city,
    store?.service_area,
    store?.zipcode,
    store?.branch_code,
  ]
    .filter((v) => v != null && String(v).trim() !== "")
    .join(" ")
    .toLowerCase();
}

export default function StoreLocatorPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/store_listings/get", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load stores");
        const data = await res.json();
        const rows = Array.isArray(data) ? data : [];
        if (!cancelled) setStores(rows.filter(isApproved));
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load stores");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter((store) => storeSearchText(store).includes(q));
  }, [stores, query]);

  return (
    <div className="min-h-[80vh] bg-gradient-to-b from-gray-50 to-white px-4 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
              <Icon icon="mdi:map-marker-outline" className="w-10 h-10 text-[#ED1C24]" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-3">
            Find a <span className="text-[#ED1C24]">Sathya</span> Store
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            Browse our approved showrooms. Search by city, address, or store name.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-8">
          <div className="relative flex-1 max-w-xl">
            <Icon
              icon="mdi:magnify"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, city, address, phone…"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30 focus:border-[#ED1C24]"
            />
          </div>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
            <a
              href="https://sathya.adtarbo.com/stores"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 px-5 py-3 rounded-full text-sm font-medium transition-all"
            >
              <Icon icon="mdi:open-in-new" className="w-4 h-4" />
              Legacy store locator
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-3 rounded-full text-sm font-medium transition-all"
            >
              <Icon icon="mdi:arrow-left" className="w-4 h-4" />
              Back to Shopping
            </Link>
          </div>
        </div>

        {loading && (
          <p className="text-center text-gray-500 py-16">Loading stores…</p>
        )}

        {!loading && error && (
          <p className="text-center text-red-600 py-16">{error}</p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="text-center text-gray-500 py-16">
            {query.trim()
              ? "No stores match your search."
              : "No approved stores are available right now."}
          </p>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Showing {filtered.length} store{filtered.length === 1 ? "" : "s"}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((store) => {
                const city =
                  store.city ||
                  store.service_area ||
                  null;
                const pincode = store.zipcode != null ? String(store.zipcode) : "";
                const key = store._id || store.exist_id || store.slug || store.title;
                return (
                  <article
                    key={key}
                    className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <h2 className="text-lg font-semibold text-gray-900 mb-2 leading-snug">
                      {store.title || "Sathya Store"}
                    </h2>
                    {(city || pincode) && (
                      <p className="text-sm text-[#ED1C24] font-medium mb-2">
                        {[city, pincode].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {store.address && (
                      <p className="text-sm text-gray-600 mb-3 flex gap-2">
                        <Icon icon="mdi:map-marker" className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                        <span>{store.address}</span>
                      </p>
                    )}
                    {store.phone && (
                      <a
                        href={`tel:${String(store.phone).replace(/\s+/g, "")}`}
                        className="inline-flex items-center gap-2 text-sm text-gray-800 hover:text-[#ED1C24] font-medium"
                      >
                        <Icon icon="mdi:phone" className="w-4 h-4" />
                        {store.phone}
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
