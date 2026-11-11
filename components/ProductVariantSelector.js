"use client";

import {
  findProductForSelection,
  isVariantValueAvailable,
  uniqueVariantValues,
  variantValue,
} from "@/lib/variantUtils";

function resolveImage(path) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("/")) return path;
  return `/uploads/products/${path}`;
}

function normalizeProductValues(values = {}, attributeNames = []) {
  return Object.fromEntries(
    attributeNames.map((name) => [name, variantValue(values[name])])
  );
}

function normalizeSelected(values = {}, attributeNames = []) {
  const next = {};
  for (const name of attributeNames) {
    const value = variantValue(values[name]);
    if (value) next[name] = value;
  }
  return next;
}

export default function ProductVariantSelector({ variantGroup, currentProductId, onSelect }) {
  if (!variantGroup?.products?.length || variantGroup.products.length < 2) return null;
  if (!variantGroup.attributes?.length) return null;

  const attributeNames = (variantGroup.attributes || []).map((attr) => attr?.name).filter(Boolean);
  if (!attributeNames.length) return null;

  const products = (variantGroup.products || [])
    .filter((p) => p && String(p.status || "").trim().toLowerCase() !== "inactive")
    .map((product) => ({
      ...product,
      values: normalizeProductValues(product?.values, attributeNames),
    }));

  if (!products.length) return null;

  const current =
    products.find((p) => p && String(p._id) === String(currentProductId)) || products[0];
  const selected = normalizeSelected(current?.values, attributeNames);

  return (
    <div className="mt-1 mb-2 space-y-2">
      {variantGroup.attributes.map((attr) => {
        if (!attr?.name) return null;
        const values = uniqueVariantValues(products, attr.name);
        if (!values.length) return null;
        const metaByValue = Object.fromEntries(
          (attr.valuesMeta || [])
            .filter((meta) => meta && meta.value != null)
            .map((meta) => [variantValue(meta.value), meta])
        );
        return (
          <div key={attr.name}>
            <p className="text-sm font-semibold text-gray-800 mb-2">{attr.name}</p>
            <div className="flex flex-wrap gap-2">
              {values.map((value) => {
                const available = isVariantValueAvailable(
                  products,
                  attr.name,
                  value,
                  selected,
                  attributeNames
                );
                const isActive = variantValue(selected[attr.name]) === value;
                const meta = metaByValue[value] || {};
                const isOptionDisabled = !available;

                let buttonClass = "flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition ";
                if (isActive) {
                  if (available) {
                    buttonClass += "border-[#d72828] bg-red-50 text-[#d72828] font-semibold";
                  } else {
                    buttonClass += "border-[#d72828] bg-gray-100 text-gray-400 font-semibold cursor-not-allowed line-through";
                  }
                } else if (available) {
                  buttonClass += "border-gray-300 bg-white text-gray-800 hover:border-red-400 hover:text-[#d72828] cursor-pointer";
                } else {
                  buttonClass += "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed line-through";
                }

                let titleText = value;
                if (!available) {
                  titleText = isActive
                    ? `${value} (Out of Stock)`
                    : "Out of stock or not available with the selected options";
                }

                return (
                  <button
                    key={value}
                    type="button"
                    disabled={isOptionDisabled}
                    onClick={() => {
                      if (!available) return;
                      const nextSelected = { ...selected, [attr.name]: value };
                      const match = findProductForSelection(
                        products,
                        nextSelected,
                        attributeNames,
                        attr.name
                      );
                      if (match && typeof onSelect === "function") onSelect(match);
                    }}
                    className={buttonClass}
                    title={titleText}
                  >
                    {attr.type === "color" && meta.colorHex && (
                      <span
                        className={`w-4 h-4 rounded-full border border-gray-300 ${isOptionDisabled ? "opacity-50" : ""}`}
                        style={{ backgroundColor: meta.colorHex }}
                      />
                    )}
                    {meta.image && (
                      <img
                        src={resolveImage(meta.image)}
                        alt=""
                        className={`w-5 h-5 object-contain ${isOptionDisabled ? "opacity-50" : ""}`}
                      />
                    )}
                    <span>{value}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
