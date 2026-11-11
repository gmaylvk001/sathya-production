import { useMemo } from 'react';
import { getCanonicalDistrict } from '@/lib/storeDistrictHelper';

/**
 * Shape of a Store object in the system
 */
export interface Store {
  _id?: string | number;
  id?: string | number;
  organisation_name?: string;
  title?: string;
  name?: string;
  store_name?: string;
  city?: string;
  district?: string;
  address?: string;
  location?: string;
  service_area?: string;
  zipcode?: string | number;
  branch_code?: string;
  location_id?: string;
  slug?: string;
  status?: string;
  [key: string]: any;
}

/**
 * Result returned by the useFilteredStores custom hook
 */
export interface UseFilteredStoresResult<T extends Store = Store> {
  filteredStores: T[];
  isFallback: boolean;
  hasMatches: boolean;
  userDistrict: string;
  fallbackMessage: string | null;
  statusMessage: string | null;
  [Symbol.iterator](): Generator<T[] | boolean | string | null, void, unknown>;
}

/**
 * useFilteredStores
 *
 * Isolated custom hook to filter stores based on user's current district (or city).
 * Uses schema-resilient `getCanonicalDistrict(store)` for accurate matching.
 *
 * If no stores match the district, it safely falls back to returning all stores
 * and sets `isFallback: true` with a descriptive `fallbackMessage` ("No stores found in [District]")
 * to prevent breaking the UI.
 *
 * @param stores - Array of all store items
 * @param userDistrict - Detected district (e.g., "Madurai", "Coimbatore")
 * @returns {UseFilteredStoresResult<T>} - Memoized result containing filtered stores and fallback state
 */
export function useFilteredStores<T extends Store = Store>(
  stores: T[] = [],
  userDistrict?: string | null
): UseFilteredStoresResult<T> {
  return useMemo(() => {
    const safeStores = Array.isArray(stores) ? stores : [];
    const rawDistrict = (userDistrict || '').toString().trim();

    // If no user district is specified, return all stores without fallback flag
    if (!rawDistrict) {
      const emptyResult: UseFilteredStoresResult<T> = {
        filteredStores: safeStores,
        isFallback: false,
        hasMatches: safeStores.length > 0,
        userDistrict: '',
        fallbackMessage: null,
        statusMessage: null,
        *[Symbol.iterator]() {
          yield safeStores;
          yield false;
          yield null;
        },
      };
      return emptyResult;
    }

    const normalizedDistrict = rawDistrict.toLowerCase();
    const capitalizedDistrict =
      rawDistrict.charAt(0).toUpperCase() + rawDistrict.slice(1);

    // Filter stores matching canonical district or city strictly
    const matches = safeStores.filter((store) => {
      if (!store || typeof store !== 'object') return false;

      // 1. Strict match using getCanonicalDistrict
      const storeDistrict = getCanonicalDistrict(store);
      if (
        storeDistrict &&
        storeDistrict !== 'Other' &&
        storeDistrict.toLowerCase() === normalizedDistrict
      ) {
        return true;
      }

      // 2. Direct match on store.city or store.district
      const directCity = (store.city || '').toString().trim().toLowerCase();
      const directDistrict = (store.district || '').toString().trim().toLowerCase();
      if (directDistrict === normalizedDistrict || directCity === normalizedDistrict) {
        return true;
      }

      return false;
    });

    const hasMatches = matches.length > 0;
    // Fallback applies when user specified a district but 0 stores matched
    const isFallback = !hasMatches && safeStores.length > 0;
    const fallbackMessage = isFallback
      ? `No stores found in ${capitalizedDistrict}`
      : null;

    const finalStores = hasMatches ? matches : safeStores;

    const result: UseFilteredStoresResult<T> = {
      filteredStores: finalStores,
      isFallback,
      hasMatches,
      userDistrict: capitalizedDistrict,
      fallbackMessage,
      statusMessage: fallbackMessage,
      *[Symbol.iterator]() {
        yield finalStores;
        yield isFallback;
        yield fallbackMessage;
      },
    };

    return result;
  }, [stores, userDistrict]);
}

export default useFilteredStores;
