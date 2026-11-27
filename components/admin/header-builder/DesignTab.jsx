"use client";

import React from "react";
import { FiCheck } from "react-icons/fi";

export default function DesignTab({ design, onSelectDesign }) {
  const cards = [
    {
      id: "modern",
      title: "Modern Retail",
      badge: "3-Row Layout",
      description:
        "Top announcement bar (flash sale + stores + helpline + sign in), main row with Deliver-to box, search & icons, plus full-width category bar.",
      features: ["Top Announcement Bar", "Deliver-to Pincode Pill", "All Categories Button"],
    },
    {
      id: "classic",
      title: "Classic Sathya",
      badge: "2-Row Layout",
      description:
        "Traditional Sathya 2-row header with logo, search, Deals pill & quick-action icons on top, optional accent line, and centered menu links below.",
      features: ["2-Row Compact Layout", "Optional Accent Line", "Centered Menu Links"],
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-gray-900">Choose Header Design</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Select the layout structure for your storefront. Switching designs updates the live preview and adjusts available fields in other tabs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => {
          const active = design === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectDesign(card.id)}
              className={`text-left rounded-2xl border-2 p-4 transition-all cursor-pointer relative ${
                active
                  ? "border-red-600 bg-red-50/40 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-700 mb-1">
                    {card.badge}
                  </span>
                  <h4 className="text-sm font-bold text-gray-900">{card.title}</h4>
                </div>
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 ${
                    active
                      ? "bg-red-600 border-red-600 text-white"
                      : "bg-white border-gray-300 text-transparent"
                  }`}
                >
                  <FiCheck size={14} />
                </span>
              </div>

              {/* Thumbnail Wireframe */}
              <div className="rounded-xl border border-gray-200 bg-white p-2 mb-3 space-y-1.5">
                {card.id === "modern" ? (
                  <>
                    <div className="h-3 rounded bg-gradient-to-r from-[#0b1033] to-[#00c6ff] flex items-center justify-between px-1.5">
                      <span className="w-8 h-1.5 rounded bg-red-500" />
                      <span className="w-12 h-1 rounded bg-white/70" />
                    </div>
                    <div className="h-6 rounded bg-gray-50 flex items-center justify-between px-1.5 gap-1.5">
                      <span className="w-7 h-3 rounded bg-red-600" />
                      <span className="w-8 h-3 rounded bg-gray-200" />
                      <span className="flex-1 h-3.5 rounded-full border border-gray-300 bg-white" />
                      <span className="w-8 h-3 rounded bg-gray-200" />
                    </div>
                    <div className="h-4 rounded bg-gradient-to-r from-[#e31e24] via-white to-[#ffe600] border border-gray-100 flex items-center px-1 gap-1.5">
                      <span className="w-9 h-2.5 rounded bg-red-600" />
                      <span className="w-6 h-1.5 rounded bg-gray-400" />
                      <span className="w-6 h-1.5 rounded bg-gray-400" />
                      <span className="w-6 h-1.5 rounded bg-gray-400" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-7 rounded bg-gray-50 flex items-center justify-between px-1.5 gap-1.5">
                      <span className="w-7 h-3 rounded bg-red-600" />
                      <span className="flex-1 h-3.5 rounded-full border border-gray-300 bg-white" />
                      <span className="w-6 h-3 rounded bg-gradient-to-r from-cyan-400 via-red-500 to-yellow-400" />
                      <span className="w-10 h-3 rounded bg-gray-200" />
                    </div>
                    <div className="h-0.5 bg-yellow-400 rounded" />
                    <div className="h-4 rounded bg-[#b91c1c] flex items-center justify-between px-1.5">
                      <span className="w-6 h-2 rounded bg-white/30" />
                      <div className="flex gap-1.5 mx-auto">
                        <span className="w-6 h-1.5 rounded bg-white/80" />
                        <span className="w-6 h-1.5 rounded bg-white/80" />
                        <span className="w-6 h-1.5 rounded bg-white/80" />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <p className="text-xs text-gray-600 leading-relaxed mb-2.5">{card.description}</p>

              <div className="flex flex-wrap gap-1.5">
                {card.features.map((f) => (
                  <span
                    key={f}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
