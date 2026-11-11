"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import AdminLoader from "@/app/admin/components/AdminLoader";

const SHOW_DELAY_MS = 150;
const MIN_VISIBLE_MS = 250;

const AdminNavLoadingContext = createContext({
  start: () => {},
  visible: false,
});

export function useAdminNavLoading() {
  return useContext(AdminNavLoadingContext);
}

export function AdminNavLoadingProvider({ children }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const pendingRef = useRef(false);
  const visibleRef = useRef(false);
  const shownAtRef = useRef(0);
  const lastPathRef = useRef(pathname);
  const showTimerRef = useRef();
  const hideTimerRef = useRef();

  const clearTimers = () => {
    clearTimeout(showTimerRef.current);
    clearTimeout(hideTimerRef.current);
  };

  const start = useCallback((nextPath) => {
    const current = lastPathRef.current;
    if (nextPath && normalizePath(nextPath) === normalizePath(current)) {
      return;
    }

    pendingRef.current = true;
    clearTimeout(hideTimerRef.current);
    clearTimeout(showTimerRef.current);

    showTimerRef.current = setTimeout(() => {
      if (!pendingRef.current) return;
      visibleRef.current = true;
      shownAtRef.current = Date.now();
      setVisible(true);
    }, SHOW_DELAY_MS);
  }, []);

  const stop = useCallback(() => {
    pendingRef.current = false;
    clearTimeout(showTimerRef.current);

    if (!visibleRef.current) return;

    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAtRef.current));
    hideTimerRef.current = setTimeout(() => {
      visibleRef.current = false;
      setVisible(false);
    }, wait);
  }, []);

  useEffect(() => {
    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname;
      stop();
    }
  }, [pathname, stop]);

  useEffect(() => () => clearTimers(), []);

  return (
    <AdminNavLoadingContext.Provider value={{ start, visible }}>
      {children}
    </AdminNavLoadingContext.Provider>
  );
}

export function AdminNavLoadingOverlay() {
  const { visible } = useAdminNavLoading();

  if (!visible) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-white/80"
      aria-busy="true"
    >
      <AdminLoader />
    </div>
  );
}

function normalizePath(path) {
  if (!path) return "";
  return path.replace(/\/+$/, "") || "/";
}
