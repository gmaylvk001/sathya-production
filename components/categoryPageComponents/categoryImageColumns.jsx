"use client";

import Link from "next/link";
import { CATEGORY_PAGE_SHELL_CLASS } from "@/lib/categoryPageComponents/layout";

function resolveHref(raw) {
  const link = String(raw || "").trim();
  if (!link) return "";
  if (/^https?:\/\//i.test(link) || link.startsWith("/")) return link;
  return `/category/${link.replace(/^\/+/, "")}`;
}

function ImageLink({ href, children, className = "" }) {
  if (!href) return <div className={className}>{children}</div>;
  const external = /^https?:\/\//i.test(href);
  if (external) {
    return (
      <a
        href={href}
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function SlotImage({ image, url, className = "" }) {
  if (!image) return null;
  const href = resolveHref(url);
  return (
    <ImageLink
      href={href}
      className={`block w-full h-full overflow-hidden rounded-sm hover:opacity-95 transition-opacity ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt=""
        className="w-full h-full object-cover"
        draggable={false}
      />
    </ImageLink>
  );
}

function bySlot(images = []) {
  return Object.fromEntries(
    (images || []).filter((img) => img?.slot && img?.image).map((img) => [img.slot, img])
  );
}

/**
 * Storefront: 5-image mosaic — center_big | left_big | right_big
 */
export default function CategoryImageColumns({ config }) {
  const name = config?.name || "";
  const layout = config?.layout || "center_big";
  const showGap = Boolean(config?.showGap);
  const map = bySlot(config?.images);
  const gapClass = showGap ? "gap-2 sm:gap-3" : "gap-0";

  const hasAll =
    layout === "center_big"
      ? map.tl && map.bl && map.center && map.tr && map.br
      : layout === "left_big"
        ? map.left && map.c1 && map.c2 && map.tr && map.br
        : map.tl && map.bl && map.c1 && map.c2 && map.right;

  if (!hasAll) return null;

  let mosaic = null;

  if (layout === "center_big") {
    mosaic = (
      <div
        className={`grid grid-cols-2 md:grid-cols-[1fr_1.9fr_1fr] md:grid-rows-2 ${gapClass}`}
      >
        <div className="order-1 md:order-none aspect-[380/250] md:aspect-auto md:min-h-[200px]">
          <SlotImage image={map.tl.image} url={map.tl.url} />
        </div>
        <div className="order-3 md:order-none col-span-2 md:col-span-1 md:row-span-2 aspect-[780/520] md:aspect-auto md:min-h-[420px]">
          <SlotImage image={map.center.image} url={map.center.url} />
        </div>
        <div className="order-2 md:order-none aspect-[380/250] md:aspect-auto md:min-h-[200px]">
          <SlotImage image={map.tr.image} url={map.tr.url} />
        </div>
        <div className="order-4 md:order-none aspect-[380/250] md:aspect-auto md:min-h-[200px]">
          <SlotImage image={map.bl.image} url={map.bl.url} />
        </div>
        <div className="order-5 md:order-none aspect-[380/250] md:aspect-auto md:min-h-[200px]">
          <SlotImage image={map.br.image} url={map.br.url} />
        </div>
      </div>
    );
  } else if (layout === "left_big") {
    mosaic = (
      <div
        className={`grid grid-cols-2 md:grid-cols-[1.9fr_1fr_1fr] md:grid-rows-2 ${gapClass}`}
      >
        <div className="col-span-2 md:col-span-1 md:row-span-2 aspect-[780/520] md:aspect-auto md:min-h-[420px]">
          <SlotImage image={map.left.image} url={map.left.url} />
        </div>
        <div className="aspect-[380/250] md:aspect-auto md:min-h-[200px]">
          <SlotImage image={map.c1.image} url={map.c1.url} />
        </div>
        <div className="aspect-[380/250] md:aspect-auto md:min-h-[200px]">
          <SlotImage image={map.tr.image} url={map.tr.url} />
        </div>
        <div className="aspect-[380/250] md:aspect-auto md:min-h-[200px]">
          <SlotImage image={map.c2.image} url={map.c2.url} />
        </div>
        <div className="aspect-[380/250] md:aspect-auto md:min-h-[200px]">
          <SlotImage image={map.br.image} url={map.br.url} />
        </div>
      </div>
    );
  } else {
    mosaic = (
      <div
        className={`grid grid-cols-2 md:grid-cols-[1fr_1fr_1.9fr] md:grid-rows-2 ${gapClass}`}
      >
        <div className="order-1 md:order-none aspect-[380/250] md:aspect-auto md:min-h-[200px]">
          <SlotImage image={map.tl.image} url={map.tl.url} />
        </div>
        <div className="order-2 md:order-none aspect-[380/250] md:aspect-auto md:min-h-[200px]">
          <SlotImage image={map.c1.image} url={map.c1.url} />
        </div>
        <div className="order-5 md:order-none col-span-2 md:col-span-1 md:row-span-2 aspect-[780/520] md:aspect-auto md:min-h-[420px]">
          <SlotImage image={map.right.image} url={map.right.url} />
        </div>
        <div className="order-3 md:order-none aspect-[380/250] md:aspect-auto md:min-h-[200px]">
          <SlotImage image={map.bl.image} url={map.bl.url} />
        </div>
        <div className="order-4 md:order-none aspect-[380/250] md:aspect-auto md:min-h-[200px]">
          <SlotImage image={map.c2.image} url={map.c2.url} />
        </div>
      </div>
    );
  }

  return (
    <section className="w-full bg-white pb-4 sm:pb-6">
      <div className="w-full px-4 sm:px-6">
        {name ? (
          <h2 className="text-lg md:text-xl font-bold text-[#d72828] mb-3 md:mb-4 tracking-tight">
            {name}
          </h2>
        ) : null}
        {mosaic}
      </div>
    </section>
  );
}
