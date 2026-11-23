import { Poppins } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/app/ClientLayout";
import Script from "next/script";
import VisitorTracker from "@/components/VisitorTracker";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
  preload: true,
});

export const metadata = {
  title: {
    default: "SATHYA Store - Best Online Shopping for Home Appliances & Electronics",
    template: "%s | SATHYA Store",
  },
  description: "Shop online for home appliances, electronics, mobile phones, televisions, refrigerators, air conditioners, washing machines and more at best prices from SATHYA Store.",
  icons: {
    icon: "/favicon.webp",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={poppins.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://pixel.adtarbo.com" />
        {/* Preload Mobile & Desktop Top Banner for fast LCP without layout shift */}
        <link
          rel="preload"
          as="image"
          href="/uploads/category-topbanner/1793165384619-topbanner.webp"
          media="(max-width: 767px)"
          fetchPriority="high"
        />
        <link
          rel="preload"
          as="image"
          href="/uploads/category-topbanner/1791971568536-topbanner.webp"
          media="(min-width: 768px)"
          fetchPriority="high"
        />
      </head>
      <body className={`${poppins.className} font-sans antialiased`} suppressHydrationWarning>
        {/* Early inline handler: recovers from intermittent ChunkLoadError timeouts
            (stale HMR / slow layout chunk). Must stay inline so it runs even if
            the ClientLayout chunk itself fails to load. One reload per tab session. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var K="sathya_chunk_reload";function chunk(m,n){if(n==="ChunkLoadError")return!0;m=String(m||"");return/Loading chunk .* failed/i.test(m)||/ChunkLoadError/i.test(m)||/Failed to fetch dynamically imported module/i.test(m)}function recover(){try{if(sessionStorage.getItem(K)==="1")return;sessionStorage.setItem(K,"1")}catch(e){}location.reload()}window.addEventListener("error",function(e){var err=e&&e.error,msg=(e&&e.message)||(err&&err.message)||"";if(chunk(msg,err&&err.name))recover()});window.addEventListener("unhandledrejection",function(e){var r=e&&e.reason,msg=(r&&r.message)||String(r||"");if(chunk(msg,r&&r.name))recover()});setTimeout(function(){try{sessionStorage.removeItem(K)}catch(e){}},15000)}catch(e){}})();`,
          }}
        />
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-P7LW8D7X"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          ></iframe>
        </noscript>

        <ClientLayout>{children}</ClientLayout>
        <VisitorTracker />

        {/* Unified Non-Blocking Analytics & Tracking Loader (GTM, Adtarbo, GA4) */}
        <Script
          id="sathya-unified-tracking"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Initialize DataLayer and gtag early so any event calls are safely queued
                window.dataLayer = window.dataLayer || [];
                window.gtag = window.gtag || function() { window.dataLayer.push(arguments); };
                window.gtag('js', new Date());
                window.gtag('config', 'G-15V9VS13Q7');

                var loaded = false;
                function loadAllTracking() {
                  if (loaded) return;
                  loaded = true;

                  // 1. Load Google Tag Manager
                  try {
                    (function(w,d,s,l,i){
                      w[l]=w[l]||[];
                      w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
                      var f=d.getElementsByTagName(s)[0],
                      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
                      j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
                      if (f && f.parentNode) f.parentNode.insertBefore(j,f);
                    })(window,document,'script','dataLayer','GTM-P7LW8D7X');
                  } catch (e) {}

                  // 2. Load Adtarbo Pixel
                  try {
                    (function(dd, ss, idd) {
                      var js, ajs = dd.getElementsByTagName(ss)[0];
                      if (dd.getElementById(idd)) return;
                      js = dd.createElement(ss);
                      js.id = idd;
                      js.async = true;
                      js.aun_id = "GXNFAIR40psC";
                      js.src = "https://pixel.adtarbo.com/pixelTrack1.js";
                      if (ajs && ajs.parentNode) ajs.parentNode.insertBefore(js, ajs);
                      else if (dd.head) dd.head.appendChild(js);
                    })(document, 'script', 'adtarbo-js-v2');
                  } catch (e) {}

                  // 3. Load Google Analytics
                  try {
                    var gs = document.createElement('script');
                    gs.async = true;
                    gs.src = 'https://www.googletagmanager.com/gtag/js?id=G-15V9VS13Q7';
                    var first = document.getElementsByTagName('script')[0];
                    if (first && first.parentNode) first.parentNode.insertBefore(gs, first);
                  } catch (e) {}
                }

                // Trigger 1: User interaction (immediate activation on scroll, touch, or click)
                var events = ['scroll', 'touchstart', 'pointerdown', 'keydown'];
                var cleanup = function() {
                  events.forEach(function(evt) {
                    window.removeEventListener(evt, onUserAction, { passive: true });
                  });
                };
                var onUserAction = function() {
                  cleanup();
                  loadAllTracking();
                };
                events.forEach(function(evt) {
                  window.addEventListener(evt, onUserAction, { once: true, passive: true });
                });

                // Trigger 2: Idle fallback (fires after 2.5s or on idle, whichever is first)
                if ('requestIdleCallback' in window) {
                  requestIdleCallback(function() {
                    setTimeout(loadAllTracking, 1500);
                  }, { timeout: 3000 });
                } else {
                  setTimeout(loadAllTracking, 2500);
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
