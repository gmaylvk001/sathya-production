"use client";

import Link from "next/link";

function resolveHref(raw) {
  const link = String(raw || "").trim();
  if (!link) return "";
  if (/^https?:\/\//i.test(link) || link.startsWith("/")) return link;
  return `/category/${link.replace(/^\/+/, "")}`;
}

/**
 * Storefront: single banner image with invisible %-based hotspot overlays.
 * Always opens in the same tab. Hint text below the banner.
 */
export default function CategoryImageHotspotBanner({ config }) {
  const name = config?.name || "";
  const bannerImage = config?.bannerImage || "";
  const hotspots = (config?.hotspots || []).filter(
    (h) => h && h.isActive !== false && h.link
  );

  if (!bannerImage) return null;

  return (
    <section className="w-full mb-8 bg-white">
      <div className="w-full px-4 sm:px-6">
        {name ? (
          <h2 className="text-xl sm:text-2xl font-bold text-[#d72828] mb-4 px-1 text-center tracking-tight">
            {name}
          </h2>
        ) : null}

        <div className="relative w-full overflow-hidden rounded-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerImage}
            alt={name || "Banner"}
            className="block w-full h-auto"
            draggable={false}
          />

          {hotspots.map((hs) => {
            const href = resolveHref(hs.link);
            if (!href) return null;

            const style = {
              left: `${hs.x}%`,
              top: `${hs.y}%`,
              width: `${hs.width}%`,
              height: `${hs.height}%`,
            };

            const className =
              "absolute z-10 block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ED1C24] focus-visible:ring-offset-1";

            const external = /^https?:\/\//i.test(href);
            if (external) {
              return (
                <a
                  key={hs.id}
                  href={href}
                  className={className}
                  style={style}
                  aria-label={hs.label || "Hotspot link"}
                  title={hs.label || undefined}
                />
              );
            }

            return (
              <Link
                key={hs.id}
                href={href}
                className={className}
                style={style}
                aria-label={hs.label || "Hotspot link"}
                title={hs.label || undefined}
              />
            );
          })}
        </div>

        <p className="mt-2 text-center text-sm sm:text-base text-gray-600 px-2">
          Click which you want
        </p>
      </div>
    </section>
  );
}
