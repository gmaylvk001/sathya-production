import React from "react";

function BestPriceBadgeIcon({ compact = false }) {
  return (
    <div className="relative flex items-center justify-center shrink-0">
      <style>{`
        @keyframes badgeZoomInOut {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.12);
          }
        }
        .animate-zoom-in-out {
          animation: badgeZoomInOut 2s ease-in-out infinite;
          transform-origin: center;
        }
      `}</style>
      <svg
        viewBox="0 0 100 100"
        className={`${
          compact
            ? "w-[26px] h-[26px] min-w-[26px] sm:w-[44px] sm:h-[44px] sm:min-w-[44px]"
            : "w-[40px] h-[40px] min-w-[40px] sm:w-[44px] sm:h-[44px] sm:min-w-[44px]"
        } shrink-0 animate-zoom-in-out drop-shadow-sm`}
        aria-label="Best Price"
      >
        <defs>
          {/* Sathya Brand Red Gradient */}
          <linearGradient id="sathyaRed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EA1D27" />
            <stop offset="100%" stopColor="#A80D15" />
          </linearGradient>
          {/* Sathya Brand Gold Gradient */}
          <linearGradient id="sathyaGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF275" />
            <stop offset="100%" stopColor="#FFC700" />
          </linearGradient>
        </defs>

        {/* Tight Starburst Stamp Seal matching reference */}
        <path
          d="M50 2 
          L58 8 L67 6 L72 15 L82 16 L84 26 L93 30 L92 41 L98 48 
          L93 55 L95 65 L86 69 L83 79 L74 81 L68 90 L59 88 
          L50 95 
          L41 88 L32 90 L26 81 L17 79 L14 69 L5 65 L7 55 L2 48 
          L7 41 L6 30 L15 26 L17 16 L27 15 L32 6 L41 8 Z"
          fill="url(#sathyaRed)"
          stroke="url(#sathyaGold)"
          strokeWidth="3"
        />

        {/* Inner Dark Red Base */}
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="#A80D15"
          stroke="url(#sathyaGold)"
          strokeWidth="1.2"
        />

        {/* Small Sathya Crown on top */}
        <path
          d="M38 21 L42 26 L50 18 L58 26 L62 21 L60 29 L40 29 Z"
          fill="url(#sathyaGold)"
        />
        <circle cx="38" cy="20" r="1.3" fill="#FFFFFF" />
        <circle cx="50" cy="17" r="1.6" fill="#FFFFFF" />
        <circle cx="62" cy="20" r="1.3" fill="#FFFFFF" />

        {/* Full Badge BEST Text */}
        <text
          x="50"
          y="50"
          textAnchor="middle"
          fontFamily="Impact, Arial Black, system-ui, sans-serif"
          fontWeight="900"
          fontSize="26"
          letterSpacing="-0.5"
          fill="#FFFFFF"
          stroke="#5C0004"
          strokeWidth="1.2"
          paintOrder="stroke fill"
        >
          BEST
        </text>

        {/* Full Badge PRICE Text */}
        <text
          x="50"
          y="73"
          textAnchor="middle"
          fontFamily="Impact, Arial Black, system-ui, sans-serif"
          fontWeight="900"
          fontSize="22"
          letterSpacing="-0.5"
          fill="#FFE600"
          stroke="#5C0004"
          strokeWidth="1.2"
          paintOrder="stroke fill"
        >
          PRICE
        </text>
      </svg>
    </div>
  );
}

export default function BestPriceStrip({
  effectivePrice,
  onOffersClick,
  compact = false,
  className = "",
}) {
  if (!effectivePrice || isNaN(effectivePrice)) {
    return null;
  }

  const formatter = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  });
  const formattedPrice = formatter.format(Math.round(effectivePrice));

  const handleOffersClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOffersClick) {
      onOffersClick(e);
    }
  };

  return (
    <div 
      onClick={onOffersClick ? handleOffersClick : undefined}
      className={`w-full box-border rounded-[8px] bg-[#f8faff] border border-[#e2e8f0] ${
        compact
          ? "p-1.5 sm:px-2.5 sm:py-1.5 gap-1.5 sm:gap-2 mb-1.5 sm:mb-2"
          : "px-2.5 py-1.5 mb-2 gap-2"
      } flex items-center ${
        onOffersClick ? "cursor-pointer hover:bg-blue-50/60 hover:border-blue-200 transition-all" : ""
      } ${className}`}
    >
      {/* Left: Badge Icon */}
      <BestPriceBadgeIcon compact={compact} />

      {/* Right: Stacked Text & Description */}
      <div className="flex flex-col justify-center min-w-0 leading-tight">
        {/* Title / Price */}
        <span
          className={`text-[#16a34a] font-bold ${
            compact ? "text-[12px] sm:text-[14px]" : "text-[14px]"
          } leading-tight tracking-tight`}
        >
          ₹{formattedPrice}
        </span>

        {/* Description / Subtext with Offers indented right beside the badge */}
        <span
          className={`${
            compact ? "text-[9.5px] sm:text-[10px]" : "text-[10px]"
          } text-gray-500 leading-tight`}
        >
          with all applicable{" "}
          <button
            type="button"
            onClick={handleOffersClick}
            className={`text-[#2563eb] font-semibold ${
              compact ? "text-[9.5px] sm:text-[10px]" : "text-[10px]"
            } leading-tight hover:underline inline p-0 focus:outline-none cursor-pointer`}
          >
            Offers
          </button>
        </span>
      </div>
    </div>
  );
}
