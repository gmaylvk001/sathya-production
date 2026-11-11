export const OFFER_TIMER_STATES = [
  { label: "Tamil Nadu", value: "tamilnadu" },
  { label: "Kerala", value: "kerala" },
  { label: "Andhra Pradesh", value: "andhra" },
  { label: "Karnataka", value: "karnataka" },
  { label: "Telangana", value: "telangana" },
];

export function normalizeOfferStates(selectedStates = []) {
  const rawList = Array.isArray(selectedStates) ? selectedStates : [selectedStates];
  const picked = [
    ...new Set(
      rawList
        .flatMap((item) => (typeof item === "string" ? item.split(",") : [item]))
        .map((item) => String(item).trim().toLowerCase())
        .filter(Boolean)
    ),
  ];

  if (picked.includes("all") || picked.length === 0) {
    return { state: "all", offerViewStates: ["all"] };
  }

  const allStateValues = OFFER_TIMER_STATES.map((item) => item.value);
  const allowed = new Set(allStateValues);
  const states = picked.filter((item) => allowed.has(item));

  if (!states.length || states.length === allStateValues.length) {
    return { state: "all", offerViewStates: ["all"] };
  }

  return { state: "selected", offerViewStates: states };
}

export function formatOfferStates(states = []) {
  if (!states || !states.length || states.includes("all")) return "All";
  const map = {
    tamilnadu: "Tamil Nadu",
    kerala: "Kerala",
    andhra: "Andhra Pradesh",
    karnataka: "Karnataka",
    telangana: "Telangana",
  };
  return states.map((s) => map[s] || s).join(", ");
}

export function formatTimerDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

