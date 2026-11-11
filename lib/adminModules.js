/**
 * Single source of truth for admin sidebar modules + permission keys.
 * Used by: Permissions UI, Roles UI, seedUniletPermissions.js
 * Keep in sync with app/admin/components/AdminSider.js menuItems.
 */
export const adminMenuItems = [
  {
    icon: "material-symbols:dashboard",
    label: "Dashboard",
    link: "dashboard",
    permission: "dashboard",
    alwaysVisible: true,
  },
  {
    icon: "mdi:view-dashboard-outline",
    label: "Unilet Dashboard",
    link: "unilet-dashboard",
    permission: "unilet-dashboard",
  },
  {
    icon: "material-symbols:category",
    label: "Category",
    link: "category",
    permission: "category",
  },
  {
    icon: "mdi:package-variant-closed",
    label: "Product",
    submenu: [
      { icon: "mdi:format-list-bulleted", label: "Product List", link: "product", permission: "product", dotColor: "bg-green-500" },
      { icon: "mdi:shape-outline", label: "Variants", link: "variants", permission: "variants", dotColor: "bg-blue-500" },
      { icon: "mdi:trademark", label: "Brand", link: "brand", permission: "brand", dotColor: "bg-red-500" },
      { icon: "mdi:upload", label: "Bulk Upload", link: "product/bulk_upload", permission: "product/bulk_upload", dotColor: "bg-yellow-500" },
      { icon: "mdi:file-upload-outline", label: "Filter Bulk Upload", link: "product/filter_bulk_upload", permission: "product/filter_bulk_upload", dotColor: "bg-yellow-500" },
      { icon: "mdi:filter-variant", label: "Filter Group", link: "filter_group", permission: "filter_group", dotColor: "bg-yellow-500" },
      { icon: "mdi:filter-outline", label: "Filter", link: "filter", permission: "filter", dotColor: "bg-yellow-500" },
      { icon: "mdi:plus-box-outline", label: "New Product", link: "newproduct", permission: "newproduct", dotColor: "bg-green-500" },
      { icon: "material-symbols:reviews-rounded", label: "Product Review", link: "reviews", permission: "reviews", dotColor: "bg-orange-500" },
      {
        icon: "mdi:file-document-outline",
        label: "All Products (Catalog & PDF)",
        link: "/all-products",
        permission: "all-products",
        dotColor: "bg-purple-500",
      },
    ],
  },
  {
    icon: "mdi:storefront-outline",
    label: "Unilet Products",
    link: "unilet-products",
    permission: "unilet-products",
  },
  {
    icon: "mdi:plus-box-multiple-outline",
    label: "New Unilet Product",
    link: "unilet-new-products",
    permission: "unilet-new-products",
  },
  {
    icon: "mdi:cart-outline",
    label: "Sales",
    submenu: [
      { icon: "mdi:view-dashboard-outline", label: "Dashboard", link: "sales/dashboard", permission: "sales/dashboard", dotColor: "bg-green-500" },
      { icon: "mdi:clipboard-list-outline", label: "All Orders", link: "Allorder", permission: "Allorder", dotColor: "bg-yellow-500" },
      { icon: "mdi:home-import-outline", label: "Home Delivery", link: "homedelivery", permission: "homedelivery", dotColor: "bg-yellow-500" },
      { icon: "mdi:cart-off", label: "Abandoned Order", link: "abandonedorder", permission: "abandonedorder", dotColor: "bg-yellow-500" },
      { icon: "mdi:cancel", label: "Cancel Order", link: "order/cancel-order", permission: "order/cancel-order", dotColor: "bg-[#d72828]" },
      { icon: "mdi:clipboard-check-outline", label: "Place Orders", link: "order/place-order", permission: "order/place-order", dotColor: "bg-blue-500" },
      { icon: "mdi:history", label: "Order History", link: "sathya-exist-order-history", permission: "sathya-exist-order-history", dotColor: "bg-yellow-500" },
    ],
  },
  {
    icon: "mdi:archive-outline",
    label: "Exist Sales",
    submenu: [
      { icon: "mdi:clipboard-list-outline", label: "Orders", link: "sathya-exist-orders", permission: "sathya-exist-orders", dotColor: "bg-yellow-500" },
      { icon: "mdi:clipboard-list-outline", label: "Order Details", link: "sathya-exist-orders-details", permission: "sathya-exist-orders-details", dotColor: "bg-yellow-500" },
      { icon: "mdi:credit-card-outline", label: "Payments", link: "sathya-exist-payments", permission: "sathya-exist-payments", dotColor: "bg-yellow-500" },
      { icon: "mdi:cancel", label: "Cancel Orders", link: "sathya-exist-cancel-orders", permission: "sathya-exist-cancel-orders", dotColor: "bg-yellow-500" },
    ],
  },
  {
    icon: "mdi:chart-pie",
    label: "Reports",
    submenu: [
      { icon: "mdi:chart-bar", label: "Sales Report", link: "reports/sales", permission: "reports/sales", dotColor: "bg-blue-500" },
      { icon: "mdi:card-account-phone-outline", label: "Contacts", link: "contact", permission: "contact", dotColor: "bg-green-500" },
    ],
  },
  {
    icon: "mdi:database",
    label: "CRM",
    submenu: [
      { icon: "mdi:chevron-double-right", label: "Leads", link: "leads", permission: "leads", dotColor: "bg-blue-500" },
    ],
  },
  {
    icon: "mdi:bank-outline",
    label: "Finance",
    submenu: [
      { icon: "mdi:chevron-double-right", label: "Finance Bank", link: "finance/bank", permission: "finance/bank", dotColor: "bg-blue-500" },
      { icon: "mdi:chevron-double-right", label: "EMI Product", link: "finance/emi-product", permission: "finance/emi-product", dotColor: "bg-green-500" },
      { icon: "mdi:chevron-double-right", label: "EMI Scheme", link: "finance/emi-scheme", permission: "finance/emi-scheme", dotColor: "bg-yellow-500" },
    ],
  },
  {
    icon: "mdi:post-outline",
    label: "Blogs",
    submenu: [
      { icon: "mdi:format-list-bulleted", label: "Blog List", link: "blogs", permission: "blogs", dotColor: "bg-green-500" },
      { icon: "mdi:frequently-asked-questions", label: "Blog FAQ", link: "blogs-faq", permission: "blogs-faq", dotColor: "bg-purple-500" },
    ],
  },
  {
    icon: "mdi:store-marker-outline",
    label: "Stores",
    submenu: [
      { icon: "mdi:map-marker-radius-outline", label: "Store Zones", link: "store-zones", permission: "store-zones", dotColor: "bg-blue-500" },
      { icon: "mdi:storefront-outline", label: "Store Listings", link: "store-listings", permission: "store-listings", dotColor: "bg-green-500" },
      { icon: "mdi:account-tie-outline", label: "Store Owners", link: "store-owners", permission: "store-owners", dotColor: "bg-yellow-500" },
    ],
  },
  {
    icon: "mdi:cog-outline",
    label: "Settings",
    submenu: [
      { icon: "mdi:home-outline", label: "Home Settings", link: "homesettings", permission: "homesettings", dotColor: "bg-green-500" },
      { icon: "mdi:view-dashboard-edit-outline", label: "Category Settings", link: "category-pages", permission: "category-pages", dotColor: "bg-green-500" },
      { icon: "mdi:tag-multiple-outline", label: "Brand Settings", link: "brand-pages", permission: "brand-pages", dotColor: "bg-green-500" },
      { icon: "mdi:store-outline", label: "Store Settings", link: "store", permission: "store", dotColor: "bg-yellow-500" },
      // Page still exists under /admin/mapbox (not always shown in sider)
      { icon: "mdi:map", label: "Mapbox Settings", link: "mapbox", permission: "mapbox", dotColor: "bg-yellow-500" },
    ],
  },
  {
    icon: "mdi:account-cog-outline",
    label: "Users Settings",
    submenu: [
      { icon: "mdi:account-outline", label: "Users", link: "user", permission: "user", dotColor: "bg-yellow-500" },
      { icon: "mdi:account-tie-outline", label: "System_Users", link: "system_users", permission: "system_users", dotColor: "bg-yellow-500" },
      { icon: "mdi:shield-key-outline", label: "Permissions", link: "permissions", permission: "permissions", dotColor: "bg-purple-500" },
      { icon: "mdi:account-group-outline", label: "Roles", link: "roles", permission: "roles", dotColor: "bg-blue-500" },
      { icon: "mdi:account-group-outline", label: "Sathya Exist Users", link: "exist_sathya_users", permission: "exist_sathya_users", dotColor: "bg-blue-500" },
      { icon: "mdi:account-cancel-outline", label: "Sathya Exist User Skipped", link: "exist_sathya_user_skipped", permission: "exist_sathya_user_skipped", dotColor: "bg-orange-500" },
      { icon: "mdi:card-account-details-outline", label: "Sathya Exist User Details", link: "exist_sathya_user_details", permission: "exist_sathya_user_details", dotColor: "bg-blue-500" },
    ],
  },
  {
    icon: "mdi:percent-outline",
    label: "Offer Module",
    submenu: [
      { icon: "mdi:percent-outline", label: "Offers", link: "offers", permission: "offers", dotColor: "bg-yellow-500" },
      { icon: "mdi:credit-card-outline", label: "Payment Offers", link: "payment-offers", permission: "payment-offers", dotColor: "bg-emerald-500" },
      { icon: "mdi:swap-horizontal", label: "Exchange Offers", link: "exchange-offers-condition", permission: "exchange-offers-condition", dotColor: "bg-purple-500" },
      { icon: "mdi:tag-outline", label: "Offer Product", link: "offer-product", permission: "offer-product", dotColor: "bg-green-500" },
      { icon: "mdi:star-circle-outline", label: "Highlighted Products", link: "highlighted-products", permission: "highlighted-products", dotColor: "bg-blue-500" },
    ],
  },
  {
    icon: "mdi:palette-outline",
    label: "Design",
    submenu: [
      { icon: "mdi:timer-outline", label: "Offer Timer", link: "offer-timer", permission: "offer-timer", dotColor: "bg-yellow-500" },
      { icon: "mdi:image-area", label: "Top Banner", link: "design/top-banner", permission: "design/top-banner", dotColor: "bg-indigo-500" },
      { icon: "mdi:sparkles", label: "Festival Effects", link: "festival-effects", permission: "festival-effects", dotColor: "bg-pink-500" },
      { icon: "mdi:rocket-launch-outline", label: "New Product Launch", link: "design/new-product-launch", permission: "design/new-product-launch", dotColor: "bg-blue-500" },
    ],
  },
];

function normalizePermissionKey(raw) {
  if (!raw || typeof raw !== "string") return "";
  return raw.trim().replace(/^\/+/, "");
}

export function flattenAdminModules(items = adminMenuItems) {
  const modules = [];
  const seen = new Set();

  for (const item of items) {
    if (item.link) {
      const key = normalizePermissionKey(item.permission || item.link);
      if (key && !seen.has(key)) {
        seen.add(key);
        modules.push({
          name: item.label,
          key,
          group: item.label,
        });
      }
    }
    if (item.submenu) {
      for (const sub of item.submenu) {
        const key = normalizePermissionKey(sub.permission || sub.link);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        modules.push({
          name: sub.label,
          key,
          group: item.label,
        });
      }
    }
  }

  return modules;
}

export function getAdminModuleLabel(moduleKey) {
  if (!moduleKey) return "Other";
  const normalized = normalizePermissionKey(moduleKey);
  const match = flattenAdminModules().find((item) => item.key === normalized);
  if (!match) return moduleKey;
  return match.group === match.name ? match.name : `${match.group} / ${match.name}`;
}

export function filterMenuByAccess(items, access) {
  if (!access || access.unrestricted) {
    return items;
  }

  const canAccess = (item) => {
    if (item.alwaysVisible) return true;
    const key = normalizePermissionKey(item.permission || item.link);
    if (!key) return false;
    return access.modules.includes(key) || access.permissions.includes(key);
  };

  return items
    .map((item) => {
      if (item.submenu) {
        const submenu = item.submenu.filter(canAccess);
        if (submenu.length === 0) return null;
        return { ...item, submenu };
      }
      return canAccess(item) ? item : null;
    })
    .filter(Boolean);
}
