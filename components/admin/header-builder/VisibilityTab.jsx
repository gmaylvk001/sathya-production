"use client";

import React from "react";

function SwitchRow({ label, helper, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 p-3 rounded-xl border border-gray-200 bg-white hover:border-gray-300 cursor-pointer transition-colors">
      <div>
        <div className="text-xs font-bold text-gray-900">{label}</div>
        {helper && <div className="text-[11px] text-gray-500 mt-0.5">{helper}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={Boolean(checked)}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
          checked ? "bg-red-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

export default function VisibilityTab({ settings, onChange }) {
  const isModern = settings.design === "modern";
  const show = settings.main?.show || {};

  const toggleShow = (key, val) => {
    onChange({
      ...settings,
      main: {
        ...settings.main,
        show: {
          ...show,
          [key]: val,
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-gray-900">Element Visibility</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Show or hide individual header items without breaking alignment or spacing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {isModern && (
          <SwitchRow
            label="Top Announcement Bar"
            helper="Flash sale banner, stores count, helpline & sign in"
            checked={settings.topbar?.enabled !== false}
            onChange={(val) =>
              onChange({
                ...settings,
                topbar: { ...settings.topbar, enabled: val },
              })
            }
          />
        )}

        <SwitchRow
          label={isModern ? "Deliver-to Box" : "Pincode / Region Selector"}
          helper="Shows customer pincode and city selector"
          checked={show.deliver_to !== false}
          onChange={(val) => toggleShow("deliver_to", val)}
        />

        <SwitchRow
          label="Deals Pill"
          helper="Promotional Deals quick link button"
          checked={show.deals !== false}
          onChange={(val) => toggleShow("deals", val)}
        />

        <SwitchRow
          label={isModern ? "Helpline (Top Bar)" : "Contact Icon"}
          helper={isModern ? "24/7 Helpline phone link in top bar" : "Contact Us icon in main row"}
          checked={show.contact !== false}
          onChange={(val) => toggleShow("contact", val)}
        />

        <SwitchRow
          label="Store Locator"
          helper="Store locations link/icon"
          checked={show.store !== false}
          onChange={(val) => toggleShow("store", val)}
        />

        <SwitchRow
          label="Wishlist Icon"
          helper="Wishlist link with item count badge"
          checked={show.wishlist !== false}
          onChange={(val) => toggleShow("wishlist", val)}
        />

        <SwitchRow
          label="Cart Icon"
          helper="Shopping cart link with item count badge"
          checked={show.cart !== false}
          onChange={(val) => toggleShow("cart", val)}
        />

        <SwitchRow
          label="User / Sign In"
          helper="Account dropdown or Login trigger"
          checked={show.user !== false}
          onChange={(val) => toggleShow("user", val)}
        />
      </div>
    </div>
  );
}
