"use client";

import Link from "next/link";

function isExternalHref(href) {
  return /^https?:\/\//i.test(String(href || "").trim());
}

function normalizeHref(raw) {
  const link = String(raw || "").trim();
  if (!link) return "";
  if (isExternalHref(link) || link.startsWith("/")) return link;
  return `/category/${link.replace(/^\/+/, "")}`;
}

function SlotLink({ href, className = "", ariaLabel, children }) {
  const url = normalizeHref(href);
  if (!url) {
    return <div className={className}>{children}</div>;
  }
  if (isExternalHref(url)) {
    return (
      <a href={url} aria-label={ariaLabel} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={url} aria-label={ariaLabel} className={className}>
      {children}
    </Link>
  );
}

function BannerPicture({ desktopImage, mobileImage, alt = "Hero banner", priority = false }) {
  const desktopSrc = desktopImage || mobileImage;
  if (!desktopSrc) return null;

  return (
    <picture className="block w-full h-full">
      {mobileImage && <source media="(max-width: 767px)" srcSet={mobileImage} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={desktopSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        draggable={false}
      />
    </picture>
  );
}

function SmallBannerCard({ banner, alt, positionClass = "" }) {
  const hasUrl = Boolean(normalizeHref(banner?.url));
  const inner = (
    <div className="group relative w-full h-full overflow-hidden rounded-xl bg-gray-100 shadow-sm">
      <BannerPicture
        desktopImage={banner?.desktopImage}
        mobileImage={banner?.mobileImage}
        alt={alt}
      />
    </div>
  );

  const wrapperClass = `min-w-0 w-full aspect-[16/9] sm:aspect-[16/10] lg:aspect-auto lg:h-full ${positionClass}`;

  if (!hasUrl) {
    return <div className={wrapperClass}>{inner}</div>;
  }

  return (
    <SlotLink href={banner.url} className={`block ${wrapperClass}`}>
      {inner}
    </SlotLink>
  );
}

function getAlignmentClasses(align) {
  if (align === "center-left") {
    return {
      container: "items-center justify-start text-left",
      gradient: "bg-gradient-to-r from-black/75 via-black/40 to-transparent",
    };
  }
  if (align === "bottom-center") {
    return {
      container: "items-end justify-center text-center",
      gradient: "bg-gradient-to-t from-black/80 via-black/40 to-transparent",
    };
  }
  return {
    container: "items-end justify-start text-left",
    gradient: "bg-gradient-to-tr from-black/80 via-black/40 to-transparent",
  };
}

/**
 * Storefront: 3-banner Hero Grid matching existing Top Banner container space.
 * Supports `variant: "big-left" | "big-right"` and `embedded` carousel mode.
 */
export default function HeroBannerGrid({ config, embedded = false }) {
  const variant = config?.variant === "big-right" ? "big-right" : "big-left";
  const large = config?.largeBanner || {};
  const small1 = config?.smallBanner1 || {};
  const small2 = config?.smallBanner2 || {};

  const largeHasImg = Boolean(large.desktopImage || large.mobileImage);
  const small1HasImg = Boolean(small1.desktopImage || small1.mobileImage);
  const small2HasImg = Boolean(small2.desktopImage || small2.mobileImage);

  if (!largeHasImg || !small1HasImg || !small2HasImg) {
    return null;
  }

  const heading = String(large.heading || "").trim();
  const description = String(large.description || "").trim();
  const buttonText = String(large.buttonText || "").trim();
  const hasOverlayContent = Boolean(heading || description || buttonText);
  const bannerHref = normalizeHref(large.url);
  const buttonHref = normalizeHref(large.buttonUrl) || bannerHref;
  const alignStyles = getAlignmentClasses(large.overlayAlign);
  const textColor = large.textColor || "#ffffff";
  const showGradient = large.showGradientOverlay !== false;

  const isBigRight = variant === "big-right";

  const gridTemplateClass = isBigRight
    ? "lg:grid-cols-[1fr_1.95fr]"
    : "lg:grid-cols-[1.95fr_1fr]";

  const largePosClass = isBigRight
    ? "order-1 sm:col-span-2 lg:order-none lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:row-span-2"
    : "order-1 sm:col-span-2 lg:order-none lg:col-span-1 lg:col-start-1 lg:row-start-1 lg:row-span-2";

  const small1PosClass = isBigRight
    ? "order-2 lg:order-none lg:col-start-1 lg:row-start-1"
    : "order-2 lg:order-none lg:col-start-2 lg:row-start-1";

  const small2PosClass = isBigRight
    ? "order-3 lg:order-none lg:col-start-1 lg:row-start-2"
    : "order-3 lg:order-none lg:col-start-2 lg:row-start-2";

  const containerClass = embedded
    ? "w-full h-full bg-white px-2 sm:px-3 md:px-4"
    : "w-full bg-white mb-6 px-2 sm:px-3 md:px-4 pt-2.5 sm:pt-3.5 md:pt-4";

  const gridHeightClass = embedded
    ? "lg:h-full"
    : "lg:h-[370px] xl:h-[410px] 2xl:h-[420px]";

  return (
    <div className={containerClass}>
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 ${gridTemplateClass} lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 lg:gap-4 w-full ${gridHeightClass}`}
      >
        {/* Large Hero Banner Slot */}
        <div
          className={`group relative min-w-0 w-full aspect-[16/10] sm:aspect-[21/10] lg:aspect-auto lg:h-full overflow-hidden rounded-xl bg-gray-100 shadow-sm ${largePosClass}`}
        >
          <BannerPicture
            desktopImage={large.desktopImage}
            mobileImage={large.mobileImage}
            alt={heading || "Featured promotion"}
            priority
          />

          {/* Background click layer (sibling to CTA so nested <a> never occurs) */}
          {bannerHref && (
            <SlotLink
              href={bannerHref}
              ariaLabel={heading || "View promotion"}
              className="absolute inset-0 z-[1]"
            />
          )}

          {/* Render overlay box strictly when heading, description, or button exists */}
          {hasOverlayContent && (
            <div
              className={`absolute inset-0 z-[2] pointer-events-none flex ${alignStyles.container} p-4 sm:p-6 lg:p-8 ${
                showGradient ? alignStyles.gradient : ""
              }`}
            >
              <div
                className={`w-full max-w-xl ${
                  large.overlayAlign === "bottom-center" ? "mx-auto" : ""
                }`}
                style={{ color: textColor }}
              >
                {heading && (
                  <h2 className="text-lg sm:text-2xl lg:text-[28px] font-bold leading-tight tracking-tight drop-shadow-sm break-words line-clamp-2">
                    {heading}
                  </h2>
                )}
                {description && (
                  <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm opacity-95 leading-relaxed line-clamp-2 drop-shadow-sm break-words">
                    {description}
                  </p>
                )}
                {buttonText && (
                  <div className="mt-3 sm:mt-4">
                    {buttonHref ? (
                      <SlotLink
                        href={buttonHref}
                        className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg bg-[#ED1C24] hover:bg-[#C4161D] px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors"
                      >
                        {buttonText}
                      </SlotLink>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#ED1C24] px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm">
                        {buttonText}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Small Banner 1 (Top Small) */}
        <SmallBannerCard
          banner={small1}
          alt="Secondary offer 1"
          positionClass={small1PosClass}
        />

        {/* Small Banner 2 (Bottom Small) */}
        <SmallBannerCard
          banner={small2}
          alt="Secondary offer 2"
          positionClass={small2PosClass}
        />
      </div>
    </div>
  );
}
