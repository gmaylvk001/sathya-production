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
