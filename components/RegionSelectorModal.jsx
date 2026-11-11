"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRegion } from "@/context/RegionContext";
import { FiSearch, FiX } from "react-icons/fi";
import { isValidPincode, getCityPincode } from "@/lib/regionHelper";

// Bespoke Line-Art Icons for the 5 South Indian States
const StateLineArt = ({
  type,
  isSelected,
  className = "w-11 h-11 sm:w-12 sm:h-12",
}) => {
  const color = isSelected ? "#dc2626" : "#4b5563";

  switch (type) {
    case "gopuram":
      // Tamil Nadu - Dravidian Temple Gopuram Line Art
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M30 4H34M32 2V6M28 6H36" />
          <path d="M26 8H38L36 14H28L26 8Z" />
          <path d="M30 10H34M32 8V12" />
          <path d="M24 14H40L38 22H26L24 14Z" />
          <path d="M28 17H36M32 14V20" />
          <path d="M22 22H42L40 32H24L22 22Z" />
          <path d="M26 27H38M32 22V30M28 25V29M36 25V29" />
          <path d="M20 32H44L42 44H22L20 32Z" />
          <path d="M24 38H40M32 32V42M27 35V41M37 35V41" />
          <path d="M16 44H48V56H16V44Z" />
          <path d="M28 56V48C28 46 30 45 32 45C34 45 36 46 36 48V56" />
          <path d="M12 56H52M10 59H54" />
        </svg>
      );

    case "houseboat":
      // Kerala - Backwaters Houseboat & Palm Tree Line Art
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M18 42C17 30 20 18 24 10" strokeWidth="1.6" />
          <path d="M24 10C18 9 10 13 8 20" />
          <path d="M24 10C21 5 15 4 10 7" />
          <path d="M24 10C27 4 34 5 36 10" />
          <path d="M24 10C28 13 32 18 31 24" />
          <path d="M24 10C21 15 18 22 19 25" />
          <path d="M12 46C20 47 44 47 52 46C56 46 58 48 56 51C52 56 42 57 32 57C22 57 12 56 8 51C6 48 8 46 12 46Z" />
          <path d="M20 46C20 34 26 26 38 26C46 26 50 33 50 46H20Z" />
          <path d="M26 37H32V42H26V37Z" />
          <path d="M36 37H42V42H36V37Z" />
          <path d="M6 60C14 59 18 61 26 60M34 60C42 59 48 61 58 60" />
        </svg>
      );

    case "palace":
      // Karnataka - Mysore Palace / Vidhana Soudha Line Art
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M32 4V8M30 8H34" />
          <path d="M26 20C26 13 32 9 32 9C32 9 38 13 38 20H26Z" />
          <path d="M18 16V18M16 26C16 20 20 18 20 18C20 18 24 20 24 26H16Z" />
          <path d="M46 16V18M40 26C40 20 44 18 44 18C44 18 48 20 48 26H40Z" />
          <path d="M14 26H50V36H14V26Z" />
          <path d="M20 36V26M28 36V26M36 36V26M44 36V26" />
          <path d="M10 36H54V54H10V36Z" />
          <path d="M28 54V42C28 40 30 38 32 38C34 38 36 40 36 42V54" />
          <path d="M18 54V44M23 54V44M41 54V44M46 54V44" />
          <path d="M8 54H56M6 57H58" />
        </svg>
      );

    case "stupa":
      // Andhra Pradesh & Telangana - Heritage Line Art
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M32 4V12M28 7H36M25 10H39" />
          <path d="M27 12H37V16H27V12Z" />
          <path d="M18 38C18 24 24 16 32 16C40 16 46 24 46 38H18Z" />
          <path d="M15 38H49V46H15V38Z" />
          <path d="M21 38V46M27 38V46M32 38V46M37 38V46M43 38V46" />
          <path d="M12 46H52V56H12V46Z" />
          <path d="M26 56V49C26 47 29 46 32 46C35 46 38 47 38 49V56" />
          <circle cx="32" cy="28" r="2.5" />
          <path d="M8 56H56M6 59H58" />
        </svg>
      );

    default:
      return null;
  }
};

export default function RegionSelectorModal() {
  const {
    selectedRegion,
    allRegions,
    isRegionModalOpen,
    isDetecting,
    detectionError,
    closeRegionModal,
    selectRegion,
    setPincode,
    detectLocation,
    setDetectionError,
    userLocation,
  } = useRegion();

  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredRegionId, setHoveredRegionId] = useState(null);
  const [showAllCities, setShowAllCities] = useState(false);
  const [viewportMetrics, setViewportMetrics] = useState({
    height: typeof window !== "undefined" ? window.innerHeight : 800,
    offsetTop: 0,
    isKeyboardOpen: false,
  });
  const [isInputFocused, setIsInputFocused] = useState(false);
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isRegionModalOpen) {
        closeRegionModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRegionModalOpen, closeRegionModal]);

  // Lock body scroll completely when modal is open
  useEffect(() => {
    if (isRegionModalOpen) {
      const scrollBarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
      setHoveredRegionId(null);
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.paddingRight = "";
      setSearchQuery("");
      setShowAllCities(false);
      setHoveredRegionId(null);
      setIsInputFocused(false);
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isRegionModalOpen]);

  // Visual Viewport & Mobile Keyboard Detection for Responsive Positioning
  useEffect(() => {
    if (typeof window === "undefined" || !isRegionModalOpen) return;

    const updateMetrics = () => {
      const vv = window.visualViewport;
      const vh = vv ? vv.height : window.innerHeight;
      const offsetTop = vv ? vv.offsetTop : 0;
      const fullHeight = window.innerHeight;

      // On mobile viewports (< 768px), keyboard is open when visual viewport shrinks significantly
      const isMobile = window.innerWidth < 768;
      const diff = fullHeight - vh;
      const keyboardOpen = isMobile && (diff > 120 || (isInputFocused && vh < fullHeight - 100));

      setViewportMetrics({
        height: vh,
        offsetTop: Math.max(0, offsetTop),
        isKeyboardOpen: keyboardOpen,
      });
    };

    updateMetrics();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", updateMetrics);
      vv.addEventListener("scroll", updateMetrics);
    }
    window.addEventListener("resize", updateMetrics);

    return () => {
      if (vv) {
        vv.removeEventListener("resize", updateMetrics);
        vv.removeEventListener("scroll", updateMetrics);
      }
      window.removeEventListener("resize", updateMetrics);
    };
  }, [isRegionModalOpen, isInputFocused]);

  // Active hovered region object
  const activeHoveredRegion = useMemo(() => {
    if (!hoveredRegionId) return null;
    return allRegions.find((r) => r.id === hoveredRegionId) || null;
  }, [allRegions, hoveredRegionId]);

  // Search filter across states and cities
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    // Direct pincode check
    if (isValidPincode(q)) {
      return [{ isPincode: true, pincode: q }];
    }

    const matches = [];
    allRegions.forEach((region) => {
      const stateMatch =
        region.name.toLowerCase().includes(q) ||
        region.nativeName?.toLowerCase().includes(q) ||
        region.code?.toLowerCase().includes(q);

      region.popularCities.forEach((city) => {
        if (city.toLowerCase().includes(q) || stateMatch) {
          matches.push({
            city,
            region,
          });
        }
      });
    });

    return matches;
  }, [allRegions, searchQuery]);

  // Handle city selection with exact city pincode
  const handleSelectCity = (region, city) => {
    const targetRegion = region || selectedRegion || allRegions[0];
    const pin = getCityPincode(city, targetRegion?.id || targetRegion);
    selectRegion(targetRegion, city, pin);
    closeRegionModal();
  };

  // Handle pincode submit
  const handlePincodeSubmit = async (pin) => {
    if (isValidPincode(pin)) {
      const success = await setPincode(pin);
      if (success) {
        setSearchQuery("");
      }
    } else {
      setDetectionError?.("Please enter a valid 6-digit pincode");
    }
  };

  if (!isRegionModalOpen) return null;

  return (
    <div
      className={`fixed left-0 right-0 z-[99999] flex justify-center ${
        viewportMetrics.isKeyboardOpen
          ? "items-start pt-2 xs:pt-3"
          : "items-center"
      } p-2.5 xs:p-3 sm:p-4 select-none overflow-y-auto transition-[padding,top] duration-200`}
      style={{
        top: viewportMetrics.isKeyboardOpen
          ? `${viewportMetrics.offsetTop}px`
          : "0px",
        height: viewportMetrics.isKeyboardOpen
          ? `${viewportMetrics.height}px`
          : "100%",
        maxHeight: viewportMetrics.isKeyboardOpen
          ? `${viewportMetrics.height}px`
          : "100dvh",
      }}
    >
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 touch-none"
        onClick={closeRegionModal}
      />

      {/* Main Modal Card */}
      <div
        ref={modalRef}
        className={`relative w-full max-w-[560px] bg-white rounded-2xl sm:rounded-xl shadow-2xl z-10 border border-gray-100/90 transition-all duration-200 p-3.5 sm:p-6 overflow-y-auto overflow-x-hidden animate-fadeIn ${
          viewportMetrics.isKeyboardOpen ? "my-0" : "my-auto"
        }`}
        style={{
          maxHeight: viewportMetrics.isKeyboardOpen
            ? `${Math.max(viewportMetrics.height - 16, 220)}px`
            : "calc(100dvh - 1.5rem)",
          boxShadow:
            "0 20px 50px -10px rgba(0, 0, 0, 0.35), 0 0 1px 1px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Top Search / Pincode Input with Submit & Close */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isValidPincode(searchQuery)) {
              handlePincodeSubmit(searchQuery);
            }
          }}
          className="relative flex items-center w-full"
        >
          <FiSearch className="absolute left-3 sm:left-3.5 text-gray-400 text-base sm:text-lg pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by city or enter 6-digit pincode"
            autoFocus
            maxLength={20}
            className={`w-full pl-9 sm:pl-10 ${
              isValidPincode(searchQuery) ? "pr-24 sm:pr-24" : "pr-9 sm:pr-10"
            } h-11 sm:h-11 bg-white border border-gray-300 hover:border-gray-400 focus:border-red-500 rounded-lg text-xs sm:text-sm text-gray-800 placeholder-gray-400 placeholder:text-[11px] xs:placeholder:text-[11.5px] sm:placeholder:text-sm focus:outline-none transition-colors`}
          />
          {isValidPincode(searchQuery) && (
            <button
              type="submit"
              disabled={isDetecting}
              className="absolute right-9 sm:right-10 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
            >
              Apply
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (searchQuery) {
                setSearchQuery("");
              } else {
                closeRegionModal();
              }
            }}
            className="absolute right-1 sm:right-2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 active:text-gray-800 transition-colors cursor-pointer touch-manipulation"
            aria-label="Close or clear"
          >
            <FiX size={18} />
          </button>
        </form>

        {/* Sub-header: Detect Location & Selected State */}
        <div className="flex items-center justify-between mt-2.5 sm:mt-3 text-xs gap-2 min-h-[26px]">
          <button
            type="button"
            onClick={detectLocation}
            disabled={isDetecting}
            className="text-[#dc2626] hover:text-[#b91c1c] font-medium flex items-center gap-1 cursor-pointer active:scale-95 transition-all disabled:opacity-60 text-[11px] sm:text-xs py-1 touch-manipulation shrink-0"
          >
            <span className="text-[#dc2626] text-xs leading-none">✦</span>
            <span>
              {isDetecting ? "Detecting location..." : "Detect my location"}
            </span>
          </button>

          <div className="text-gray-500 text-[11px] sm:text-xs text-right truncate shrink-0">
            <span>Selected: </span>
            <strong className="text-gray-900 font-semibold">
              {selectedRegion?.name || "Tamil Nadu"}
            </strong>
          </div>
        </div>

        {/* Detection Error message if any */}
        {detectionError && (
          <div className="mt-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-md text-xs text-red-700 flex items-center justify-between">
            <span>{detectionError}</span>
            <button
              onClick={() => setDetectionError?.(null)}
              className="text-red-500 hover:text-red-700 ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content View: Search Results OR 5 States */}
        {searchQuery ? (
          /* Search Results View */
          <div className="mt-3.5 sm:mt-4 pt-3 border-t border-gray-100 min-h-[120px] max-h-[240px] overflow-hidden">
            {searchResults && searchResults[0]?.isPincode ? (
              <div className="py-4 text-center">
                <p className="text-xs text-gray-600 mb-2">
                  Apply delivery location for pincode:{" "}
                  <strong>{searchResults[0].pincode}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => handlePincodeSubmit(searchResults[0].pincode)}
                  disabled={isDetecting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold transition-all cursor-pointer"
                >
                  {isDetecting ? "Verifying..." : "Deliver to this Pincode"}
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 font-medium mb-2">
                  Matching Cities & States ({searchResults?.length || 0}):
                </p>
                {searchResults && searchResults.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-[180px] overflow-y-auto">
                    {searchResults.slice(0, 15).map(({ city, region }, idx) => (
                      <button
                        key={`${region.id}-${city}-${idx}`}
                        onClick={() => handleSelectCity(region, city)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-gray-200 rounded-md text-xs font-medium text-gray-700 transition-all active:scale-95 cursor-pointer touch-manipulation"
                      >
                        <span>{city}</span>
                        <span className="text-[10px] text-gray-400 font-normal">
                          ({region.code})
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-gray-500">
                    No matching city found for "{searchQuery}".
                  </div>
                )}
              </>
            )}
          </div>
        ) : showAllCities ? (
          /* All Cities Directory View */
          <div className="mt-3.5 sm:mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                All Cities
              </span>
              <button
                onClick={() => setShowAllCities(false)}
                className="text-xs text-[#dc2626] hover:underline font-medium cursor-pointer"
              >
                Back to States
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-h-[220px] sm:max-h-none overflow-y-auto">
              {allRegions.map((region) => (
                <div key={region.id} className="space-y-1">
                  <div
                    onClick={() => {
                      selectRegion(region);
                      closeRegionModal();
                    }}
                    className="text-xs font-bold text-gray-900 hover:text-red-600 cursor-pointer"
                  >
                    {region.name}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {region.popularCities.slice(0, 5).map((city) => (
                      <button
                        key={city}
                        onClick={() => handleSelectCity(region, city)}
                        className="text-left text-[11px] text-gray-600 hover:text-red-600 transition-colors py-0.5 truncate cursor-pointer"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Default 5 States Layout */
          <div className="mt-3 sm:mt-4" onMouseLeave={() => setHoveredRegionId(null)}>
            <div className="text-center text-[11px] sm:text-xs text-gray-500 font-normal mb-2.5 sm:mb-3">
              Select Your State or Location
            </div>

            {/* Exactly 5 South Indian States */}
            <div className="grid grid-cols-5 gap-1 sm:gap-2 items-start justify-center">
              {allRegions.map((region) => {
                const isHovered = hoveredRegionId === region.id;
                const isSelected = selectedRegion?.id === region.id;
                const isActive = isHovered || (!hoveredRegionId && isSelected);

                return (
                  <div
                    key={region.id}
                    className="flex flex-col items-center justify-start cursor-pointer group select-none py-1.5 px-0.5 sm:px-1 rounded-lg transition-all border border-transparent hover:border-gray-200 active:scale-95 touch-manipulation min-w-0"
                    onMouseEnter={() => setHoveredRegionId(region.id)}
                    onClick={() => {
                      selectRegion(region);
                      closeRegionModal();
                    }}
                  >
                    {/* Landmark Line Art Icon */}
                    <div
                      className={`flex items-center justify-center transition-transform duration-150 ${
                        isActive ? "scale-105" : "group-hover:scale-105"
                      }`}
                    >
                      <StateLineArt
                        type={region.iconType}
                        isSelected={isActive}
                        className="w-9 h-9 sm:w-11 sm:h-11 transition-colors duration-150"
                      />
                    </div>

                    {/* State Name */}
                    <span
                      className={`mt-1 sm:mt-1.5 text-[10px] sm:text-xs text-center leading-[1.2] transition-colors duration-150 break-words w-full px-0.5 ${
                        isActive
                          ? "text-gray-900 font-bold"
                          : "text-gray-600 group-hover:text-gray-900"
                      }`}
                    >
                      {region.name}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom Slot: Sub-cities Gray Banner for Hovered or Selected State */}
            {(() => {
              const currentDisplayRegion = activeHoveredRegion || selectedRegion || allRegions[0];
              return (
                <div className="mt-3 sm:mt-4 min-h-[36px] flex flex-col items-center justify-center gap-2">
                  {currentDisplayRegion && (
                    <div
                      className="w-full bg-[#f4f4f4] rounded-lg px-2.5 py-1.5 sm:px-4 sm:py-2 flex items-center justify-start sm:justify-center gap-2 sm:gap-4 text-[11px] sm:text-xs text-gray-700 overflow-x-auto whitespace-nowrap scrollbar-none animate-fadeIn"
                      style={{
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                        WebkitOverflowScrolling: "touch",
                      }}
                      onMouseEnter={() => setHoveredRegionId(currentDisplayRegion.id)}
                    >
                      {currentDisplayRegion.popularCities
                        .slice(0, 6)
                        .map((city, idx) => {
                          const isSelectedCity =
                            userLocation?.city?.toLowerCase() === city.toLowerCase() &&
                            selectedRegion?.id === currentDisplayRegion.id;
                          return (
                            <button
                              key={`${currentDisplayRegion.id}-${city}-${idx}`}
                              onClick={() =>
                                handleSelectCity(currentDisplayRegion, city)
                              }
                              className={`py-1 px-1.5 sm:px-0 transition-colors cursor-pointer text-left whitespace-nowrap flex-shrink-0 text-[11px] sm:text-xs touch-manipulation active:scale-95 ${
                                isSelectedCity
                                  ? "text-[#dc2626] font-bold underline underline-offset-4 decoration-2"
                                  : "text-gray-700 hover:text-[#dc2626] hover:font-semibold"
                              }`}
                            >
                              {city}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
