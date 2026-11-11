/**
 * Nexus AdTurbo inbound lead client (UAT).
 *
 * Standalone module. Do not import this from routes, pages, or other services
 * until a later integration is requested. Credentials are hardcoded on purpose.
 *
 * Nexus APIs covered:
 *   POST /api/inboundleads/adturbo          create 1 to 50 leads
 *   GET  /api/inboundleads/adturbo?reference check one lead by referenceId
 */

const NEXUS_LEAD_BASE_URL = "https://uatnexus.sathya.in/api/inboundleads/adturbo";

const NEXUS_LEAD_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhZHR1cmJvLWluYm91bmQtZ2F0ZXdheSIsImlzcyI6ImFkdHVyYm8iLCJpYXQiOjE3OTQyMjA5MjQsIm5iZiI6MTc5NDIyMDkyNCwianRpIjoiN2M1NTM0MzBkYWE2NDkwMjgyMTAxMzMyY2RiNTlhNGMiLCJjbGllbnRfY29kZSI6ImFkdHVyYm8ifQ.j-jbXoPjOk-IZrX4mBS48wrfPUN_nQmtjmOZOGbV2R4";

const MIN_LEADS = 1;
const MAX_LEADS = 50;

function authHeaders(sendJson) {
  const headers = {
    Authorization: `Bearer ${NEXUS_LEAD_TOKEN}`,
    Accept: "application/json",
  };
  if (sendJson) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

async function readNexusResponse(response) {
  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }

  const success = body && typeof body === "object" ? body.success ?? null : null;

  return {
    ok: response.ok && success !== false,
    httpStatus: response.status,
    success,
    code: body?.code ?? null,
    message: body?.message ?? null,
    data: body?.data ?? null,
    errors: body?.errors ?? null,
    traceId: body?.traceId ?? null,
    body,
  };
}

function networkFailure(error) {
  return {
    ok: false,
    httpStatus: 0,
    success: false,
    code: "network.error",
    message: error?.message || "Nexus request failed.",
    data: null,
    errors: null,
    traceId: null,
    body: null,
  };
}

/**
 * Create 1 to 50 new leads. Pass an array even for a single lead.
 * HTTP 200 means every lead was created. HTTP 207 means retry only items with created: false.
 * @param {Array<object>} leads
 */
export async function createNexusLeads(leads) {
  if (!Array.isArray(leads)) {
    throw new Error("createNexusLeads expects an array of 1 to 50 lead objects.");
  }
  if (leads.length < MIN_LEADS || leads.length > MAX_LEADS) {
    throw new Error(`createNexusLeads accepts ${MIN_LEADS} to ${MAX_LEADS} leads per call.`);
  }

  try {
    const response = await fetch(NEXUS_LEAD_BASE_URL, {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(leads),
    });
    return await readNexusResponse(response);
  } catch (error) {
    return networkFailure(error);
  }
}

/**
 * Check one lead by the referenceId returned from create (not batchId).
 * @param {string} referenceId
 */
export async function checkNexusLead(referenceId) {
  const reference = String(referenceId ?? "").trim();
  if (!reference) {
    throw new Error("checkNexusLead requires a referenceId.");
  }

  const url = `${NEXUS_LEAD_BASE_URL}?reference=${encodeURIComponent(reference)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: authHeaders(false),
    });
    return await readNexusResponse(response);
  } catch (error) {
    return networkFailure(error);
  }
}
