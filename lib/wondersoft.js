import https from "https";
import axios from "axios";

const WONDERSOFT_USERNAME = process.env.WONDERSOFT_USERNAME || "";
const WONDERSOFT_PASSWORD = process.env.WONDERSOFT_PASSWORD || "";

const WONDERSOFT_ENDPOINTS = {
  uat: {
    token: "https://sathyauatecom.com/eshopaidservice.svc/token",
    process: "https://sathyauatecom.com/eshopaidservice.svc/processdata",
  },
  production: {
    token: "https://jsastore.eshopaid.com/eShopaidAPI/eshopaidservice.svc/Token",
    process: "https://jsastore.eshopaid.com/eShopaidAPI/eshopaidservice.svc/ProcessData",
  },
};

const insecureAgent = new https.Agent({
  rejectUnauthorized: false,
});

function normalizeMode(value) {
  const mode = String(value || "")
    .trim()
    .replace(/^["']+|["';]+$/g, "")
    .toLowerCase();

  if (mode === "production" || mode === "prod") {
    return "production";
  }

  return "uat";
}

export function getWondersoftMode() {
  // Fail safe for go-live: production builds default to production ERP, not UAT
  const raw =
    process.env.WordersSoftAPiMode ||
    (process.env.NODE_ENV === "production" ? "production" : "uat");
  return normalizeMode(raw);
}

export function wondersoftApiUrl(mode = getWondersoftMode()) {
  const resolved = normalizeMode(mode);
  return WONDERSOFT_ENDPOINTS[resolved].process;
}

export function wondersoftTokenUrl(mode = getWondersoftMode()) {
  const resolved = normalizeMode(mode);
  return WONDERSOFT_ENDPOINTS[resolved].token;
}

export async function wondersoftAuthtoken(mode = getWondersoftMode()) {
  let accessToken = "failed";
  const tokenUrl = wondersoftTokenUrl(mode);

  try {
    const response = await axios.post(tokenUrl, "", {
      httpsAgent: insecureAgent,
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        SERVICE_METHODNAME: "GetToken",
        Username: WONDERSOFT_USERNAME,
        Password: WONDERSOFT_PASSWORD,
        "Content-Type": "application/json",
      },
      transformResponse: [(data) => data],
    });

    const raw = typeof response.data === "string" ? response.data : JSON.stringify(response.data || "");
    let parsed = null;

    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    if (parsed?.Response?.Result === "SUCCESS" && parsed?.Response?.Access_Token) {
      accessToken = parsed.Response.Access_Token;
    }

    return {
      ok: accessToken !== "failed",
      mode: normalizeMode(mode),
      tokenUrl,
      apiUrl: wondersoftApiUrl(mode),
      httpStatus: response.status,
      accessToken,
      result: parsed?.Response?.Result || null,
      statusMessage: parsed?.Response?.StatusMessage || null,
      raw,
    };
  } catch (error) {
    return {
      ok: false,
      mode: normalizeMode(mode),
      tokenUrl,
      apiUrl: wondersoftApiUrl(mode),
      httpStatus: error.response?.status || null,
      accessToken,
      result: "FAILURE",
      statusMessage: error.message || "Token request failed",
      raw: error.response?.data || null,
    };
  }
}

export async function wondersoftCreateSalesOrder(payload, accessToken, mode = getWondersoftMode()) {
  const apiUrl = wondersoftApiUrl(mode);
  const postdata = JSON.stringify(payload);

  try {
    const response = await axios.post(apiUrl, postdata, {
      httpsAgent: insecureAgent,
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        SERVICE_METHODNAME: "CreateSalesOrder",
        AUTHORIZATION: accessToken,
        "Content-Type": "application/json",
      },
      transformResponse: [(data) => data],
    });

    const raw = typeof response.data === "string" ? response.data : JSON.stringify(response.data || "");
    let parsed = null;

    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    const result = parsed?.Response?.Result || null;

    return {
      ok: Boolean(raw),
      mode: normalizeMode(mode),
      apiUrl,
      httpStatus: response.status,
      result,
      statusMessage: parsed?.Response?.StatusMessage || null,
      failureReason: parsed?.Response?.FailureReason || null,
      parsed,
      raw,
    };
  } catch (error) {
    return {
      ok: false,
      mode: normalizeMode(mode),
      apiUrl,
      httpStatus: error.response?.status || null,
      result: "FAILURE",
      statusMessage: error.message || "CreateSalesOrder request failed",
      failureReason: error.message || "CreateSalesOrder request failed",
      parsed: null,
      raw: error.response?.data || null,
    };
  }
}

export async function wondersoftCancelSalesOrder(payload, accessToken, mode = getWondersoftMode()) {
  const apiUrl = wondersoftApiUrl(mode);
  const postdata = JSON.stringify(payload);

  try {
    const response = await axios.post(apiUrl, postdata, {
      httpsAgent: insecureAgent,
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        SERVICE_METHODNAME: "CancelSalesOrder",
        AUTHORIZATION: accessToken,
        "Content-Type": "application/json",
      },
      transformResponse: [(data) => data],
    });

    const raw = typeof response.data === "string" ? response.data : JSON.stringify(response.data || "");
    let parsed = null;

    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    const result = parsed?.Response?.Result || null;

    return {
      ok: Boolean(raw),
      mode: normalizeMode(mode),
      apiUrl,
      httpStatus: response.status,
      result,
      statusMessage: parsed?.Response?.StatusMessage || null,
      failureReason: parsed?.Response?.FailureReason || null,
      parsed,
      raw,
    };
  } catch (error) {
    return {
      ok: false,
      mode: normalizeMode(mode),
      apiUrl,
      httpStatus: error.response?.status || null,
      result: "FAILURE",
      statusMessage: error.message || "CancelSalesOrder request failed",
      failureReason: error.message || "CancelSalesOrder request failed",
      parsed: null,
      raw: error.response?.data || null,
    };
  }
}

/**
 * Exist checkStatus → GetSalesOrderStatus
 * Body: SalesOrderStatus.Order { OrderNumber, OrderDate Ymd, OrderLocation }
 */
export async function wondersoftGetSalesOrderStatus(payload, accessToken, mode = getWondersoftMode()) {
  const apiUrl = wondersoftApiUrl(mode);
  const postdata = JSON.stringify(payload);

  try {
    const response = await axios.post(apiUrl, postdata, {
      httpsAgent: insecureAgent,
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        SERVICE_METHODNAME: "GetSalesOrderStatus",
        AUTHORIZATION: accessToken,
        "Content-Type": "application/json",
      },
      transformResponse: [(data) => data],
    });

    const raw = typeof response.data === "string" ? response.data : JSON.stringify(response.data || "");
    let parsed = null;

    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    const result = parsed?.Response?.Result || null;
    const orderStatus =
      parsed?.Response?.Data?.SalesOrderStatus?.Order?.Status ||
      parsed?.Response?.Data?.SalesOrderStatus?.Order?.status ||
      null;

    return {
      ok: Boolean(raw),
      mode: normalizeMode(mode),
      apiUrl,
      httpStatus: response.status,
      result,
      orderStatus,
      statusMessage: parsed?.Response?.StatusMessage || null,
      failureReason: parsed?.Response?.FailureReason || null,
      parsed,
      raw,
    };
  } catch (error) {
    return {
      ok: false,
      mode: normalizeMode(mode),
      apiUrl,
      httpStatus: error.response?.status || null,
      result: "FAILURE",
      orderStatus: null,
      statusMessage: error.message || "GetSalesOrderStatus request failed",
      failureReason: error.message || "GetSalesOrderStatus request failed",
      parsed: null,
      raw: error.response?.data || null,
    };
  }
}
