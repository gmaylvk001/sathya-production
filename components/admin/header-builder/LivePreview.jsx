"use client";

import React, { useState } from "react";
import { FiMonitor, FiTablet, FiSmartphone, FiChevronUp, FiChevronDown } from "react-icons/fi";
import Headernew from "@/components/Headernew";
import "@/components/header/header.css";

export default function LivePreview({ settings }) {
  const [viewport, setViewport] = useState("desktop"); // "desktop" | "tablet" | "mobile"
  const [collapsed, setCollapsed] = useState(false);

  const isDesktop = viewport === "desktop";
  const frameWidth = isDesktop ? "100%" : viewport === "tablet" ? "768px" : "390px";
  const isModern = settings.design === "modern";

  return (
    <div className="lg:sticky lg:top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-xs">
      <div className="px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 bg-gray-50/90 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
            Live Preview
          </span>
          <span className="text-[11px] text-gray-500 hidden sm:inline">
            ({isModern ? "Modern Retail" : "Classic Sathya"})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-gray-200/70 p-0.5">
            {[
              { id: "desktop", label: "Desktop", Icon: FiMonitor },
              { id: "tablet", label: "Tablet", Icon: FiTablet },
              { id: "mobile", label: "Mobile", Icon: FiSmartphone },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewport(id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${viewport === id
                    ? "bg-white text-gray-900 shadow-2xs"
                    : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                <Icon size={13} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-[11px] font-semibold text-gray-700 transition-colors cursor-pointer"
          >
            {collapsed ? <FiChevronDown size={13} /> : <FiChevronUp size={13} />}
            <span>{collapsed ? "Expand preview" : "Collapse preview"}</span>
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-2.5 bg-gray-100/80 overflow-x-auto flex justify-center">
          <div
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200"
            style={{ width: frameWidth, maxWidth: "100%" }}
          >
            <Headernew previewSettings={settings} previewViewport={viewport} />
          </div>
        </div>
      )}
    </div>
  );
}
