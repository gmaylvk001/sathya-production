'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';
import { createPortal } from 'react-dom';

/**
 * Menu items for AdminSider. `permission` must match ecom_permissions_infos.module
 * (same keys as lib/adminModules.js / role seeder).
 * Sathya mode: hide item if role does not include that permission.
 */
const menuItems = [
  { icon: 'material-symbols:dashboard', label: 'Dashboard', link: 'dashboard', permission: 'dashboard', alwaysVisible: true },
  { icon: 'mdi:view-dashboard-outline', label: 'Unilet Dashboard', link: 'unilet-dashboard', permission: 'unilet-dashboard' },
  { icon: 'material-symbols:category', label: 'Category', link: 'category', permission: 'category' },
  {
    icon: 'mdi:package-variant-closed',
    label: 'Product',
    submenu: [
      { icon: 'mdi:format-list-bulleted', label: 'Product List', link: 'product', permission: 'product', dotColor: 'bg-green-500' },
      { icon: 'mdi:shape-outline', label: 'Variants', link: 'variants', permission: 'variants', dotColor: 'bg-blue-500' },
      { icon: 'mdi:trademark', label: 'Brand', link: 'brand', permission: 'brand', dotColor: 'bg-red-500' },
      { icon: 'mdi:upload', label: 'Bulk Upload', link: 'product/bulk_upload', permission: 'product/bulk_upload', dotColor: 'bg-yellow-500' },
      { icon: 'mdi:file-upload-outline', label: 'Filter Bulk Upload', link: 'product/filter_bulk_upload', permission: 'product/filter_bulk_upload', dotColor: 'bg-yellow-500' },
      { icon: 'mdi:filter-variant', label: 'Filter Group', link: 'filter_group', permission: 'filter_group', dotColor: 'bg-yellow-500' },
      { icon: 'mdi:filter-outline', label: 'Filter', link: 'filter', permission: 'filter', dotColor: 'bg-yellow-500' },
      { icon: 'mdi:plus-box-outline', label: 'New Product', link: 'newproduct', permission: 'newproduct', dotColor: 'bg-green-500' },
      { icon: 'material-symbols:reviews-rounded', label: 'Product Review', link: 'reviews', permission: 'reviews', dotColor: 'bg-orange-500' },
      { icon: 'mdi:file-document-outline', label: 'All Products (Catalog & PDF)', link: '/all-products', permission: 'all-products', dotColor: 'bg-purple-500' },
    ],
  },
  { icon: 'mdi:storefront-outline', label: 'Unilet Products', link: 'unilet-products', permission: 'unilet-products' },
  { icon: 'mdi:plus-box-multiple-outline', label: 'New Unilet Product', link: 'unilet-new-products', permission: 'unilet-new-products' },
  {
    icon: 'mdi:cart-outline',
    label: 'Sales',
    submenu: [
      { icon: 'mdi:view-dashboard-outline', label: 'Dashboard', id: 'sales-dashboard', link: 'sales/dashboard', permission: 'sales/dashboard', dotColor: 'bg-green-500' },
      { icon: 'mdi:clipboard-list-outline', label: 'All Orders', link: 'Allorder', permission: 'Allorder', dotColor: 'bg-yellow-500' },
      { icon: 'mdi:home-import-outline', label: 'Home Delivery', link: 'homedelivery', permission: 'homedelivery', dotColor: 'bg-yellow-500' },
      { icon: 'mdi:cart-off', label: 'Abandoned Order', link: 'abandonedorder', permission: 'abandonedorder', dotColor: 'bg-yellow-500' },
      { icon: 'mdi:cancel', label: 'Cancel Order', link: 'order/cancel-order', permission: 'order/cancel-order', dotColor: 'bg-[#d72828]' },
      { icon: 'mdi:clipboard-check-outline', label: 'Place Orders', link: 'order/place-order', permission: 'order/place-order', dotColor: 'bg-blue-500' },
      { icon: 'mdi:history', label: 'Order History', link: 'sathya-exist-order-history', permission: 'sathya-exist-order-history', dotColor: 'bg-yellow-500' },
    ],
  },
  {
    icon: 'mdi:archive-outline',
    label: 'Exist Sales',
    submenu: [
      { icon: 'mdi:clipboard-list-outline', label: 'Orders', id: 'exist-sales-orders', link: 'sathya-exist-orders', permission: 'sathya-exist-orders', dotColor: 'bg-yellow-500' },
      { icon: 'mdi:clipboard-list-outline', label: 'Order Details', id: 'exist-sales-order-details', link: 'sathya-exist-orders-details', permission: 'sathya-exist-orders-details', dotColor: 'bg-yellow-500' },
      { icon: 'mdi:credit-card-outline', label: 'Payments', id: 'exist-sales-payments', link: 'sathya-exist-payments', permission: 'sathya-exist-payments', dotColor: 'bg-yellow-500' },
      { icon: 'mdi:cancel', label: 'Cancel Orders', id: 'exist-sales-cancel-orders', link: 'sathya-exist-cancel-orders', permission: 'sathya-exist-cancel-orders', dotColor: 'bg-yellow-500' },
    ],
  },
  {
    icon: 'mdi:chart-pie',
    label: 'Reports',
    submenu: [
      { icon: 'mdi:chart-bar', label: 'Sales Report', id: 'sales-report', link: 'reports/sales', permission: 'reports/sales' },
      { icon: 'mdi:card-account-phone-outline', label: 'Contacts', id: 'admin-contact', link: 'contact', permission: 'contact' },
    ],
  },
  {
    icon: 'mdi:database',
    label: 'CRM',
    submenu: [
      { icon: 'mdi:chevron-double-right', label: 'Leads', id: 'crm-leads', link: 'leads', permission: 'leads', dotColor: 'bg-blue-500' },
    ],
  },
  {
    icon: 'mdi:bank-outline',
    label: 'Finance',
    submenu: [
      { icon: 'mdi:chevron-double-right', label: 'Finance Bank', link: 'finance/bank', permission: 'finance/bank', dotColor: 'bg-blue-500' },
      { icon: 'mdi:chevron-double-right', label: 'EMI Product', link: 'finance/emi-product', permission: 'finance/emi-product', dotColor: 'bg-green-500' },
      { icon: 'mdi:chevron-double-right', label: 'EMI Scheme', link: 'finance/emi-scheme', permission: 'finance/emi-scheme', dotColor: 'bg-yellow-500' },
    ],
  },
  {
    icon: 'mdi:post-outline',
    label: 'Blogs',
    submenu: [
      { icon: 'mdi:format-list-bulleted', label: 'Blog List', link: 'blogs', permission: 'blogs', dotColor: 'bg-green-500' },
      { icon: 'mdi:frequently-asked-questions', label: 'Blog FAQ', link: 'blogs-faq', permission: 'blogs-faq', dotColor: 'bg-purple-500' },
    ],
  },
  {
    icon: 'mdi:store-marker-outline',
    label: 'Stores',
    submenu: [
      { icon: 'mdi:map-marker-radius-outline', label: 'Store Zones', link: 'store-zones', permission: 'store-zones', dotColor: 'bg-blue-500' },
      { icon: 'mdi:storefront-outline', label: 'Store Listings', link: 'store-listings', permission: 'store-listings', dotColor: 'bg-green-500' },
      { icon: 'mdi:account-tie-outline', label: 'Store Owners', link: 'store-owners', permission: 'store-owners', dotColor: 'bg-yellow-500' },
    ],
  },
  {
    icon: 'mdi:cog-outline',
    label: 'Settings',
    submenu: [
      { icon: 'mdi:home-outline', label: 'Home Settings', link: 'homesettings', permission: 'homesettings', dotColor: 'bg-green-500' },
      { icon: 'mdi:view-dashboard-edit-outline', label: 'Category Settings', link: 'category-pages', permission: 'category-pages', dotColor: 'bg-green-500' },
      { icon: 'mdi:tag-multiple-outline', label: 'Brand Settings', link: 'brand-pages', permission: 'brand-pages', dotColor: 'bg-green-500' },
      { icon: 'mdi:store-outline', label: 'Store Settings', link: 'store', permission: 'store', dotColor: 'bg-yellow-500' },
    ],
  },
  {
    icon: 'mdi:account-cog-outline',
    label: 'Users Settings',
    submenu: [
      { icon: 'mdi:account-outline', label: 'Users', link: 'user', permission: 'user', dotColor: 'bg-yellow-500' },
      { icon: 'mdi:account-tie-outline', label: 'System_Users', link: 'system_users', permission: 'system_users', dotColor: 'bg-yellow-500' },
      { icon: 'mdi:shield-key-outline', label: 'Permissions', link: 'permissions', permission: 'permissions', dotColor: 'bg-purple-500' },
      { icon: 'mdi:account-group-outline', label: 'Roles', link: 'roles', permission: 'roles', dotColor: 'bg-blue-500' },
      { icon: 'mdi:account-group-outline', label: 'Sathya Exist Users', link: 'exist_sathya_users', permission: 'exist_sathya_users', dotColor: 'bg-blue-500' },
      { icon: 'mdi:account-cancel-outline', label: 'Sathya Exist User Skipped', link: 'exist_sathya_user_skipped', permission: 'exist_sathya_user_skipped', dotColor: 'bg-orange-500' },
      { icon: 'mdi:card-account-details-outline', label: 'Sathya Exist User Details', link: 'exist_sathya_user_details', permission: 'exist_sathya_user_details', dotColor: 'bg-blue-500' },
    ],
  },
  {
    icon: 'mdi:percent-outline',
    label: 'Offer Module',
    submenu: [
      { icon: 'mdi:percent-outline', label: 'Offers', link: 'offers', permission: 'offers', dotColor: 'bg-yellow-500' },
      { icon: 'mdi:credit-card-outline', label: 'Payment Offers', link: 'payment-offers', permission: 'payment-offers', dotColor: 'bg-emerald-500' },
      { icon: 'mdi:swap-horizontal', label: 'Exchange Offers', link: 'exchange-offers-condition', permission: 'exchange-offers-condition', dotColor: 'bg-purple-500' },
      { icon: 'mdi:tag-outline', label: 'Offer Product', link: 'offer-product', permission: 'offer-product', dotColor: 'bg-green-500' },
      { icon: 'mdi:star-circle-outline', label: 'Highlighted Products', link: 'highlighted-products', permission: 'highlighted-products', dotColor: 'bg-blue-500' },
    ],
  },
  {
    icon: 'mdi:palette-outline',
    label: 'Design',
    submenu: [
      { icon: 'mdi:timer-outline', label: 'Offer Timer', link: 'offer-timer', permission: 'offer-timer', dotColor: 'bg-yellow-500' },
      { icon: 'mdi:image-area', label: 'Top Banner', link: 'design/top-banner', permission: 'design/top-banner', dotColor: 'bg-indigo-500' },
      { icon: 'mdi:sparkles', label: 'Festival Effects', link: 'festival-effects', permission: 'festival-effects', dotColor: 'bg-pink-500' },
      { icon: 'mdi:rocket-launch-outline', label: 'New Product Launch', link: 'design/new-product-launch', permission: 'design/new-product-launch', dotColor: 'bg-blue-500' },
    ],
  },
];

const UNILET_VIEW_MENUS = ['Unilet Dashboard', 'Category', 'Product', 'Unilet Products', 'New Unilet Product', 'Sales', 'Stores'];
const UNILET_ONLY_MENUS = ['Unilet Dashboard', 'Unilet Products', 'New Unilet Product'];

function permissionKey(item) {
  if (!item) return '';
  if (item.permission) return String(item.permission).replace(/^\/+/, '');
  if (item.link) return String(item.link).replace(/^\/+/, '');
  return '';
}

function hasMenuAccess(item, access) {
  if (!access || access.skipPermissionFilter) return true;
  if (item.alwaysVisible) return true;
  const key = permissionKey(item);
  if (!key) return false;
  const modules = access.modules || [];
  const permissions = access.permissions || [];
  return modules.includes(key) || permissions.includes(key);
}

function filterByPermissions(items, access) {
  if (!access || access.skipPermissionFilter) return items;
  return items
    .map((item) => {
      if (item.submenu) {
        const submenu = item.submenu.filter((sub) => hasMenuAccess(sub, access));
        if (submenu.length === 0) return null;
        return { ...item, submenu };
      }
      return hasMenuAccess(item, access) ? item : null;
    })
    .filter(Boolean);
}

/**
 * admin_store_view:
 *   all    → current Unilet/Sathya cookie mode menus, NO permission filter (all modules)
 *   unilet → Unilet mode menus only + role permissions for those modules
 *   sathya → Sathya mode menus only + role permissions for those modules
 */
function visibleMenuItems(uniletView, access) {
  const storeView = String(access?.adminStoreView || 'sathya').toLowerCase();

  // Force mode from admin_store_view when locked to unilet/sathya
  const useUniletMenus =
    storeView === 'unilet' ? true : storeView === 'sathya' ? false : Boolean(uniletView);

  let items = useUniletMenus
    ? menuItems.filter((item) => UNILET_VIEW_MENUS.includes(item.label))
    : menuItems.filter((item) => !UNILET_ONLY_MENUS.includes(item.label));

  // all → show every module for that mode (no permission hide)
  if (storeView === 'all' || access?.skipPermissionFilter) {
    return items;
  }

  // unilet / sathya → permission-based show/hide for that mode's modules
  return filterByPermissions(items, access);
}

export default function AdminSider({ collapsed }) {
  const pathname = usePathname();
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [openMenus, setOpenMenus] = useState([]);
  const [uniletView, setUniletView] = useState(false);
  const [access, setAccess] = useState({
    skipPermissionFilter: true,
    adminStoreView: 'sathya',
    hasRole: false,
    permissions: [],
    modules: [],
  });
  const [accessLoaded, setAccessLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setUniletView(/(?:^|;\s*)session_store=unilet(?:;|$)/.test(document.cookie));
  }, []);

  // Load admin_store_view + role modules for sidebar show/hide
  useEffect(() => {
    let cancelled = false;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setAccessLoaded(true);
      return undefined;
    }

    fetch('/api/auth/check', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.loggedIn) return;

        const storeView = String(data.admin_store_view || 'sathya').toLowerCase();
        const hasRole = Boolean(data.hasRole);
        // all → never filter by permission; also no-role users see full mode menu
        const skipPermissionFilter =
          storeView === 'all' || Boolean(data.unrestricted) || !hasRole;

        setAccess({
          skipPermissionFilter,
          adminStoreView: storeView,
          hasRole,
          permissions: Array.isArray(data.permissions) ? data.permissions : [],
          modules: Array.isArray(data.modules) ? data.modules : [],
        });

        // Align cookie mode with locked store view
        if (storeView === 'unilet') setUniletView(true);
        if (storeView === 'sathya') setUniletView(false);
      })
      .catch(() => {
        // On failure keep full menu so sidebar does not blank out
      })
      .finally(() => {
        if (!cancelled) setAccessLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const itemsToShow = useMemo(
    () =>
      visibleMenuItems(
        uniletView,
        accessLoaded
          ? access
          : { skipPermissionFilter: true, adminStoreView: 'all', hasRole: false }
      ),
    [uniletView, access, accessLoaded]
  );

  useEffect(() => {
    if (!pathname) return;
    if (pathname.includes('/admin/unilet-products')) {
      setActiveMenu('Unilet Products');
      return;
    }
    // Check submenus first
    for (const item of menuItems) {
      if (item.submenu) {
        const sub = item.submenu.find((s) => {
          const link = String(s.link || '').replace(/^\/+/, '');
          return link && pathname.includes(link.startsWith('admin/') ? `/${link}` : `/admin/${link}`);
        });
        if (sub) {
          setActiveMenu(sub.id || sub.label);
          setOpenMenus((prev) => (prev.includes(item.label) ? prev : [...prev, item.label]));
          return;
        }
      }
    }
    // Then check top-level items
    for (const item of menuItems) {
      if (item.link && (pathname === `/admin/${item.link}` || pathname.startsWith(`/admin/${item.link}/`))) {
        setActiveMenu(item.label);
        return;
      }
    }
  }, [pathname]);

  useEffect(() => {
    const clickedMain = menuItems.find((item) => item.label === activeMenu);
    if (clickedMain && !clickedMain.submenu) {
      setOpenMenus([]);
    }
  }, [activeMenu]);

  return (
    <aside
      id="admin-sidebar"
      className="col-start-1 row-start-2 z-30 flex h-full min-h-0 w-full flex-col overflow-y-auto border-r border-gray-200 bg-white scrollbar-hide"
    >
      <nav className="py-3">
        <ul className="space-y-1 px-3">
          {itemsToShow.map((item) =>
            item.submenu ? (
              <SidebarItemWithDropdown
                key={item.label}
                item={item}
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
                collapsed={collapsed}
                openMenus={openMenus}
                setOpenMenus={setOpenMenus}
                router={router}
              />
            ) : (
              <SidebarItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                link={item.link}
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
                collapsed={collapsed}
                router={router}
              />
            )
          )}
        </ul>
      </nav>
    </aside>
  );
}

function SidebarItem({ icon, label, link, activeMenu, setActiveMenu, collapsed, router }) {
  const active = activeMenu === label;
  const [isHovered, setIsHovered] = useState(false);
  const [badgeTop, setBadgeTop] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleMouseEnter = (e) => {
    if (collapsed) {
      const rect = e.currentTarget.getBoundingClientRect();
      setBadgeTop(rect.top);
      setIsHovered(true);
    }
  };

  return (
    <li 
      className="relative" 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={() => {
          setActiveMenu(label);
          router.push(`/admin/${link}`);
        }}
        className={`w-full flex items-center px-1 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
          active 
            ? 'bg-brandRed text-white' 
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        } ${collapsed ? 'justify-center' : 'space-x-3'}`}
        aria-label={label}
      >
        <Icon icon={icon} className="text-xl" />
        {!collapsed && <span>{label}</span>}
      </button>
      
      {collapsed && isHovered && mounted && createPortal(
        <span
          role="tooltip"
          className="pointer-events-none fixed z-[9999] whitespace-nowrap rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-brandRed shadow-lg transition-opacity duration-200"
          style={{
            left: '60px',
            top: `${badgeTop}px`,
          }}
        >
          {label}
        </span>,
        document.body
      )}
    </li>
  );
}

function SidebarItemWithDropdown({
  item,
  activeMenu,
  setActiveMenu,
  collapsed,
  openMenus,
  setOpenMenus,
  router
}) {
  const isOpen = openMenus.includes(item.label);
  const [isHovered, setIsHovered] = useState(false);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const [flyoutMaxHeight, setFlyoutMaxHeight] = useState(0);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => setMounted(true), []);

  const handleLiMouseEnter = (event) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!collapsed) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    
    // Estimate the height of the flyout menu (header + items)
    const estimatedHeight = 45 + (item.submenu.length * 44);
    
    let topPosition = rect.top;
    
    // If the flyout would extend below the viewport, shift it up
    if (topPosition + estimatedHeight > window.innerHeight - 16) {
      topPosition = Math.max(16, window.innerHeight - estimatedHeight - 16);
    }
    
    setFlyoutTop(topPosition);
    setFlyoutMaxHeight(window.innerHeight - 32); // Max height to fit within window
    
    setIsHovered(true);
  };

  const handlePortalMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (collapsed) {
      timerRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 150);
    }
  };

  const toggleMenu = () => {
    if (isOpen) {
      setOpenMenus((prev) => prev.filter((menu) => menu !== item.label));
    } else {
      setOpenMenus((prev) => [...prev, item.label]);
    }
  };

  const isActive = item.submenu.some((sub) => (sub.id || sub.label) === activeMenu);

  return (
    <li 
      className="relative" 
      onMouseEnter={handleLiMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => {
          if (collapsed) return;
          toggleMenu();
        }}
        className={`w-full flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
          isActive
            ? 'bg-red-100 text-brandRed'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        } ${collapsed ? 'justify-center' : 'space-x-3'}`}
        aria-label={item.label}
        aria-haspopup="true"
      >
        <Icon icon={item.icon} className={collapsed ? 'text-2xl' : 'text-xl'} />
        {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
        {!collapsed && (
          <Icon
            icon={isOpen ? 'mdi:chevron-down' : 'mdi:chevron-right'}
            className="text-lg"
          />
        )}
      </button>

      {collapsed && isHovered && mounted && createPortal(
        <div
          className="fixed z-[99999]"
          style={{
            left: '70px',
            top: `${flyoutTop}px`,
          }}
          onMouseEnter={handlePortalMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="pl-2">
            <div 
              className="min-w-[210px] rounded-lg border border-gray-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden"
              style={{ maxHeight: `${flyoutMaxHeight}px` }}
            >
              <div className="shrink-0 bg-red-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-brandRed border-b border-gray-100">
                {item.label}
              </div>
              <ul className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-1 custom-scrollbar">
                {item.submenu.map((sub) => (
                  <li key={sub.label}>
                    <button
                      onClick={() => {
                        setActiveMenu(sub.id || sub.label);
                        setIsHovered(false);
                        if (sub.link) router.push(sub.link.startsWith('/') ? sub.link : `/admin/${sub.link}`);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                        activeMenu === (sub.id || sub.label)
                          ? 'bg-brandRed text-white'
                          : 'text-gray-700 hover:bg-red-50 hover:text-brandRed'
                      }`}
                    >
                      <Icon icon={sub.icon} className="h-4 w-4 shrink-0 text-[16px]" />
                      <span className="truncate">{sub.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>,
        document.body
      )}

      {!collapsed && isOpen && (
        <ul className="ml-2 mt-1 space-y-1">
          {item.submenu.map((sub) => (
            <li key={sub.label}>
              <button
                onClick={() => {
                  setActiveMenu(sub.id || sub.label);
                  if (sub.link) router.push(sub.link.startsWith('/') ? sub.link : `/admin/${sub.link}`);
                }}
                className={`w-full flex items-center px-3 py-2 rounded text-sm space-x-3 ${
                  activeMenu === (sub.id || sub.label)
                    ? 'bg-brandRed text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon icon={sub.icon} className="text-lg" />
                <span>{sub.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

