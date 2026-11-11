import { useMemo } from 'react';
import { getCanonicalDistrict } from '../lib/storeDistrictHelper.js';
import { getStoreDistrict } from '../lib/storePickupHelper.js';

/**
 * Shape of a Store pickup item
 */
export interface StorePickupItem {
  _id?: string | number;
  id?: string | number;
  branch_code?: string;
  name?: string;
  title?: string;
  organisation_name?: string;
  store_name?: string;
  district?: string;
  city?: string;
  address?: string;
  location?: string;
  zipcode?: string | number;
  pincode?: string | number;
  phone?: string;
  [key: string]: any;
}

/**
 * Unique district option with store count
 */
export interface DistrictOption {
  name: string;
  count: number;
}

/**
 * Filter options for Store Pickup selector
 */
export interface UseStorePickupFilterParams {
  selectedDistrict?: string;
  searchQuery?: string;
}

/**
 * Return shape for useStorePickupFilter custom hook
 */
export interface UseStorePickupFilterResult<T extends StorePickupItem = StorePickupItem> {
  filteredStores: T[];
  districts: DistrictOption[];
  totalStoresCount: number;
  selectedDistrict: string;
  searchQuery: string;
  hasMatches: boolean;
  [Symbol.iterator](): Generator<T[] | DistrictOption[] | number, void, unknown>;
}

/**
 * useStorePickupFilter
 *
 * Isolated custom hook for Checkout Store Pickup selector:
 * 1. Strict District Isolation:
 *    User selecting a district (e.g. "Dindigul") strictly matches against
 *    `getCanonicalDistrict(store).toLowerCase() === selectedDistrict.toLowerCase()`.
 *    Null/undefined districts, or stores belonging to other districts (like Chennai or Cuddalore),
 *    are 100% blocked from entering the filtered list.
 * 2. Search Store Input Isolation:
 *    searchQuery checks ONLY store.name, store.address, and store.city.
 * 3. Dynamic District Dropdown Options:
 *    Extracts unique districts derived from getCanonicalDistrict with live store counts.
 * 4. Clean memoization via useMemo.
 */
export function useStorePickupFilter<T extends StorePickupItem = StorePickupItem>(
  stores: T[] = [],
  options: UseStorePickupFilterParams = {}
): UseStorePickupFilterResult<T> {
  const { selectedDistrict = 'all', searchQuery = '' } = options;

  // 1. Dynamic District options derived from available stores with counts
  const districts = useMemo<DistrictOption[]>(() => {
    const safeStores = Array.isArray(stores) ? stores : [];
    const counts: Record<string, number> = {};

    safeStores.forEach((store) => {
      if (!store || typeof store !== 'object') return;
      const dist = getCanonicalDistrict(store);
      if (dist && dist !== 'Other') {
        counts[dist] = (counts[dist] || 0) + 1;
      }
    });

    return Object.keys(counts)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        name,
        count: counts[name],
      }));
  }, [stores]);

  // 2. Strict Filtered Stores evaluation
  const filteredStores = useMemo<T[]>(() => {
    const safeStores = Array.isArray(stores) ? stores : [];
    const targetDist = (selectedDistrict || 'all').toString().trim().toLowerCase();
    const q = (searchQuery || '').toString().trim().toLowerCase();

    const filtered = safeStores.filter((store) => {
      if (!store || typeof store !== 'object') return false;

      // Requirement 1: 100% Strict District Filtering
      if (targetDist !== 'all') {
        const storeDistrict = getCanonicalDistrict(store);
        // STRICT / EXACT match against canonical district
        if (!storeDistrict || storeDistrict === 'Other' || storeDistrict.trim().toLowerCase() !== targetDist) {
          return false;
        }
      }

      // Requirement 2: Search Store Input Isolation
      // Check ONLY store.name, store.address, store.city with user's search query
      if (q) {
        const storeName = String(
          store.title || store.organisation_name || store.name || store.store_name || ''
        ).toLowerCase();
        const storeAddress = String(store.address || store.location || '').toLowerCase();
        const storeCity = String(store.city || '').toLowerCase();

        const matchesSearch =
          storeName.includes(q) || storeAddress.includes(q) || storeCity.includes(q);

        if (!matchesSearch) {
          return false;
        }
      }

      return true;
    });

    // Deterministic sort: by District (alphabetical), then by Store Name (alphabetical)
    return [...filtered].sort((a, b) => {
      const distA = getCanonicalDistrict(a).toLowerCase();
      const distB = getCanonicalDistrict(b).toLowerCase();
      if (distA !== distB) {
        return distA.localeCompare(distB);
      }
      const nameA = String(a.title || a.organisation_name || a.name || '').toLowerCase();
      const nameB = String(b.title || b.organisation_name || b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [stores, selectedDistrict, searchQuery]);

  const result: UseStorePickupFilterResult<T> = {
    filteredStores,
    districts,
    totalStoresCount: Array.isArray(stores) ? stores.length : 0,
    selectedDistrict,
    searchQuery,
    hasMatches: filteredStores.length > 0,
    *[Symbol.iterator]() {
      yield filteredStores;
      yield districts;
      yield Array.isArray(stores) ? stores.length : 0;
    },
  };

  return result;
}

export default useStorePickupFilter;
