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
    <html lang="en" className={`${poppins.variable} ${poppins.className}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
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
          ></iframe>
        </noscript>

        <ClientLayout>{children}</ClientLayout>
        <VisitorTracker />

        {/* Third-party Analytics & Tracking Scripts placed in body to prevent ChunkLoad timeouts */}
        <Script
          id="adtarbo-script"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              (function(dd, ss, idd) {
                var js, ajs = dd.getElementsByTagName(ss)[0];
                if (dd.getElementById(idd)) {return;}
                js = dd.createElement(ss);
                js.id = idd;
                js.aun_id = "GXNFAIR40psC";
                js.src = "https://pixel.adtarbo.com/pixelTrack1.js";
                if (ajs && ajs.parentNode) {
                  ajs.parentNode.insertBefore(js, ajs);
                } else if (dd.head) {
                  dd.head.appendChild(js);
                }
              } (document, 'script', 'adtarbo-js-v2'));
            `,
          }}
        />
        <Script
          id="gtag-base"
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-15V9VS13Q7"
        />
        <Script id="gtm-new" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-15V9VS13Q7');
          `}
        </Script>
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];
              w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
              var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
              j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
              f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-P7LW8D7X');`,
          }}
        />
      </body>
    </html>
  );
}
