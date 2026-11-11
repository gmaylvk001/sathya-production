"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AdminHeader from "@/app/admin/components/AdminHeader";
import AdminSider from "@/app/admin/components/AdminSider";
import AuthProvider from "@/app/admin/components/AuthProvider";
import AdminPageShell from "@/app/admin/components/AdminPageShell";
import { AdminNavLoadingProvider } from "@/app/admin/components/AdminNavLoading";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const SIDEBAR_COLLAPSED = "70px";
const SIDEBAR_EXPANDED = "240px";

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const isLoginPage = pathname === "/admin/login";

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setSidebarCollapsed((prev) => !prev);
    } else {
      setMobileOpen((prev) => !prev);
    }
  };

  useEffect(() => {
    if (isLoginPage) return;
    setMobileOpen(false);
  }, [pathname, isLoginPage]);

  useEffect(() => {
    if (isLoginPage) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const onChange = (e) => {
      setIsDesktop(e.matches);
      if (e.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [isLoginPage]);

  useEffect(() => {
    if (isLoginPage) return;
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen, isLoginPage]);

  useEffect(() => {
    if (isLoginPage || !mobileOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;
  const headerHeight = isDesktop ? "80px" : "68px";

  return (
    <AuthProvider>
      <AdminNavLoadingProvider>
        <div
          className="admin-layout grid h-screen overflow-hidden bg-gray-100 text-[13px]"
          style={{
            gridTemplateRows: `${headerHeight} minmax(0, 1fr)`,
            gridTemplateColumns: `${sidebarWidth} minmax(0, 1fr)`,
            transition: "grid-template-columns 300ms ease",
            "--admin-sidebar-width": sidebarWidth,
            "--admin-header-height": headerHeight,
          }}
        >
          <AdminHeader
            toggleSidebar={handleToggleSidebar}
            sidebarCollapsed={sidebarCollapsed}
            mobileOpen={mobileOpen}
          />
          {mobileOpen && (
            <button
              type="button"
              aria-label="Close sidebar"
              className="fixed inset-x-0 bottom-0 top-[var(--admin-header-height)] z-40 bg-black/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
          )}
          <AdminSider
            collapsed={sidebarCollapsed}
            mobileOpen={mobileOpen}
            onNavigate={() => setMobileOpen(false)}
          />
          <main className="admin-main col-start-2 row-start-2 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto bg-[#f5f6f8] px-3 py-3 sm:px-4 sm:py-4">
            <AdminPageShell>{children}</AdminPageShell>
          </main>
        </div>
        <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} />
      </AdminNavLoadingProvider>
    </AuthProvider>
  );
}
