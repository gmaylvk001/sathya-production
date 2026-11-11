/** Default email content for wishlist reminder mails (overridden in admin / DB). */
export const DEFAULT_WISHLIST_MAIL_EMAIL_CONTENT = {
  logoUrl: "",
  topBannerItems: [
    { icon: "", iconUrl: "", label: "100% Genuine Products" },
    { icon: "", iconUrl: "", label: "Secure Payments" },
    { icon: "", iconUrl: "", label: "Easy Returns" },
    { icon: "", iconUrl: "", label: "47+ Stores Across TN" },
  ],
  footerPromiseTitle: "Sathya Promise",
  footerPromiseItems: [
    { label: "100% Genuine Products | Secure Payments" },
    { label: "Easy Returns | Expert Installation" },
  ],
  headline: "Still thinking about this?",
  introTemplate:
    "Hi {{name}}, this item is still in your wishlist — take another look when you're ready.",
  urgentText: "",
  wishlistButtonText: "View in Wishlist",
  productLinkText: "View product page",
  closingLine: "We're here whenever you need us.",
  teamSign: "Team Sathya Stores",
  unsubscribeText: "Unsubscribe from wishlist emails for this product",
  needHelpTitle: "Need Help?",
  needHelpItems: [
    {
      icon: "",
      iconUrl: "",
      label: "Call Us",
      value: "0422 422 4866",
    },
    {
      icon: "",
      iconUrl: "",
      label: "WhatsApp Us",
      value: "Chat with us",
    },
    {
      icon: "",
      iconUrl: "",
      label: "Email Us",
      value: "support@sathya.store",
    },
  ],
};

export function mergeEmailContent(stored) {
  const base = JSON.parse(JSON.stringify(DEFAULT_WISHLIST_MAIL_EMAIL_CONTENT));
  if (!stored || typeof stored !== "object") return base;

  if (stored.logoUrl != null) base.logoUrl = String(stored.logoUrl);
  if (stored.headline) base.headline = stored.headline;
  if (stored.introTemplate) base.introTemplate = stored.introTemplate;
  if (stored.urgentText != null) base.urgentText = stored.urgentText;
  if (stored.wishlistButtonText) base.wishlistButtonText = stored.wishlistButtonText;
  if (stored.productLinkText) base.productLinkText = stored.productLinkText;
  if (stored.closingLine) base.closingLine = stored.closingLine;
  if (stored.teamSign) base.teamSign = stored.teamSign;
  if (stored.unsubscribeText) base.unsubscribeText = stored.unsubscribeText;
  if (stored.needHelpTitle) base.needHelpTitle = stored.needHelpTitle;
  if (stored.footerPromiseTitle) base.footerPromiseTitle = stored.footerPromiseTitle;

  if (Array.isArray(stored.topBannerItems) && stored.topBannerItems.length) {
    base.topBannerItems = stored.topBannerItems.map((row) => ({
      icon: row?.icon ?? "",
      iconUrl: row?.iconUrl ?? "",
      label: row?.label ?? "",
    }));
  }
  if (Array.isArray(stored.footerPromiseItems) && stored.footerPromiseItems.length) {
    base.footerPromiseItems = stored.footerPromiseItems.map((row) => ({
      label: row?.label ?? "",
    }));
  }
  if (Array.isArray(stored.needHelpItems) && stored.needHelpItems.length) {
    base.needHelpItems = stored.needHelpItems.map((row) => ({
      icon: row?.icon ?? "",
      iconUrl: row?.iconUrl ?? "",
      label: row?.label ?? "",
      value: row?.value ?? "",
    }));
  }

  return base;
}
