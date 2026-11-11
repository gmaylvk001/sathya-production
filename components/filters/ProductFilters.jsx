"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "react-feather";
import { Range as ReactRange } from "react-range";
import {
  buildInitialExpandedFilters,
  getSortedFilterGroups,
  getVisibleFilterGroups,
  VISIBLE_FILTER_GROUP_LIMIT,
} from "@/lib/filterGroupDefaults";
import { uniqueById } from "@/lib/uniqueById";
import { humanLabel } from "@/lib/humanLabel";

/** Sathya Stores brand */
const BRAND = {
  red: "#ED1C24",
  redDark: "#C4161D",
  yellow: "#FFF200",
  yellowSoft: "#fff8c4",
  cream: "#fffdf5",
  ink: "#1a1a1a",
};

function sortFilterValues(a, b) {
  const extractNum = (str) => {
    const match = String(str || "").match(/[\d.]+/);
    if (!match) return null;
    let num = parseFloat(match[0]);
    if (/TB/i.test(str)) num *= 1024;
    else if (/MB/i.test(str)) num /= 1024;
    if (/^(below|up to|upto|less than|under)/i.test(str)) return num - 0.5;
    if (/^(above|more than|over)/i.test(str)) return num + 0.5;
    return num;
  };
  const numA = extractNum(a.filter_name);
  const numB = extractNum(b.filter_name);
  if (numA !== null && numB !== null) return numA - numB;
  if (numA !== null) return -1;
  if (numB !== null) return 1;
  return String(a.filter_name || "").localeCompare(String(b.filter_name || ""));
}

function idInList(list, id) {
  const s = String(id);
  return (list || []).some((x) => String(x) === s);
}

function findFilterMeta(filterGroups, filterId) {
  for (const group of Object.values(filterGroups || {})) {
    const hit = (group.filters || []).find(
      (f) => String(f._id) === String(filterId)
    );
    if (hit) return hit;
  }
  return null;
}

function findBrand(brands, brandId) {
  return (brands || []).find((b) => String(b._id) === String(brandId));
}

function alignToStep(val, min, max, step = 1) {
  const n = Number(val);
  if (!Number.isFinite(n)) return min;
  const snapped = Math.round((n - min) / step) * step + min;
  return Math.min(max, Math.max(min, snapped));
}

function clampRangeValues(values, min, max, step = 100) {
  const lo = Number.isFinite(Number(min)) ? Number(min) : 0;
  const hi =
    Number.isFinite(Number(max)) && Number(max) > lo ? Number(max) : lo + step;
  let a = alignToStep(values?.[0] ?? lo, lo, hi, step);
  let b = alignToStep(values?.[1] ?? hi, lo, hi, step);
  if (a > b) a = b;
  return [a, b];
}

function findCategoryName(categories, categoryId) {
  const walk = (nodes) => {
    for (const n of nodes || []) {
      if (String(n._id) === String(categoryId)) {
        return humanLabel(n.category_name, n.name);
      }
      const nested = walk(n.subCategories || n.subcategories);
      if (nested) return nested;
    }
    return null;
  };
  return walk(categories);
}

function SectionCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-red-100/80 bg-white shadow-[0_1px_0_rgba(215,40,40,0.06)] overflow-hidden mb-3 ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({ title, open, onToggle, count }) {
  const interactive = typeof onToggle === "function";
  const Wrapper = interactive ? "button" : "div";
  return (
    <Wrapper
      type={interactive ? "button" : undefined}
      onClick={interactive ? onToggle : undefined}
      className={`flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left transition-colors ${
        interactive ? "hover:bg-[#fff8c4]/40" : ""
      }`}
      style={{ borderLeft: `3px solid ${BRAND.red}` }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <h3
          className="text-[13px] font-bold uppercase tracking-wide truncate"
          style={{ color: BRAND.ink }}
        >
          {title}
        </h3>
        {count > 0 ? (
          <span
            className="shrink-0 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-[#1a1a1a]"
            style={{ backgroundColor: BRAND.yellow }}
          >
            {count}
          </span>
        ) : null}
      </div>
      {interactive ? (
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: open ? BRAND.yellow : "#f3f4f6" }}
        >
          {open ? (
            <ChevronUp size={14} color={BRAND.red} />
          ) : (
            <ChevronDown size={14} color={BRAND.red} />
          )}
        </span>
      ) : null}
    </Wrapper>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full pl-2.5 pr-1 py-1 text-xs font-semibold text-[#1a1a1a] border border-red-200/70"
      style={{ backgroundColor: BRAND.yellowSoft }}
    >
      <span className="max-w-[9rem] truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="flex h-5 w-5 items-center justify-center rounded-full text-white transition hover:opacity-90"
        style={{ backgroundColor: BRAND.red }}
      >
        ×
      </button>
    </span>
  );
}

function CheckRow({ checked, onChange, label }) {
  return (
    <label
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
        checked ? "bg-[#fff8c4]/70" : "hover:bg-red-50/60"
      }`}
    >
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
        />
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-[4px] border-2 transition ${
            checked ? "border-transparent" : "border-gray-300 bg-white"
          }`}
          style={
            checked
              ? { backgroundColor: BRAND.red, borderColor: BRAND.red }
              : undefined
          }
        >
          {checked ? (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path
                d="M1 4L3.5 6.5L9 1"
                stroke={BRAND.yellow}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </span>
      </span>
      <span
        className={`text-sm leading-snug ${
          checked ? "font-semibold text-[#1a1a1a]" : "text-gray-600"
        }`}
      >
        {label}
      </span>
    </label>
  );
}

function RadioRow({ checked, onChange, name, label }) {
  return (
    <label
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
        checked ? "bg-[#fff8c4]/70" : "hover:bg-red-50/60"
      }`}
    >
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          type="radio"
          name={name}
          checked={checked}
          onChange={onChange}
          className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
        />
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
            checked ? "" : "border-gray-300 bg-white"
          }`}
          style={
            checked
              ? { borderColor: BRAND.red, backgroundColor: "#fff" }
              : undefined
          }
        >
          {checked ? (
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: BRAND.red }}
            />
          ) : null}
        </span>
      </span>
      <span
        className={`text-sm ${
          checked ? "font-semibold text-[#ED1C24]" : "text-gray-600"
        }`}
      >
        {label}
      </span>
    </label>
  );
}

/**
 * Shared product filter sidebar + mobile drawer for category / sub / child / brand listings.
 */
export default function ProductFilters({
  selectedFilters,
  onFilterChange,
  onClearAll,
  onPriceChange,
  brands = [],
  filterGroups = {},
  priceRange = [0, 100000],
  values,
  setValues,
  categoryTree = [],
  showCategories = false,
  showBrands = true,
  selectedCategory = "",
  setSelectedCategory,
  selectedSubCategory = "",
  setSelectedSubCategory,
  isFilterPanelOpen = false,
  setIsFilterPanelOpen,
  variant = "desktop",
  className = "",
}) {
  const [isBrandsExpanded, setIsBrandsExpanded] = useState(true);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);
  const [isFiltersExpanded] = useState(true);
  const [expandedFilters, setExpandedFilters] = useState({});
  const [showAllFilterGroups, setShowAllFilterGroups] = useState(false);

  const MIN = Number.isFinite(Number(priceRange[0])) ? Number(priceRange[0]) : 0;
  const rawMax = Number.isFinite(Number(priceRange[1])) ? Number(priceRange[1]) : MIN + 100;
  const STEP = 100;
  const MAX = Math.max(
    MIN + STEP,
    Math.ceil((rawMax - MIN) / STEP) * STEP + MIN
  );
  const sliderValues = clampRangeValues(values, MIN, MAX, STEP);

  const sortedFilterGroups = getSortedFilterGroups(filterGroups);
  const visibleFilterGroups = getVisibleFilterGroups(
    sortedFilterGroups,
    showAllFilterGroups
  );
  const shouldShowMoreFilters =
    sortedFilterGroups.length > VISIBLE_FILTER_GROUP_LIMIT;

  useEffect(() => {
    if (Object.keys(filterGroups || {}).length > 0) {
      setExpandedFilters(buildInitialExpandedFilters(filterGroups));
    }
  }, [filterGroups]);

  const toggleFilterGroup = (groupId) => {
    setExpandedFilters((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const hasActive =
    (selectedFilters.brands || []).length > 0 ||
    (selectedFilters.categories || []).length > 0 ||
    (selectedFilters.subcategories || []).length > 0 ||
    (selectedFilters.filters || []).length > 0 ||
    selectedFilters.price?.min !== priceRange[0] ||
    selectedFilters.price?.max !== priceRange[1];

  const activeCount =
    (selectedFilters.brands || []).length +
    (selectedFilters.categories || []).length +
    (selectedFilters.subcategories || []).length +
    (selectedFilters.filters || []).length +
    (selectedFilters.price?.min !== priceRange[0] ||
    selectedFilters.price?.max !== priceRange[1]
      ? 1
      : 0);

  const resetPrice = () => {
    onPriceChange?.([priceRange[0], priceRange[1]]);
  };

  const findNode = (tree, name) => {
    for (const node of tree || []) {
      if (node.category_name === name) return node;
      if (node.subCategories?.length > 0) {
        const found = findNode(node.subCategories, name);
        if (found) return found;
      }
    }
    return null;
  };

  const renderTitleBar = () => (
    <div
      className="mb-3 overflow-hidden rounded-xl shadow-sm"
      style={{
        background: `linear-gradient(135deg, ${BRAND.red} 0%, ${BRAND.redDark} 55%, #9a1a1a 100%)`,
      }}
    >
      <div className="flex items-center justify-between px-3.5 py-3">
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: BRAND.yellow }}
          >
            Sathya Stores
          </p>
          <h2 className="text-base font-bold text-white leading-tight">
            Filters
            {activeCount > 0 ? (
              <span
                className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-[#1a1a1a] align-middle"
                style={{ backgroundColor: BRAND.yellow }}
              >
                {activeCount}
              </span>
            ) : null}
          </h2>
        </div>
        {hasActive ? (
          <button
            type="button"
            onClick={onClearAll}
            className="rounded-full px-3 py-1 text-xs font-bold text-[#1a1a1a] transition hover:brightness-95"
            style={{ backgroundColor: BRAND.yellow }}
          >
            Clear all
          </button>
        ) : null}
      </div>
      <div className="h-1 w-full" style={{ backgroundColor: BRAND.yellow }} />
    </div>
  );

  const renderActiveChips = () =>
    hasActive ? (
      <SectionCard>
        <div className="px-3.5 py-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Applied
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(selectedFilters.categories || []).map((categoryId) => {
              const name = findCategoryName(categoryTree, categoryId);
              if (!name) return null;
              return (
                <FilterChip
                  key={categoryId}
                  label={name}
                  onRemove={() => onFilterChange("categories", categoryId)}
                />
              );
            })}
            {(selectedFilters.brands || []).map((brandId) => {
              const brand = findBrand(brands, brandId);
              const label = humanLabel(brand?.brand_name, brand?.name);
              if (!label) return null;
              return (
                <FilterChip
                  key={brandId}
                  label={label}
                  onRemove={() => onFilterChange("brands", brandId)}
                />
              );
            })}
            {(selectedFilters.filters || []).map((filterId) => {
              const filter = findFilterMeta(filterGroups, filterId);
              const label = humanLabel(filter?.filter_name, filter?.name);
              if (!label) return null;
              return (
                <FilterChip
                  key={filterId}
                  label={label}
                  onRemove={() => onFilterChange("filters", filterId)}
                />
              );
            })}
            {(selectedFilters.price?.min !== priceRange[0] ||
              selectedFilters.price?.max !== priceRange[1]) && (
              <FilterChip
                label={`₹${selectedFilters.price.min} – ₹${selectedFilters.price.max}`}
                onRemove={resetPrice}
              />
            )}
          </div>
        </div>
      </SectionCard>
    ) : null;

  const renderPrice = () => (
    <SectionCard>
      <SectionHeader title="Price Range" />
      <div className="px-3.5 pb-4 pt-1">
        <ReactRange
          values={sliderValues}
          step={STEP}
          min={MIN}
          max={MAX}
          onChange={(newValues) => setValues?.(clampRangeValues(newValues, MIN, MAX, STEP))}
          onFinalChange={(newValues) =>
            onPriceChange?.(clampRangeValues(newValues, MIN, MAX, STEP))
          }
          renderTrack={({ props, children }) => (
            <div
              {...props}
              className="relative mt-2 h-2 w-full rounded-full"
              style={{ backgroundColor: "#fee2e2" }}
            >
              <div
                className="absolute h-2 rounded-full"
                style={{
                  left: `${((sliderValues[0] - MIN) / (MAX - MIN)) * 100}%`,
                  width: `${((sliderValues[1] - sliderValues[0]) / (MAX - MIN)) * 100}%`,
                  background: `linear-gradient(90deg, ${BRAND.red}, ${BRAND.yellow})`,
                }}
              />
              {children}
            </div>
          )}
          renderThumb={({ props, index }) => {
            const { key, ...rest } = props;
            return (
              <div
                key={key}
                {...rest}
                className="relative z-20 h-5 w-5 cursor-pointer rounded-full border-[3px] shadow-md"
                style={{
                  backgroundColor: index === 0 ? BRAND.red : BRAND.yellow,
                  borderColor: "#fff",
                  boxShadow: "0 2px 8px rgba(215,40,40,0.35)",
                }}
              />
            );
          }}
        />
        <div className="mt-5 flex items-center justify-between gap-2">
          <div
            className="flex-1 rounded-lg border border-red-100 px-2.5 py-1.5 text-center text-sm font-semibold"
            style={{ backgroundColor: BRAND.cream }}
          >
            ₹{Number(sliderValues[0]).toLocaleString('en-IN')}
          </div>
          <span className="text-xs font-bold text-gray-400">to</span>
          <div
            className="flex-1 rounded-lg border border-red-100 px-2.5 py-1.5 text-center text-sm font-semibold"
            style={{ backgroundColor: BRAND.cream }}
          >
            ₹{Number(sliderValues[1]).toLocaleString('en-IN')}
          </div>
        </div>
      </div>
    </SectionCard>
  );

  const renderCategories = () => {
    if (!showCategories || !categoryTree?.length) return null;
    const node = selectedCategory
      ? findNode(categoryTree, selectedCategory)
      : null;
    const children = node?.subCategories || [];

    return (
      <>
        <SectionCard>
          <SectionHeader
            title="Categories"
            open={isCategoriesExpanded}
            onToggle={() => setIsCategoriesExpanded((v) => !v)}
            count={selectedCategory ? 1 : 0}
          />
          {isCategoriesExpanded && (
            <ul className="max-h-52 space-y-0.5 overflow-y-auto px-2 pb-3">
              <li>
                <RadioRow
                  name="pf-category"
                  checked={selectedCategory === ""}
                  onChange={() => {
                    setSelectedCategory?.("");
                    setSelectedSubCategory?.("");
                  }}
                  label="All Categories"
                />
              </li>
              {uniqueById(categoryTree)
                .map((cat) => ({
                  ...cat,
                  label: humanLabel(cat.category_name, cat.name),
                }))
                .filter((cat) => cat.label)
                .map((cat) => (
                <li key={String(cat._id)}>
                  <RadioRow
                    name="pf-category"
                    checked={selectedCategory === cat.category_name || selectedCategory === cat.label}
                    onChange={() => {
                      setSelectedCategory?.(cat.category_name || cat.label);
                      setSelectedSubCategory?.("");
                    }}
                    label={cat.label}
                  />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {selectedCategory && children.length > 0 && (
          <SectionCard>
            <div
              className="px-3.5 py-2.5"
              style={{ backgroundColor: BRAND.yellowSoft }}
            >
              <h3
                className="text-[13px] font-bold uppercase tracking-wide"
                style={{ color: BRAND.red }}
              >
                {selectedCategory}
              </h3>
            </div>
            <ul className="max-h-48 space-y-0.5 overflow-y-auto px-2 py-2">
              <li>
                <RadioRow
                  name="pf-subcategory"
                  checked={selectedSubCategory === ""}
                  onChange={() => setSelectedSubCategory?.("")}
                  label={`All ${selectedCategory}`}
                />
              </li>
              {uniqueById(children)
                .map((child) => ({
                  ...child,
                  label: humanLabel(child.category_name, child.name),
                }))
                .filter((child) => child.label)
                .map((child) => (
                <li key={String(child._id)}>
                  <RadioRow
                    name="pf-subcategory"
                    checked={
                      selectedSubCategory === child.category_name ||
                      selectedSubCategory === child.label
                    }
                    onChange={() =>
                      setSelectedSubCategory?.(child.category_name || child.label)
                    }
                    label={child.label}
                  />
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
      </>
    );
  };

  const renderBrands = () => {
    if (!showBrands || !brands?.length) return null;
    const selectedCount = (selectedFilters.brands || []).length;
    return (
      <SectionCard>
        <SectionHeader
          title="Brands"
          open={isBrandsExpanded}
          onToggle={() => setIsBrandsExpanded((v) => !v)}
          count={selectedCount}
        />
        {isBrandsExpanded && (
          <ul className="max-h-52 space-y-0.5 overflow-y-auto px-2 pb-3">
            {uniqueById(brands)
              .map((brand) => ({
                ...brand,
                label: humanLabel(brand.brand_name, brand.name),
              }))
              .filter((brand) => brand.label)
              .sort((a, b) =>
                String(a.label).localeCompare(String(b.label))
              )
              .map((brand) => (
                <li key={String(brand._id)}>
                  <CheckRow
                    checked={idInList(selectedFilters.brands, brand._id)}
                    onChange={() => onFilterChange("brands", brand._id)}
                    label={brand.label}
                  />
                </li>
              ))}
          </ul>
        )}
      </SectionCard>
    );
  };

  const renderAttributeFilters = () => {
    if (!isFiltersExpanded || Object.values(filterGroups || {}).length === 0) {
      return null;
    }
    return (
      <SectionCard>
        <SectionHeader
          title="Product Filters"
          count={(selectedFilters.filters || []).length}
        />
        <div className="space-y-1 px-2 pb-3">
          {visibleFilterGroups.map((group, groupIdx) => (
            <div
              key={String(group._id || group.name || groupIdx)}
              className="rounded-lg border border-transparent hover:border-red-50"
            >
              <button
                type="button"
                onClick={() => toggleFilterGroup(group._id)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-left transition hover:bg-red-50/50"
              >
                <span
                  className={`font-semibold text-gray-800 ${
                    String(group.name || "").length > 25
                      ? "text-[12px]"
                      : "text-sm"
                  }`}
                >
                  {group.name}
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 transition-transform duration-200 ${
                    expandedFilters[group._id] ? "rotate-180" : ""
                  }`}
                  color={BRAND.red}
                />
              </button>
              {expandedFilters[group._id] && (
                <ul className="mb-2 max-h-48 space-y-0.5 overflow-y-auto px-1 pb-1">
                  {[...uniqueById(group.filters || [])]
                    .sort(sortFilterValues)
                    .map((filter) => {
                      const label = humanLabel(filter.filter_name, filter.name);
                      if (!label) return null;
                      return (
                      <li key={String(filter._id)}>
                        <CheckRow
                          checked={idInList(
                            selectedFilters.filters,
                            filter._id
                          )}
                          onChange={(e) =>
                            onFilterChange(
                              "filters",
                              filter._id,
                              e.target.checked
                            )
                          }
                          label={label}
                        />
                      </li>
                      );
                    })}
                </ul>
              )}
            </div>
          ))}
          {shouldShowMoreFilters && (
            <button
              type="button"
              className="mt-1 w-full rounded-lg py-2 text-sm font-bold transition hover:brightness-95"
              style={{
                backgroundColor: BRAND.yellowSoft,
                color: BRAND.red,
              }}
              onClick={() => setShowAllFilterGroups((v) => !v)}
            >
              {showAllFilterGroups ? "Show less" : "More filters"}
            </button>
          )}
        </div>
      </SectionCard>
    );
  };

  const body = (
    <>
      {renderTitleBar()}
      {renderActiveChips()}
      {renderPrice()}
      {renderCategories()}
      {renderBrands()}
      {renderAttributeFilters()}
    </>
  );

  const desktop =
    variant === "desktop" || variant === "both" ? (
      <aside
        className={`hidden md:block w-[250px] max-w-[250px] shrink-0 self-start ${className}`}
      >
        <div className="sticky top-24 space-y-0">{body}</div>
      </aside>
    ) : null;

  const mobile =
    (variant === "mobile" || variant === "both") && isFilterPanelOpen ? (
      <div className="fixed inset-0 z-50 bg-black/50 md:hidden">
        <div
          className="fixed left-0 top-0 flex h-full w-[85%] max-w-sm flex-col shadow-2xl"
          style={{ backgroundColor: BRAND.cream }}
        >
          <div
            className="flex flex-shrink-0 items-center justify-between px-4 py-3"
            style={{
              background: `linear-gradient(135deg, ${BRAND.red}, ${BRAND.redDark})`,
            }}
          >
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: BRAND.yellow }}
              >
                Sathya Stores
              </p>
              <h2 className="text-lg font-bold text-white">Filters</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen?.(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold text-[#1a1a1a]"
              style={{ backgroundColor: BRAND.yellow }}
              aria-label="Close filters"
            >
              ✕
            </button>
          </div>
          <div className="h-1 w-full" style={{ backgroundColor: BRAND.yellow }} />
          <div className="flex-1 space-y-1 overflow-y-auto p-3">
            {renderActiveChips()}
            {renderPrice()}
            {renderCategories()}
            {renderBrands()}
            {renderAttributeFilters()}
          </div>
          <div className="flex-shrink-0 border-t border-red-100 bg-white p-3">
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen?.(false)}
              className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-md transition hover:brightness-95"
              style={{
                backgroundColor: BRAND.red,
                boxShadow: "0 6px 16px rgba(215,40,40,0.35)",
              }}
            >
              Show results
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      {desktop}
      {mobile}
    </>
  );
}
