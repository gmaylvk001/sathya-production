// components/CompareEmptyState.jsx
// Shown on /compare when the compare list is empty. Red Sathya theme.

'use client';

import Link from 'next/link';
import { GitCompare } from 'lucide-react';

const BRAND_RED = '#d72828';

export default function CompareEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      {/* Illustration */}
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-full flex items-center justify-center shadow-inner" style={{ background: `${BRAND_RED}10` }}>
          <GitCompare size={56} strokeWidth={1.2} style={{ color: `${BRAND_RED}60` }} />
        </div>
        {/* Decorative ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-dashed"
          style={{
            borderColor: `${BRAND_RED}30`,
            animation: 'spin-slow 12s linear infinite',
          }}
        />
      </div>

      <h2 className="text-2xl font-extrabold text-gray-800 mb-2">Nothing to Compare Yet</h2>
      <p className="text-sm text-gray-500 max-w-xs mb-8 leading-relaxed">
        Add up to 4 products from the same category and compare their full specifications side by side.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-sm active:scale-95 text-sm hover:opacity-90"
        style={{ background: BRAND_RED }}
      >
        Continue Shopping
      </Link>

      <style>{`
        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
