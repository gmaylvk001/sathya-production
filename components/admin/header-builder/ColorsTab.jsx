"use client";

import React, { useMemo } from "react";
import { FiAlertTriangle } from "react-icons/fi";
import ColorField from "./ColorField";
import {
  READY_THEMES,
  checkMenuContrast,
  buildMenuBackgroundCss,
} from "@/lib/headerSettings";

const DIRECTIONS = [
  { label: "Left to Right", value: "90deg" },
  { label: "Right to Left", value: "270deg" },
  { label: "Top to Bottom", value: "180deg" },
  { label: "Diagonal", value: "135deg" },
];

export default function ColorsTab({ settings, onChange }) {
  const isModern = settings.design === "modern";
  const { topbar, main, menu } = settings;
  const g = menu?.gradient || {};

  const bgMode =
    menu?.bg_mode ||
    (menu?.bg_type === "gradient"
      ? g.mid_enabled
        ? "gradient3"
        : "gradient2"
      : "single");

  const contrast = useMemo(() => checkMenuContrast({ ...menu, bg_mode: bgMode }), [menu, bgMode]);
  const liveMenuSwatch = useMemo(
    () => buildMenuBackgroundCss({ ...menu, bg_mode: bgMode }),
    [menu, bgMode]
  );

  const applyTheme = (theme) => {
    const p = theme.patch;
    onChange({
      ...settings,
      topbar: { ...topbar, ...(p.topbar || {}) },
      main: { ...main, ...(p.main || {}) },
      menu: {
        ...menu,
        ...(p.menu || {}),
        gradient: {
          ...g,
          ...(p.menu?.gradient || {}),
        },
        accent_line: {
          ...menu.accent_line,
          ...(p.menu?.accent_line || {}),
        },
      },
    });
  };

  const updateTopbar = (patch) => onChange({ ...settings, topbar: { ...topbar, ...patch } });
  const updateMain = (patch) => onChange({ ...settings, main: { ...main, ...patch } });
  const updateMenu = (patch) => onChange({ ...settings, menu: { ...menu, ...patch } });
  const updateGradient = (patch) => updateMenu({ gradient: { ...g, ...patch } });
  const updateAccent = (patch) =>
    updateMenu({ accent_line: { ...menu.accent_line, ...patch } });

  const setBgMode = (mode) => {
    updateMenu({
      bg_mode: mode,
      bg_type: mode === "single" ? "single" : "gradient",
      gradient: {
        ...g,
        mid_enabled: mode === "gradient3",
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Ready Themes Row */}
      <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Ready Themes</h3>
          <p className="text-xs text-gray-500">One-click color presets. Every color remains fully editable afterwards.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {READY_THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => applyTheme(theme)}
              className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:border-red-400 hover:bg-red-50/30 text-left transition-all cursor-pointer"
            >
              <span
                className="w-7 h-7 rounded-lg border border-gray-200 shrink-0 shadow-2xs"
                style={{ background: theme.swatch }}
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-gray-900 truncate">{theme.name}</div>
                <div className="text-[10px] text-gray-500 truncate">{theme.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Top Bar Colors (Modern Only) */}
      {isModern && (
        <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Top Announcement Bar Colors</h3>
            <p className="text-xs text-gray-500">Gradient background and text color for the top strip.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ColorField
              label="Gradient Start"
              value={topbar?.bg_start}
              onChange={(v) => updateTopbar({ bg_start: v })}
            />
            <ColorField
              label="Gradient End"
              value={topbar?.bg_end}
              onChange={(v) => updateTopbar({ bg_end: v })}
            />
            <ColorField
              label="Text Color"
              value={topbar?.text_color}
              onChange={(v) => updateTopbar({ text_color: v })}
            />
          </div>
        </div>
      )}

      {/* Main Header & Buttons/Badges Colors */}
      <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Main Header, Buttons & Badges</h3>
          <p className="text-xs text-gray-500">Background, search button, action icons, and count badges.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ColorField
            label="Main Row Background"
            value={main?.bg}
            onChange={(v) => updateMain({ bg: v })}
          />
          <ColorField
            label="Search Button"
            value={main?.search_btn_color}
            onChange={(v) => updateMain({ search_btn_color: v })}
          />
          <ColorField
            label="Icons & Labels"
            value={main?.icon_color}
            onChange={(v) => updateMain({ icon_color: v })}
          />
          <ColorField
            label="Count Badges"
            value={main?.badge_color}
            onChange={(v) => updateMain({ badge_color: v })}
          />
        </div>
      </div>

      {/* Menu Bar Colors & 3-Mode Background Control */}
      <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Menu Bar Background & Text</h3>
            <p className="text-xs text-gray-500">Choose single color, 2-color gradient, or 3-color gradient.</p>
          </div>
          <div className="inline-flex rounded-xl bg-gray-100 p-1">
            {[
              { id: "single", label: "Single color" },
              { id: "gradient2", label: "2-color gradient" },
              { id: "gradient3", label: "3-color gradient" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setBgMode(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${bgMode === opt.id
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contrast Warning + One-click Fix */}
        {!contrast.passes && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs">
            <div className="flex items-start gap-2.5 min-w-0">
              <FiAlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Text may be hard to read on part of this background</span>{" "}
                <span>
                  ({contrast.minRatio}:1 on {contrast.failedStops.join(", ")}). {contrast.suggestion}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateMenu({ text_color: contrast.suggestedTextColor })}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
            >
              Fix text color
            </button>
          </div>
        )}

        {bgMode === "single" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ColorField
              label="Menu Background"
              value={menu?.bg_single}
              onChange={(v) => updateMenu({ bg_single: v })}
            />
          </div>
        ) : (
          <div className="space-y-4 p-3.5 rounded-xl bg-gray-50 border border-gray-200">
            <div className={`grid grid-cols-1 ${bgMode === "gradient3" ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4`}>
              <ColorField
                label="Start Color"
                value={g.start}
                onChange={(v) => updateGradient({ start: v })}
              />
              {bgMode === "gradient3" && (
                <ColorField
                  label="Middle Color"
                  value={g.mid}
                  onChange={(v) => updateGradient({ mid: v })}
                />
              )}
              <ColorField
                label="End Color"
                value={g.end}
                onChange={(v) => updateGradient({ end: v })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center pt-2 border-t border-gray-200">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Direction</label>
                <select
                  value={g.direction || "90deg"}
                  onChange={(e) => updateGradient({ direction: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500 outline-none"
                >
                  {DIRECTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {bgMode === "gradient3" && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-gray-700">
                    <span>Middle Spread</span>
                    <span className="font-mono text-red-600">{g.mid_spread ?? 35}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={45}
                    value={g.mid_spread ?? 35}
                    onChange={(e) => updateGradient({ mid_spread: Number(e.target.value) })}
                    className="w-full accent-red-600 cursor-pointer"
                  />
                </div>
              )}

              {bgMode === "gradient3" && (
                <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-gray-200 bg-white cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-gray-900">Smooth Fade</div>
                    <div className="text-[10px] text-gray-500">Eased rgba stops (no hard edge)</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={g.smooth !== false}
                    onChange={(e) => updateGradient({ smooth: e.target.checked })}
                    className="w-4 h-4 accent-red-600 cursor-pointer"
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* Small Live Swatch Bar */}
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-gray-500">Live Swatch Bar</div>
          <div
            className="w-full h-5 rounded-lg border border-gray-200 shadow-2xs"
            style={{ background: liveMenuSwatch }}
          />
        </div>

        {/* Menu Text, Hover, and Category Button Colors */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <ColorField
            label="Menu Text"
            value={menu?.text_color}
            onChange={(v) => updateMenu({ text_color: v })}
          />
          <ColorField
            label="Menu Hover Text"
            value={menu?.hover_color}
            onChange={(v) => updateMenu({ hover_color: v })}
          />
          {isModern && (
            <>
              <ColorField
                label='"All Categories" Bg'
                value={menu?.button_bg}
                onChange={(v) => updateMenu({ button_bg: v })}
              />
              <ColorField
                label='"All Categories" Text'
                value={menu?.button_text}
                onChange={(v) => updateMenu({ button_text: v })}
              />
            </>
          )}
        </div>

        {/* Accent Line */}
        <div className="pt-3 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(menu?.accent_line?.enabled)}
              onChange={(e) => updateAccent({ enabled: e.target.checked })}
              className="w-4 h-4 accent-red-600 cursor-pointer"
            />
            <div>
              <div className="text-xs font-bold text-gray-900">Accent Line</div>
              <div className="text-[11px] text-gray-500">Divider strip above menu bar</div>
            </div>
          </label>

          {menu?.accent_line?.enabled && (
            <>
              <ColorField
                label="Accent Color"
                value={menu?.accent_line?.color}
                onChange={(v) => updateAccent({ color: v })}
              />
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-gray-700">
                  <span>Accent Thickness</span>
                  <span className="font-mono text-red-600">{menu?.accent_line?.height || 3}px</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={menu?.accent_line?.height || 3}
                  onChange={(e) => updateAccent({ height: Number(e.target.value) })}
                  className="w-full accent-red-600 cursor-pointer"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
