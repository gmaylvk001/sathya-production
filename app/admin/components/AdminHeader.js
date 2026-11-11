'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import OrderStatsIcons from './OrderStatsIcons';
import { clearBrowserAuth } from '@/lib/clientAuthSession';

const AdminHeader = ({ toggleSidebar, sidebarCollapsed = true, mobileOpen = false }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [commOpen, setCommOpen] = useState(false);
  const sidebarIsOpen = mobileOpen || !sidebarCollapsed;
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const [uniletView, setUniletView] = useState(false);
  const [uniletAvailable, setUniletAvailable] = useState(false);
  const [userName, setUserName] = useState('');
  const router = useRouter();

  useEffect(() => {
    const cookieOn = /(?:^|;\s*)session_store=unilet(?:;|$)/.test(document.cookie);
    setUniletView(cookieOn);

    const fetchStoreView = () => {
      const token = localStorage.getItem('token');
      if (!token) return Promise.resolve('sathya');
      return fetch('/api/auth/check', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.json())
        .then((data) => {
          setUserName([data?.name, data?.last_name].filter(Boolean).join(' ').trim() || data?.email || '');
          return data?.admin_store_view || 'sathya';
        })
        .catch(() => 'sathya');
    };

    const fetchUniletExists = () =>
      fetch('/api/store_owners/unilet-exists')
        .then((res) => res.json())
        .then((data) => Boolean(data?.exists))
        .catch(() => false);

    Promise.all([fetchStoreView(), fetchUniletExists()]).then(([storeView, exists]) => {
      // all -> toggle shown; unilet -> locked to Unilet View; sathya -> locked to Sathya View.
      const wantUnilet = exists && (storeView === 'unilet' || (storeView === 'all' && cookieOn));
      if (wantUnilet !== cookieOn) {
        document.cookie = wantUnilet
          ? 'session_store=unilet; path=/; SameSite=Lax'
          : 'session_store=; path=/; max-age=0; SameSite=Lax';
        window.location.reload();
        return;
      }
      setUniletAvailable(exists && storeView === 'all');
    });
  }, []);

  const toggleUniletView = () => {
    const next = !uniletView;
    document.cookie = next
      ? 'session_store=unilet; path=/; SameSite=Lax'
      : 'session_store=; path=/; max-age=0; SameSite=Lax';
    setUniletView(next);
    alert(next ? 'Unilet Admin View' : 'Sathya Admin View');
    window.location.href = next ? '/admin/unilet-dashboard' : '/admin/dashboard';
  };

  const toggleDropdown = () => {
    setNotifOpen(false);
    setCommOpen(false);
    setDropdownOpen((prev) => !prev);
  };

  const toggleComm = () => {
    setNotifOpen(false);
    setDropdownOpen(false);
    setCommOpen((prev) => !prev);
  };
  const toggleNotif = async () => {
    setDropdownOpen(false);
    setCommOpen(false);
    if (!notifOpen && unreadCount > 0) {
      try {
        await fetch('/api/notification', { method: 'POST' });
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      } catch (err) {
        console.error('Failed to mark notifications as read:', err);
      }
    }
    setNotifOpen((prev) => !prev);
  };

  const handleSignOut = (e) => {
    e.preventDefault();
    try {
      document.cookie = 'session_store=; path=/; max-age=0; SameSite=Lax';
      clearBrowserAuth();
      sessionStorage.clear();
      router.push('/admin/login');
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/admin/login';
    }
  };

  useEffect(() => {
    let intervalId;
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/notification`);
        const data = await res.json();
        if (data.success) setNotifications(data.notifications);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };
    fetchNotifications();
    intervalId = setInterval(fetchNotifications, 120000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.profile-dropdown') && !e.target.closest('.notification-dropdown') && !e.target.closest('.communication-dropdown')) {
        setDropdownOpen(false);
        setNotifOpen(false);
        setCommOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="navbar-header col-span-2 col-start-1 row-start-1 z-50 flex h-full w-full items-center border-b border-gray-200 bg-white">
      <div className="flex h-full w-full items-center justify-between gap-3 px-4 sm:px-5 lg:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {toggleSidebar && (
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                setNotifOpen(false);
                toggleSidebar();
              }}
              className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
              aria-label={sidebarIsOpen ? "Close sidebar" : "Open sidebar"}
              aria-expanded={sidebarIsOpen}
              aria-controls="admin-sidebar"
            >
              {sidebarIsOpen ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          )}
          <a href="/" className="flex h-full min-w-0 items-center gap-3">
            <img
              src="/uploads/sathya-header-logo.webp"
              alt="Sathya"
              className="h-[56px] w-auto max-w-[80px] object-contain object-left"
            />
          </a>
        </div>

        <div className="flex shrink-0 items-center gap-5 sm:gap-5">
          {uniletAvailable && (
            <div className="unilet-view-wrap relative">
              <button
                type="button"
                onClick={toggleUniletView}
                className="flex flex-col items-center gap-1"
                aria-label="Unilet View"
                aria-pressed={uniletView}
                title={uniletView ? 'Unilet View On - click for Sathya View' : 'Unilet View'}
              >
                <div className={`relative flex h-5 w-5 lg:h-8 lg:w-8 items-center justify-center rounded-xl transition ${uniletView ? 'bg-[#0988f0] hover:bg-[#0777d4] text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                  <svg className={`h-4 w-4 ${uniletView ? 'text-white' : 'text-gray-700'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l1.5-5h15L21 9M3 9h18M3 9v1a3 3 0 006 0V9m0 1a3 3 0 006 0V9m0 1a3 3 0 006 0V9M5 13v7h14v-7M10 20v-4h4v4" />
                  </svg>
                </div>
                <span className={`hidden lg:block text-[9px] font-medium ${uniletView ? 'text-[#0988f0]' : 'text-gray-500'}`}>Unilet View</span>
              </button>
            </div>
          )}
          <OrderStatsIcons />
          <div className="communication-dropdown relative">
            <button
              onClick={toggleComm}
              className="flex flex-col items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 rounded-xl"
              aria-label="Communication"
              aria-expanded={commOpen}
            >
              <div className="relative flex h-5 w-5 lg:h-8 lg:w-8 items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition text-gray-700">
                <svg className="h-4 w-4 lg:h-4 lg:w-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="hidden lg:block text-[9px] font-medium text-gray-500">Messages</span>
            </button>
            {commOpen && (
              <div className="absolute right-0 mt-3 w-48 rounded-xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 z-50 overflow-hidden">
                <div className="bg-red-50 px-4 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-[#d72828]">
                  COMMUNICATION
                </div>
                <ul className="py-1">
                  <li>
                    <button
                      onClick={() => {
                        setCommOpen(false);
                        router.push('/admin/contact');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-red-50 hover:text-[#d72828]"
                    >
                      <svg className="h-4 w-4 shrink-0 text-[#d72828]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>Contact Us</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        setCommOpen(false);
                        router.push('/admin/feedback_page');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-red-50 hover:text-[#d72828]"
                    >
                      <svg className="h-4 w-4 shrink-0 text-[#d72828]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <span>Feedback</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        setCommOpen(false);
                        router.push('/admin/leads');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-red-50 hover:text-[#d72828]"
                    >
                      <svg className="h-4 w-4 shrink-0 text-[#d72828]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span>Leads</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="notification-dropdown relative">
            <button
              onClick={toggleNotif}
              className="flex flex-col items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 rounded-xl"
              aria-label="Notifications"
              aria-expanded={notifOpen}
            >
              <div className="relative flex h-5 w-5 lg:h-8 lg:w-8  items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition text-gray-700">
                <svg className="h-4 w-4 lg:h-4 lg:w-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-2 left-1/2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white shadow-sm ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="hidden lg:block text-[9px] font-medium text-gray-500">Alerts</span>
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 z-50 max-h-96 flex flex-col overflow-hidden">
                <div className="bg-red-50 px-4 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-[#d72828] shrink-0">
                  NOTIFICATIONS
                </div>
                <div className="overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-gray-500">No notifications</div>
                  ) : (
                    <div className="flex flex-col">
                      {notifications.map((notif) => (
                        <div key={notif._id} className={`group border-b border-gray-100 last:border-b-0 px-4 py-3 text-sm transition hover:bg-red-50 cursor-pointer ${!notif.read ? 'bg-red-50/40' : 'bg-white'}`}>
                          <div className={`font-medium transition group-hover:text-[#d72828] ${!notif.read ? 'text-[#d72828]' : 'text-gray-700'}`}>{notif.message}</div>
                          {notif.userId && (
                            <div className="mt-1 text-xs text-gray-500 group-hover:text-gray-600">User: {notif.userId.name} ({notif.userId.email})</div>
                          )}
                          {notif.orderId && (
                            <div className="mt-1 text-xs text-gray-500 group-hover:text-gray-600">Order: #{notif.orderId.order_number} | Amount: {notif.orderId.order_amount} | Status: {notif.orderId.order_status}</div>
                          )}
                          {notif.type === 'feedback' && notif.feedbackId && (
                            <div className="mt-1 text-xs text-gray-500 group-hover:text-gray-600">
                              <div>Name: {notif.feedbackId.name}</div>
                              <div>Email: {notif.feedbackId.email_address}</div>
                              <div>Invoice: {notif.feedbackId.invoice_number}</div>
                            </div>
                          )}

                          {notif.type === 'contact' && notif.contactId && (
                            <div className="mt-1 text-xs text-gray-500 group-hover:text-gray-600">
                              <div>Name: {notif.contactId.name}</div>
                              <div>Email: {notif.contactId.email_address}</div>
                              <div>Message: {notif.contactId.message}</div>
                            </div>
                          )}
                          <div className="mt-1.5 text-[11px] text-gray-400 group-hover:text-gray-500">{new Date(notif.createdAt).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="hidden h-8 w-px bg-gray-200 sm:block" aria-hidden="true" />

          <div className="profile-dropdown relative">
            <button
              onClick={toggleDropdown}
              className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
              aria-label="User profile"
              aria-expanded={dropdownOpen}
            >
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gray-200">
                <Image
                  src="/admin/assets/images/user.png"
                  alt="User Avatar"
                  width={36}
                  height={36}
                  className="object-cover"
                />
              </div>
              <div className="hidden text-left sm:block">
                <div className="text-xs leading-tight text-gray-500">Admin</div>
                <div className="text-sm font-medium leading-tight text-gray-800">Profile</div>
              </div>
              <svg className="hidden h-4 w-4 text-gray-400 sm:block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-xl ring-1 ring-black/5 z-50">
                {userName && (
                  <div className="border-b border-gray-100 px-4 py-2 text-sm font-semibold text-[#0988f0] truncate" title={userName}>
                    {userName}
                  </div>
                )}
                <a
                  href="#"
                  onClick={handleSignOut}
                  className="block px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
                >
                  Sign out
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
