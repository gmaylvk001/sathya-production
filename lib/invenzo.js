import { isEnvOn, readEnv } from "@/lib/lspPriceCron";

/**
 * Invenzo / Izoleap API client (Exist InvensoServices).
 * Master switch: invenso_service_on=on|off (missing = off)
 */

export function isInvenzoServiceEnabled() {
  return isEnvOn("invenso_service_on");
}

/** Strip accidental wrapping quotes from .env values (e.g. AUTH_KEY="..."). */
function cleanEnvValue(value) {
  let v = String(value ?? "").trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

function getClientId() {
  return cleanEnvValue(readEnv("INVENZO_CLIENT_ID") || "sathyastore");
}

function getAuthKey() {
  return cleanEnvValue(readEnv("INVENZO_AUTH_KEY") || "");
}

function getBaseUrl() {
  return cleanEnvValue(
    readEnv("INVENZO_API_BASE_URL") || "https://izowhizv2-s-api.izoleap.com"
  ).replace(/\/+$/, "");
}

export async function invenzoAuthTokenGenerate() {
  const authKey = getAuthKey();
  if (!authKey) {
    return { ok: false, token: null, error: "INVENZO_AUTH_KEY is missing", raw: null };
  }

  // Match Postman / Izoleap: no trailing slash on /v2/generate/auth
  const url = `${getBaseUrl()}/v2/generate/auth`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: getClientId(),
        authKey,
      }),
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    const token = json?.token || null;
    // Prefer raw Izoleap body when no token (keeps http_code / Resource Not Found in logs)
    const raw =
      json != null
        ? json
        : { http_code: res.status, status: "failure", message: "Empty auth response" };
    return {
      ok: Boolean(token),
      token,
      error: token ? null : "Failed to generate Invenzo token",
      raw,
      httpStatus: res.status,
    };
  } catch (err) {
    return {
      ok: false,
      token: null,
      error: err.message || "Invenzo auth request failed",
      raw: null,
    };
  }
}

/**
 * Exist storeCreate — Listing by branch_code, approved=1, verified=1
 */
export async function invenzoStoreCreate(storePayload, token) {
  const url = `${getBaseUrl()}/v2/store/create`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(storePayload),
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    const message = json?.message != null ? String(json.message) : "";
    const status = json?.status != null ? String(json.status) : "";
    const ok =
      status.toLowerCase() === "success" ||
      message.toLowerCase() === "store code already exists";
    return { ok, status, message, raw: json, httpStatus: res.status };
  } catch (err) {
    return {
      ok: false,
      status: "failure",
      message: err.message || "Invenzo store create failed",
      raw: null,
    };
  }
}

/** Exist placeOrder → POST /v2/job/create */
export async function invenzoPlaceOrder(orderData, token) {
  const url = `${getBaseUrl()}/v2/job/create`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    return {
      ok: res.ok,
      httpStatus: res.status,
      raw: json,
      message: json?.message || null,
    };
  } catch (err) {
    return {
      ok: false,
      httpStatus: null,
      raw: null,
      message: err.message || "Invenzo job create failed",
    };
  }
}

export function invenzoClientId() {
  return getClientId();
}
