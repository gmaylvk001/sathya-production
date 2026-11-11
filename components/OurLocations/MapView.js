"use client";
import { useState, useEffect, useRef } from "react";
 
const MAPS_MID = "1vsvXMLc5zU4Aoks8fq6rNSBTauwsMYtz";
 
export default function MapView({ selectedStore }) {
  const [showCard, setShowCard] = useState(false);
 
  const [mapActive, setMapActive] = useState(false);
 
  const overlayRef = useRef(null);
 
 
  useEffect(() => {
    if (selectedStore?._coords?.lat) {
      setShowCard(true);
    } else {
      setShowCard(false);
    }
  }, [selectedStore]);
 
 
  useEffect(() => {
    if (!mapActive) return;
    const handler = (e) => {
      if (!e.target.closest("#map-container")) {
        setMapActive(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [mapActive]);
 
  // Always use My Maps (no "Place info couldn't load"
  // Just shift center to selected store when one is picked
 
  // Forward wheel events to the page on the wrapper, not the overlay
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
 
    const forwardScroll = (e) => {
      window.scrollBy({ top: e.deltaY, left: e.deltaX });
    };
 
    el.addEventListener("wheel", forwardScroll, { passive: true });
 
    return () => {
      el.removeEventListener("wheel", forwardScroll);
    };
  }, []);
 
 
  const src = selectedStore?._coords?.lat
    ? `https://www.google.com/maps/d/embed?mid=${MAPS_MID}&ll=${selectedStore._coords.lat},${selectedStore._coords.lng}&z=14`
    : `https://www.google.com/maps/d/embed?mid=${MAPS_MID}&ll=11.636463743060151,77.66049321182919&z=9`;
 
  return (
 
    <div
      id="map-container"
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
 
    <div ref={overlayRef} style={{ width: "100%", height: "100%", position: "relative" }}>
 
      <iframe
        key={src}
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0, touchAction: "none" }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
 
 
      {!mapActive && (
        <div
          onClick={() => setMapActive(true)}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            cursor: "pointer",
            background: "transparent",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.55)",
              color: "white",
              fontSize: 13,
              padding: "6px 14px",
              borderRadius: 20,
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
 
 
 
            🗺️ Click to interact with map
          </div>
        </div>
      )}
   
 
 
 
      {showCard && selectedStore && (
        <>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, calc(-100% - 52px))",
              zIndex: 10,
              minWidth: "200px",
              maxWidth: "280px",
            }}
          >
            <div className="bg-white rounded-lg shadow-xl px-4 py-3 relative">
              <button
                onClick={() => setShowCard(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
 
              <p className="font-bold text-gray-900 text-sm pr-4 leading-tight">
                {selectedStore.organisation_name}
              </p>
 
              {(selectedStore.address || selectedStore.location) && (
                <p className="text-xs text-gray-500 mt-1 leading-snug">
                  {selectedStore.address || selectedStore.location}
                </p>
              )}
 
              {selectedStore.phone && (
                <a
                  href={`tel:${selectedStore.phone}`}
                  className="flex items-center gap-1 text-xs text-[#d72828] mt-1.5 hover:underline"
                >
                  <svg
                    className="w-3 h-3 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.684l1.518 4.553a1 1 0 01-.272 1.06l-1.2 1.2a16.001 16.001 0 006.586 6.586l1.2-1.2a1 1 0 011.06-.272l4.553 1.518a1 1 0 01.684.95V19a2 2 0 01-2 2h-1C9.163 21 3 14.837 3 7V5z"
                    />
                  </svg>
                  +91{selectedStore.phone}
                </a>
              )}
            </div>
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "10px solid transparent",
                borderRight: "10px solid transparent",
                borderTop: "10px solid white",
                margin: "0 auto",
                filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.10))",
              }}
            />
          </div>
 
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -100%)",
              zIndex: 9,
              pointerEvents: "none",
            }}
          >
            <svg
              width="32"
              height="44"
              viewBox="0 0 32 44"
              xmlns="http://www.w3.org/2000/svg"
              style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.35))" }}
            >
              <path
                d="M16 0C7.163 0 0 7.163 0 16c0 11.667 16 28 16 28S32 27.667 32 16C32 7.163 24.837 0 16 0z"
                fill="#E53E3E"
              />
              <circle cx="16" cy="16" r="6" fill="white" />
            </svg>
          </div>
        </>
      )}
      </div>
    </div>
  );
}