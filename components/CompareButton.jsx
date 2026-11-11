// components/CompareButton.jsx
//
// Reusable "Add to Compare" toggle button.
// Used in: product cards (icon-only variant) and product detail pages (text variant).
//
// Props:
//   product     — full product object (needs _id, category, name, etc.)
//   variant     — 'icon' | 'text' (default: 'icon')
//   className   — optional override
//   iconSize    — icon size in pixels
//   label       — default text for inactive state
//   activeLabel — text for active in-compare state

'use client';

import { useState, useEffect } from 'react';
import { useCompare } from '@/context/CompareContext';
import { GitCompare, Check } from 'lucide-react';

const CompareButton = ({
  product,
  variant = 'icon',
  className = '',
  iconSize = 15,
  label = 'Compare',
  activeLabel = 'In Compare',
}) => {
  const { isInCompare, addToCompare, removeFromCompare } = useCompare();
  const [inCompare, setInCompare] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Keep local state in sync with context
  useEffect(() => {
    setInCompare(isInCompare(product?._id));
  }, [product?._id, isInCompare]);

  if (!product?._id) return null;

  const handleClick = async (e) => {
    e.preventDefault(); // Prevent card link navigation
    e.stopPropagation();
    if (isLoading) return;

    setIsLoading(true);
    try {
      if (inCompare) {
        await removeFromCompare(product._id);
      } else {
        await addToCompare(product);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Icon-only variant (used in product cards) ─────────────────────────────
  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        aria-label={
          inCompare
            ? `Remove ${product.name || 'product'} from compare`
            : `Add ${product.name || 'product'} to compare`
        }
        title={inCompare ? 'Remove from Compare' : 'Add to Compare'}
        className={
          className
            ? `${className} ${
                inCompare
                  ? 'text-[#d72828] border-red-400 bg-red-50'
                  : 'text-gray-500 hover:text-[#d72828]'
              }`
            : `w-7 h-7 rounded-full bg-white/90 backdrop-blur-md shadow-xs border flex items-center justify-center transition-all active:scale-95 ${
                inCompare
                  ? 'border-red-400 text-[#d72828] bg-red-50'
                  : 'border-gray-100 text-gray-500 hover:text-[#d72828] hover:border-red-300 hover:bg-red-50 hover:scale-110'
              }`
        }
      >
        {inCompare ? (
          <Check
            size={13}
            strokeWidth={2.8}
            className={`transition-colors ${isLoading ? 'opacity-50' : ''}`}
          />
        ) : (
          <GitCompare
            size={14}
            strokeWidth={1.8}
            className={`transition-colors ${isLoading ? 'opacity-50' : ''}`}
          />
        )}
      </button>
    );
  }

  // ── Text variant (used in product detail pages) ───────────────────────────
  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      aria-label={
        inCompare
          ? `Remove ${product.name || 'product'} from compare list`
          : `Add ${product.name || 'product'} to compare list`
      }
      className={
        className
          ? `${className} ${inCompare ? '!text-[#d72828] font-bold' : ''}`
          : `inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-all duration-200 active:scale-95 ${
              inCompare
                ? 'bg-[#d72828] text-white border-[#d72828] hover:bg-[#b52020]'
                : 'bg-white text-gray-700 border-gray-300 hover:border-red-400 hover:text-[#d72828] hover:bg-red-50'
            }`
      }
    >
      {inCompare ? (
        <Check size={iconSize} strokeWidth={2.8} className="text-[#d72828] shrink-0" />
      ) : (
        <GitCompare size={iconSize} strokeWidth={2} className="shrink-0" />
      )}
      <span className="whitespace-nowrap">{isLoading ? '...' : inCompare ? (typeof activeLabel === 'string' ? activeLabel.replace(/^[✓✔]\s*/, '') : activeLabel) : label}</span>
    </button>
  );
};

export default CompareButton;
