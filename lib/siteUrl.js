/**
 * Canonical public site origin for sitemaps, emails, SMS, and redirects.
 */
export function getSiteUrl() {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.ORDER_EMAIL_SITE_URL,
    process.env.NEXT_PUBLIC_API_URL,
  ];

  for (const raw of candidates) {
    const value = String(raw || "").trim().replace(/\/+$/, "");
    if (!value) continue;
    // Prefer real domains over raw IPs / localhost in production builds
    if (/^https?:\/\//i.test(value)) return value;
  }

  return "https://www.sathya.store";
}

/**
 * Origin of the request the customer is on.
 * PayU return URLs use this so Karnataka checkout stays on the current host.
 */
export function getRequestOrigin(req) {
  const read = (name) => {
    const raw = req?.headers?.get?.(name);
    return raw ? String(raw).split(",")[0].trim() : "";
  };

  const host = read("x-forwarded-host") || read("host");
  if (!host || /[\s/\\@]/.test(host)) return "";

  const forwardedProto = read("x-forwarded-proto").toLowerCase();
  const proto =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)
        ? "http"
        : "https";

  return `${proto}://${host}`;
}
