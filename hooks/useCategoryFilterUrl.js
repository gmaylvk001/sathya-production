"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  buildFilterLookupMaps,
  selectedFiltersToQueryString,
  searchParamsToSelectedFilters,
  selectedFiltersEqual,
  hasActiveFilterParams,
  selectionKey,
} from "@/lib/filterUrl";

function readSearchKey() {
  if (typeof window === "undefined") return "";
  return window.location.search.replace(/^\?/, "");
}

function mergeById(primary = [], secondary = []) {
  const map = new Map();
  for (const item of [...(primary || []), ...(secondary || [])]) {
    const rawId = item?._id ?? item?.brandId ?? item?.id;
    const id = rawId != null ? String(rawId) : "";
    if (!id) continue;
    map.set(id, item);
  }
  return [...map.values()];
}

function mergeFilterGroups(primary = {}, secondary = {}) {
  const merged = { ...(primary || {}) };
  for (const [key, group] of Object.entries(secondary || {})) {
    if (!group) continue;
    if (!merged[key]) {
      merged[key] = group;
      continue;
    }
    const byId = new Map();
    for (const f of [
      ...(merged[key].filters || []),
      ...(group.filters || []),
    ]) {
      const rawId = f?._id ?? f?.filter_id ?? f?.id;
      const id = rawId != null ? String(rawId) : "";
      if (!id) continue;
      byId.set(id, f);
    }
    merged[key] = {
      ...merged[key],
      ...group,
      filters: [...byId.values()],
    };
  }
  return merged;
}

function replaceUrlQuietly(url) {
  if (typeof window === "undefined") return;
  try {
    window.history.replaceState(
      window.history.state,
      "",
      url
    );
  } catch (e) {
    console.error("replaceUrlQuietly error:", e);
  }
}

/**
 * Sync listing selectedFilters ↔ SEO-friendly URL query params.
 * Uses window.history.replaceState so filter changes update the address bar
 * without remounting or re-rendering entire page trees.
 */
export function useCategoryFilterUrl({
  selectedFilters,
  setSelectedFilters,
  filterCatalog = null,
  brands = [],
  filterGroups = {},
  categoryTree = [],
  subcategoryTree = [],
  priceRange = [0, 100000],
  enabled = true,
  ready = false,
  omitUrlKeys = [],
  keepParams = [],
  onApplyUrlFilters,
}) {
  const pathname = usePathname();
  const skipWriteRef = useRef(false);
  const hydratedRef = useRef(false);
  const lastWrittenUrlRef = useRef("");
  const lastWrittenKeyRef = useRef("");

  const selectedRef = useRef(selectedFilters);
  selectedRef.current = selectedFilters;

  const onApplyUrlFiltersRef = useRef(onApplyUrlFilters);
  onApplyUrlFiltersRef.current = onApplyUrlFilters;

  const omitSet = useMemo(() => new Set(omitUrlKeys), [omitUrlKeys]);
  const keepSet = useMemo(() => new Set(keepParams), [keepParams]);

  const catalogBrands = filterCatalog?.brands ?? brands;
  const catalogGroups = filterCatalog?.filterGroups ?? filterGroups;
  const catalogCategories = filterCatalog?.categoryTree ?? categoryTree;
  const catalogSubcategories =
    filterCatalog?.subcategoryTree ?? subcategoryTree;

  const mergedBrands = useMemo(
    () => mergeById(catalogBrands, brands),
    [catalogBrands, brands]
  );
  const mergedGroups = useMemo(
    () => mergeFilterGroups(catalogGroups, filterGroups),
    [catalogGroups, filterGroups]
  );

  const maps = useMemo(
    () =>
      buildFilterLookupMaps({
        brands: mergedBrands,
        filterGroups: mergedGroups,
        categoryTree: catalogCategories,
        subcategoryTree: catalogSubcategories,
      }),
    [mergedBrands, mergedGroups, catalogCategories, catalogSubcategories]
  );

  const mapsRef = useRef(maps);
  mapsRef.current = maps;

  const priceMin = priceRange?.[0] ?? 0;
  const priceMax = priceRange?.[1] ?? 100000;
  const priceMinRef = useRef(priceMin);
  priceMinRef.current = priceMin;
  const priceMaxRef = useRef(priceMax);
  priceMaxRef.current = priceMax;

  const applyParsed = useCallback(
    (parsed, useParsedPrice) => {
      const next = {
        ...selectedRef.current,
        ...(omitSet.has("brand") ? {} : { brands: parsed.brands }),
        filters: parsed.filters,
        ...(Object.prototype.hasOwnProperty.call(selectedRef.current, "categories")
          ? { categories: parsed.categories }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(
          selectedRef.current,
          "subcategories"
        )
          ? { subcategories: parsed.subcategories }
          : {}),
        price: useParsedPrice
          ? parsed.price
          : { min: priceMinRef.current, max: priceMaxRef.current },
      };

      if (selectedFiltersEqual(next, selectedRef.current)) return false;

      skipWriteRef.current = true;
      setSelectedFilters(next);
      if (typeof onApplyUrlFiltersRef.current === "function") {
        onApplyUrlFiltersRef.current(next);
      }
      return true;
    },
    [setSelectedFilters, omitSet]
  );

  /** 1. Initial hydration: runs once when component is enabled and ready */
  useEffect(() => {
    if (!enabled || !ready) return;
    if (hydratedRef.current) return;

    hydratedRef.current = true;
    const currentSearch = readSearchKey();
    const params = new URLSearchParams(currentSearch);

    if (hasActiveFilterParams(params)) {
      const parsed = searchParamsToSelectedFilters(params, maps, [
        priceMin,
        priceMax,
      ]);
      applyParsed(parsed, true);
    }

    lastWrittenUrlRef.current = currentSearch ? `${pathname}?${currentSearch}` : pathname;
    lastWrittenKeyRef.current = selectionKey(
      selectedRef.current,
      omitSet.has("brand")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ready]);

  /** 2. Browser Back/Forward navigation listener */
  useEffect(() => {
    const handlePopState = () => {
      if (!enabled || !ready || !hydratedRef.current) return;
      const currentSearch = readSearchKey();
      const params = new URLSearchParams(currentSearch);
      const parsed = searchParamsToSelectedFilters(
        params,
        mapsRef.current,
        [priceMinRef.current, priceMaxRef.current]
      );
      applyParsed(parsed, hasActiveFilterParams(params));
      lastWrittenUrlRef.current = currentSearch ? `${pathname}?${currentSearch}` : pathname;
      lastWrittenKeyRef.current = selectionKey(
        parsed,
        omitSet.has("brand")
      );
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [enabled, ready, pathname, omitSet, applyParsed]);

  /** 3. Write state → URL whenever selectedFilters changes */
  useEffect(() => {
    if (!enabled || !ready || !hydratedRef.current) return;

    if (skipWriteRef.current) {
      skipWriteRef.current = false;
      lastWrittenKeyRef.current = selectionKey(
        selectedFilters,
        omitSet.has("brand")
      );
      return;
    }

    const filtersForUrl = omitSet.has("brand")
      ? { ...selectedFilters, brands: [] }
      : selectedFilters;

    const currentKey = selectionKey(selectedFilters, omitSet.has("brand"));
    const qs = selectedFiltersToQueryString(filtersForUrl, maps, [
      priceMin,
      priceMax,
    ]);

    const nextParams = new URLSearchParams(qs);
    const currentSearch = readSearchKey();
    const currentParams = new URLSearchParams(currentSearch);

    for (const keepKey of keepSet) {
      const v = currentParams.get(keepKey);
      if (v != null && v !== "" && !nextParams.has(keepKey)) {
        nextParams.set(keepKey, v);
      }
    }

    const nextQs = nextParams.toString();
    const nextUrl = nextQs ? `${pathname}?${nextQs}` : pathname;
    const currentUrl = currentSearch ? `${pathname}?${currentSearch}` : pathname;

    if (nextUrl === currentUrl) {
      lastWrittenKeyRef.current = currentKey;
      lastWrittenUrlRef.current = nextUrl;
      return;
    }

    if (
      currentKey === lastWrittenKeyRef.current &&
      nextUrl === lastWrittenUrlRef.current
    ) {
      return;
    }

    lastWrittenKeyRef.current = currentKey;
    lastWrittenUrlRef.current = nextUrl;
    replaceUrlQuietly(nextUrl);
  }, [
    enabled,
    ready,
    selectedFilters,
    maps,
    priceMin,
    priceMax,
    pathname,
    omitSet,
    keepSet,
  ]);

  const parseCurrentUrl = useCallback(
    (overridePriceRange = [priceMin, priceMax]) => {
      return searchParamsToSelectedFilters(
        new URLSearchParams(readSearchKey()),
        maps,
        overridePriceRange
      );
    },
    [maps, priceMin, priceMax]
  );

  return {
    maps,
    parseCurrentUrl,
    searchKey: readSearchKey(),
  };
}
