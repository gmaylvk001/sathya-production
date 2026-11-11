/**
 * Super Offers contact panel — state-wise helpline numbers (hardcoded, one place).
 * Unknown / missing state → Tamil Nadu default.
 */

export const SUPER_OFFER_DEFAULT_STATE = "tamilnadu";

export const SUPER_OFFER_CONTACT_BY_STATE = {
  tamilnadu: {
    id: "tamilnadu",
    label: "Tamil Nadu",
    phoneDisplay: "+91 88805 98985",
    phoneTel: "+918880598985",
  },
  kerala: {
    id: "kerala",
    label: "Kerala",
    phoneDisplay: "+91 73057 92985",
    phoneTel: "+917305792985",
  },
  andhra: {
    id: "andhra",
    label: "Andhra",
    phoneDisplay: "+91 99949 96985",
    phoneTel: "+919994996985",
  },
  telangana: {
    id: "telangana",
    label: "Telangana",
    phoneDisplay: "+91 99949 96985",
    phoneTel: "+919994996985",
  },
  karnataka: {
    id: "karnataka",
    label: "Karnataka",
    phoneDisplay: "+91 92435 85858",
    phoneTel: "+919243585858",
  },
};

/** Slug / alias → canonical state id used in SUPER_OFFER_CONTACT_BY_STATE */
const STATE_ALIASES = {
  tamilnadu: "tamilnadu",
  tn: "tamilnadu",
  tamil: "tamilnadu",
  kerala: "kerala",
  kl: "kerala",
  andhra: "andhra",
  andhrapradesh: "andhra",
  ap: "andhra",
  telangana: "telangana",
  ts: "telangana",
  tg: "telangana",
  karnataka: "karnataka",
  ka: "karnataka",
};

function normalizeStateKey(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Resolve contact config for a URL/region slug. Defaults to Tamil Nadu.
 */
export function getSuperOfferContactForState(stateRaw) {
  const key = normalizeStateKey(stateRaw);
  const mapped = STATE_ALIASES[key] || key;
  return (
    SUPER_OFFER_CONTACT_BY_STATE[mapped] ||
    SUPER_OFFER_CONTACT_BY_STATE[SUPER_OFFER_DEFAULT_STATE]
  );
}

export const SUPER_OFFER_CONTACT_EMAIL = "info@sathya.store";

export const SUPER_OFFER_CONTACT_SOCIAL = {
  facebook: "https://www.facebook.com/sathyastores",
  twitter: "https://twitter.com/sathyastores",
  instagram: "https://www.instagram.com/sathyastores",
  whatsapp: "https://wa.me/918880598985",
};
