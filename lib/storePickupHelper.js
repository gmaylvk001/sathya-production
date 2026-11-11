/**
 * Helper utilities for Checkout Store Pickup Dropdown Search & District Filter
 * Delegates canonical district resolution and strict district isolation to lib/storeDistrictHelper.js.
 */

import {
  getCanonicalDistrict,
  KNOWN_TOWNS_TO_DISTRICT,
  filterStoresStrict,
  getDistrictsWithStoreCounts,
  isStoreInDistrict,
} from './storeDistrictHelper.js';

export {
  getCanonicalDistrict,
  KNOWN_TOWNS_TO_DISTRICT,
  filterStoresStrict,
  getDistrictsWithStoreCounts,
  isStoreInDistrict,
};

/**
 * Extracts and normalizes the canonical district name for a store.
 * Delegates to getCanonicalDistrict.
 */
export function getStoreDistrict(store) {
  return getCanonicalDistrict(store);
}

/**
 * Deterministically sorts stores first by District name (alphabetical), then by Store Title/Name (alphabetical).
 */
export function sortStoresByDistrictAndName(stores) {
  if (!Array.isArray(stores)) return [];
  return [...stores].sort((a, b) => {
    const distA = getStoreDistrict(a).toLowerCase();
    const distB = getStoreDistrict(b).toLowerCase();
    if (distA !== distB) {
      return distA.localeCompare(distB);
    }
    const nameA = String(a.title || a.organisation_name || a.name || '').toLowerCase();
    const nameB = String(b.title || b.organisation_name || b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

/**
 * Filters stores using strict district matching and isolated search query evaluation.
 */
export function filterStores(stores, { district = 'all', searchQuery = '' } = {}) {
  return filterStoresStrict(stores, {
    selectedDistrict: district,
    searchQuery,
  });
}

/**
 * Aggregates unique districts with their store counts, sorted alphabetically.
 */
export function getDistrictsWithCounts(stores) {
  return getDistrictsWithStoreCounts(stores);
}

/**
 * Sanitizes phone numbers, stripping invalid values like 'NULL', 'null', 'undefined', 'N/A'.
 * Returns sanitized string or null.
 */
export function formatStorePhone(phone) {
  if (!phone) return null;
  const str = String(phone).trim();
  if (
    !str ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'undefined' ||
    str.toLowerCase() === 'n/a' ||
    str.toLowerCase() === 'none'
  ) {
    return null;
  }
  return /\d/.test(str) ? str : null;
}

/**
 * Sanitizes a store branch code, returning null if it's missing, empty, or an invalid legacy placeholder ('NULL', 'null', 'undefined', 'N/A').
 */
export function getValidStoreBranchCode(store) {
  if (!store) return null;
  const raw = store.branch_code ?? store.branchCode;
  if (!raw) return null;
  const str = String(raw).trim();
  if (
    !str ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'undefined' ||
    str.toLowerCase() === 'n/a' ||
    str.toLowerCase() === 'none'
  ) {
    return null;
  }
  return str;
}

/**
 * Returns a canonical, non-null value representing a store for form selection.
 * Prefers valid branch code if available; otherwise falls back to unique MongoDB _id or exist_id.
 */
export function getStoreSelectValue(store) {
  if (!store) return '';
  const branch = getValidStoreBranchCode(store);
  if (branch) return branch;
  if (store._id) return String(store._id);
  if (store.exist_id) return String(store.exist_id);
  if (store.id) return String(store.id);
  return '';
}

/**
 * Checks if a store matches the currently selected store identifier (supports valid branch_code, _id, exist_id).
 */
export function isStoreSelected(store, selectedValue) {
  if (!store || !selectedValue) return false;
  const target = String(selectedValue).trim();
  if (!target || target.toLowerCase() === 'null') return false;

  const branch = getValidStoreBranchCode(store);
  if (branch && branch === target) return true;
  if (store._id && String(store._id) === target) return true;
  if (store.exist_id && String(store.exist_id) === target) return true;
  if (store.id && String(store.id) === target) return true;
  return false;
}

/**
 * Generates a guaranteed 100% unique, stable React key for a store in a mapped list.
 */
export function getStoreReactKey(store, index = 0) {
  if (!store) return `store-${index}`;
  if (store._id) return String(store._id);
  const val = getStoreSelectValue(store);
  if (val && val.toLowerCase() !== 'null') {
    return `${val}-${index}`;
  }
  return `store-${index}`;
}
