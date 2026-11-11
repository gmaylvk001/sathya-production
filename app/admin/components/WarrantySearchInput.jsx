"use client";
import { useState, useRef, useEffect } from "react";

export default function WarrantySearchInput({ value = [], onChange }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState([]);
 

  const debounceRef = useRef(null);

  
  useEffect(() => {
    if (!value || value.length === 0) {
      setSelected([]);
      return;
    }

   
   fetch(`/api/warranties/by-item-nos?item_nos=${value.join(",")}`)
      .then((r) => r.json())
      .then((d) => setSelected(d.warranties || []));
  }, []);
 

  const handleSearch = (q) => {
    setQuery(q);
    clearTimeout(debounceRef.current);

    if (!q.trim()) {
      setSuggestions([]);
      return;
    }


    debounceRef.current = setTimeout(async () => {
        console.log("Fetching:", q);
const res = await fetch(`/api/warranties/get?q=${encodeURIComponent(q)}`);
      const data = await res.json();
       console.log("Response:", data);

     
      const filtered = (data.warranties || []).filter(
        (w) => !selected.find((s) => s.item_no === w.item_no)
      );
      setSuggestions(filtered);
    }, 300);
  };

  const addWarranty = (warranty) => {
    const updated = [...selected, warranty];
    setSelected(updated);
    onChange(updated.map((w) => w.item_no));
    
    setQuery("");
    setSuggestions([]);
  };

  const removeWarranty = (item_no) => {
    const updated = selected.filter((w) => w.item_no !== item_no);
    setSelected(updated);
    onChange(updated.map((w) => w.item_no));
  };

  return (
    <div className="space-y-2">
   
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search warranty by description... (e.g. AIR CONDITIONER)"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />

        {/* Dropdown */}
        {suggestions.length > 0 && (
          <ul className="absolute z-20 top-full left-0 right-0 bg-white border rounded-lg shadow-xl mt-1 max-h-64 overflow-y-auto">
            {suggestions.map((w) => (
              <li
                key={w.item_no}
                onClick={() => addWarranty(w)}
                className="px-3 py-2 hover:bg-red-50 cursor-pointer text-sm border-b last:border-0"
              >
               
                <span className="font-medium text-gray-800">{w.name}</span>
                <span className="ml-2 text-[#d72828] font-semibold">
                  {w.year} Year
                </span>
                <span className="ml-2 text-gray-500 text-xs">
                  ₹{w.price?.toLocaleString("en-IN")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Selected warranties as removable tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selected.map((w) => (
            <div
              key={w.item_no}
              className="flex items-center gap-1 bg-red-100 text-[#d72828] text-xs px-2 py-1 rounded-full"
            >
              <span>
                {w.name} — {w.year}yr — ₹{w.price?.toLocaleString("en-IN")}
              </span>
              <button
                type="button"
                onClick={() => removeWarranty(w.item_no)}
                className="text-[#d72828] hover:text-red-500 font-bold ml-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}