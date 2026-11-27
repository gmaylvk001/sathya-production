"use client";

import React from "react";

const DEFAULT_CHIPS = ["#e31e24", "#b91c1c", "#ffe600", "#ffffff", "#111827", "#161616", "#0b1033", "#00c6ff", "#14532d"];

export default function ColorField({
  label,
  helper,
  value,
  onChange,
  chips = DEFAULT_CHIPS,
}) {
  const safeHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value || "")
    ? (value.length === 4
      ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
      : value)
    : "#ffffff";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-gray-800">{label}</label>
        {helper && <span className="text-[11px] text-gray-400">{helper}</span>}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safeHex}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white shrink-0"
          aria-label={`${label} color picker`}
        />
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#ffffff"
          maxLength={7}
          className="w-full px-2.5 py-1.5 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
        />
      </div>
      {chips && chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              title={c}
              className={`w-4 h-4 rounded-full border transition-transform hover:scale-110 ${
                (value || "").toLowerCase() === c.toLowerCase()
                  ? "ring-2 ring-red-500 ring-offset-1 border-gray-400"
                  : "border-gray-300"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
