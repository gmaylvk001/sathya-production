export const DEALS_ROLE_SLUG = "deals-role";

export const DEALS_STATES = ["kerala", "karnataka", "andhra", "telangana", "tamilnadu"];

export function stateFromDealsEmail(email) {
  const local = String(email || "").split("@")[0].trim().toLowerCase();
  if (!local.endsWith("deals")) return "";
  const prefix = local.slice(0, -"deals".length);
  return DEALS_STATES.includes(prefix) ? prefix : "";
}

export function offerTimerContainsState(timer, stateKey) {
  if (!timer || !stateKey) return false;
  const key = String(stateKey).toLowerCase().trim();
  const values = [
    ...(Array.isArray(timer.offerViewStates) ? timer.offerViewStates : []),
    ...(Array.isArray(timer.states) ? timer.states : []),
  ];
  if (typeof timer.state === "string" && timer.state !== "selected" && timer.state !== "all") {
    values.push(timer.state);
  }
  return values.some((item) => String(item).toLowerCase().trim() === key);
}

export async function loadDealsRoleAccess() {
  const empty = { isDealsRole: false, dealsState: "" };
  if (typeof window === "undefined") return empty;
  const token = localStorage.getItem("token");
  if (!token) return empty;

  try {
    const res = await fetch("/api/auth/check", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const isDealsRole = String(data?.roleSlug || "").toLowerCase() === DEALS_ROLE_SLUG;
    return {
      isDealsRole,
      dealsState: isDealsRole ? stateFromDealsEmail(data?.email) : "",
    };
  } catch {
    return empty;
  }
}
