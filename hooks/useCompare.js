// hooks/useCompare.js
//
// Thin wrapper around CompareContext for clean consumption in components.
// Mirrors the pattern of useWishlist() and useCart() in this project.

import { useCompare as useCompareContext } from '@/context/CompareContext';

/**
 * Hook for accessing the Compare feature state and actions.
 *
 * Returns:
 *   compareList       — Array<{ productId, category_slug, productData? }>
 *   loading           — boolean
 *   error             — string | null
 *   addToCompare(product)       — add a product (validates limit + category)
 *   removeFromCompare(productId) — remove one product (optimistic UI)
 *   clearCompare()              — remove all products
 *   isInCompare(productId)      — boolean check
 *   syncOnLogin()               — call once after login to merge localStorage → DB
 *   fetchFromDB()               — manually refresh from API
 */
export const useCompare = () => useCompareContext();
