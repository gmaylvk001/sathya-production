/**
 * Cancel-order SMS only (Laravel SMSHelper::send_sms style).
 * Kept separate from lib/sms.js so OTP login is unchanged.
 */

function normalizeTenDigitMobile(mobile) {
  const rawDigits = String(mobile || "").replace(/\D/g, "");
  const tenDigits = rawDigits.slice(-10);
  if (!tenDigits || tenDigits.length !== 10 || !/^[6-9][0-9]{9}$/.test(tenDigits)) {
    return null;
  }
  return tenDigits;
}

/**
 * Pass plain text or already urlencoded text; templateId = DLT content id / tmpid.
 */
export async function sendCancelSms(smstext, mobile, templateId) {
  try {
    const tenDigits = normalizeTenDigitMobile(mobile);
    if (!tenDigits) {
      throw new Error(`Invalid Indian mobile number format: ${mobile}`);
    }

    const rawText = String(smstext || "");
    const encodedText = rawText.includes("%") ? rawText : encodeURIComponent(rawText);
    const robeetaText = encodedText.replace(/%20/g, "+");

    let cerfSuccess = false;
    let cerfResponse = "";
    let robeetaSuccess = false;
    let robeetaResponse = "";

    try {
      const cerfHeader = process.env.SMS_API_HEADER;
      const cerfToken = process.env.SMS_API_TOKEN;
      if (cerfHeader && cerfToken && templateId) {
        const cerfUrl = `https://cerf.cerfgs.com/cpaas?unicode=false&from=${cerfHeader}&to=91${tenDigits}&dltContentId=${templateId}&text=${encodedText}&token=${cerfToken}`;
        const cerfRes = await fetch(cerfUrl, {
          method: "GET",
          headers: { Accept: "*/*" },
          signal: AbortSignal.timeout(8000),
        });
        const cerfJson = await cerfRes.json();
        cerfSuccess =
          cerfRes.ok &&
          (cerfJson.statusCode === 200 || cerfJson.state === "SUBMIT_ACCEPTED");
        cerfResponse = JSON.stringify(cerfJson);
      }
    } catch (cerfErr) {
      console.error("[CERF Cancel SMS Error]:", cerfErr.message);
      cerfResponse = cerfErr.message;
    }

    try {
      const apiKey = process.env.ROBEETA_SMS_API_KEY;
      const sid = process.env.ROBEETA_SMS_SID || "SATHYA";
      if (!apiKey || !templateId) {
        throw new Error("Robeeta SMS credentials not configured (ROBEETA_SMS_API_KEY + template id)");
      }
      const robeetaUrl = `https://api.msg4.cloud.robeeta.com/sms.aspx?apikey=${apiKey}&tmpid=${templateId}&sid=${sid}&to=${tenDigits}&msg=${robeetaText}`;
      const res = await fetch(robeetaUrl, {
        method: "GET",
        headers: { Accept: "*/*" },
        signal: AbortSignal.timeout(8000),
      });
      robeetaResponse = await res.text();
      robeetaSuccess = res.ok && !robeetaResponse.toUpperCase().includes("<STATUS>ERROR");
    } catch (robeetaErr) {
      console.error("[Robeeta Cancel SMS Error]:", robeetaErr.message);
      robeetaResponse = robeetaErr.message;
    }

    return {
      success: cerfSuccess || robeetaSuccess,
      cerf: { success: cerfSuccess, response: cerfResponse },
      robeeta: { success: robeetaSuccess, response: robeetaResponse },
      response: cerfResponse || robeetaResponse,
    };
  } catch (error) {
    console.error("[Cancel SMS Gateway Error]:", error);
    return { success: false, error: error.message };
  }
}
