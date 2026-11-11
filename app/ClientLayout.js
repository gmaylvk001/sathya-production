"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/context/AuthContext";
import { ModalProvider } from "@/context/ModalContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { CartProvider } from "@/context/CartContext";
import { HeaderProvider } from "@/context/HeaderContext";
import { RegionProvider } from "@/context/RegionContext";
import { CompareProvider } from "@/context/CompareContext";
import AuthSessionSync from "@/components/AuthSessionSync";

// Storefront chrome is heavy (Header ~icons/swiper). Keep it out of the admin
// client graph by loading only on non-admin routes via dynamic chunks.
const CustomHeader = dynamic(() => import("@/components/Headernew"), { ssr: true });
const CustomFooter = dynamic(() => import("@/components/Footer"), { ssr: true });
const GlobalModals = dynamic(() => import("@/components/GlobalModals"), { ssr: false });
const CompareBar = dynamic(() => import("@/components/CompareBar"), { ssr: false });
const WhatsAppWidget = dynamic(() => import("@/components/WhatsAppWidget"), { ssr: false });

const CHUNK_RELOAD_KEY = "sathya_chunk_reload";

function isChunkLoadError(message, name) {
  if (name === "ChunkLoadError") return true;
  const msg = String(message || "");
  return (
    /Loading chunk .* failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg)
  );
}

function recoverFromChunkLoadError() {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  } catch {
    // sessionStorage blocked — still attempt a single reload
  }
  window.location.reload();
}

export default function ClientLayout({ children }) {
  const pathname = usePathname();

  // Backup recovery if a later client navigation hits a stale/timeout chunk
  useEffect(() => {
    const onError = (event) => {
      const err = event?.error;
      if (isChunkLoadError(event?.message || err?.message, err?.name)) {
        recoverFromChunkLoadError();
      }
    };
    const onRejection = (event) => {
      const reason = event?.reason;
      if (isChunkLoadError(reason?.message || reason, reason?.name)) {
        recoverFromChunkLoadError();
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    const clearFlag = setTimeout(() => {
      try {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      } catch {
        /* ignore */
      }
    }, 15000);

    return () => {
      clearTimeout(clearFlag);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname]);

  const isAdmin = pathname?.startsWith("/admin");

  return (
    <RegionProvider>
      <HeaderProvider>
        <ModalProvider>
          <WishlistProvider>
            <CartProvider>
              <AuthProvider>
                {/* CompareProvider lives inside AuthProvider so syncOnLogin()
                    can access the token set by login() */}
                <CompareProvider>
                  <AuthSessionSync />
                  <div className="flex flex-col min-h-screen">
                    {!isAdmin && <CustomHeader />}
                    <main className="relative flex-grow min-h-[calc(100vh-280px)]">{children}</main>
                    {!isAdmin && <CustomFooter />}
                    {!isAdmin && <GlobalModals />}
                    {/* CompareBar: floating bottom bar — hidden on admin pages */}
                    {!isAdmin && <CompareBar />}
                    {/* WhatsApp floating widget — hidden on admin pages */}
                    {!isAdmin && <WhatsAppWidget />}
                  </div>
                </CompareProvider>
              </AuthProvider>
            </CartProvider>
          </WishlistProvider>
        </ModalProvider>
      </HeaderProvider>
    </RegionProvider>
  );
}
