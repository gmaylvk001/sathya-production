import crypto from "crypto";

/**
 * PayU Configuration for Unilet Karnataka Orders
 */
export const getPayuConfig = () => {
  const key = String(process.env.PAYU_KEY || "").trim();
  const salt = String(process.env.PAYU_SALT || "").trim();
  const baseUrl = String(process.env.PAYU_BASE_URL || "https://test.payu.in").trim().replace(/\/+$/, "");

  if (!key || !salt) {
    throw new Error("PayU is not configured. Set PAYU_KEY and PAYU_SALT in .env");
  }

  const actionUrl = `${baseUrl}/_payment`;
  const isLive = !/test\.payu\.in/i.test(baseUrl);

  return { key, salt, actionUrl, isLive };
};

/**
 * Generate SHA-512 Hash for PayU payment request
 * Formula: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
 */
export const generatePayuHash = ({
  txnid,
  amount,
  productinfo,
  firstname,
  email,
  udf1 = "",
  udf2 = "",
  udf3 = "",
  udf4 = "",
  udf5 = "",
}) => {
  const { key, salt } = getPayuConfig();

  const formattedAmount = parseFloat(amount).toFixed(2);
  const cleanProductInfo = String(productinfo || "Sathya Unilet Purchase").replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 100);
  const cleanFirstName = String(firstname || "Customer").trim();
  const cleanEmail = String(email || "customer@example.com").trim();

  const hashString = `${key}|${txnid}|${formattedAmount}|${cleanProductInfo}|${cleanFirstName}|${cleanEmail}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;

  const hash = crypto.createHash("sha512").update(hashString).digest("hex");
  return { hash, formattedAmount, cleanProductInfo, cleanFirstName, cleanEmail, key };
};

const getPayuVerifyUrl = () => {
  if (process.env.PAYU_VERIFY_URL) return String(process.env.PAYU_VERIFY_URL).trim();
  const { isLive } = getPayuConfig();
  return isLive
    ? "https://info.payu.in/merchant/postservice.php?form=2"
    : "https://test.payu.in/merchant/postservice.php?form=2";
};

/**
 * Server-to-server status lookup (PayU verify_payment).
 * Returns { status, mihpayid, amount, udf1, udf2, error_Message } or null when PayU can't be reached.
 */
export const verifyPayuTransaction = async (txnid) => {
  if (!txnid) return null;
  try {
    const { key, salt } = getPayuConfig();
    const command = "verify_payment";
    const hash = crypto.createHash("sha512").update(`${key}|${command}|${txnid}|${salt}`).digest("hex");

    const res = await fetch(getPayuVerifyUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ key, command, var1: txnid, hash }).toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    const details = data?.transaction_details?.[txnid];
    if (!details) return null;

    return {
      status: String(details.status || "").trim().toLowerCase(),
      mihpayid: details.mihpayid ? String(details.mihpayid) : "",
      amount: details.amt || details.transaction_amount || "",
      udf1: details.udf1 || "",
      udf2: details.udf2 || "",
      error_Message: details.error_Message || details.field9 || "",
    };
  } catch (err) {
    console.error("[PayU verify_payment] Failed:", err.message);
    return null;
  }
};

/**
 * Verify SHA-512 Hash returned by PayU in callback/webhook
 * If additionalCharges:
 *   sha512(additionalCharges|salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 * Else:
 *   sha512(salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 */
export const verifyPayuHash = (params) => {
  const { salt } = getPayuConfig();

  const {
    key = "",
    txnid = "",
    amount = "",
    productinfo = "",
    firstname = "",
    email = "",
    status = "",
    hash = "",
    additionalCharges = "",
    udf1 = "",
    udf2 = "",
    udf3 = "",
    udf4 = "",
    udf5 = "",
  } = params;

  let hashSequence = "";
  if (additionalCharges) {
    hashSequence = `${additionalCharges}|${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  } else {
    hashSequence = `${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  }

  const computedHash = crypto
    .createHash("sha512")
    .update(hashSequence)
    .digest("hex")
    .toLowerCase();

  const isValid = computedHash === String(hash || "").toLowerCase();
  return { isValid, computedHash, receivedHash: hash };
};
