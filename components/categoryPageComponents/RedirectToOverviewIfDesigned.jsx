/**
 * Previously redirected category listing traffic to /overview.
 * Disabled so users can visit base category URLs directly without auto-redirecting.
 * Header clicks navigate to /overview directly when designed.
 */
export default function RedirectToOverviewIfDesigned({ pageType }) {
  // Automatic redirect is disabled so that if a user manually removes /overview
  // from the URL, the browser opens and stays on the category listing page.
  // Header clicks already navigate to /overview directly when an overview page exists.
  return null;
}
