/**
 * Utility for sending SMS OTP via dual gateways:
 * 1. CERF CPaaS Gateway
 * 2. Robeeta SMS Gateway
 *
 * All credentials are read from environment variables (.env).
 */

export async function sendRobeetaOtp(mobile, otp) {
  try {
    // Extract clean 10-digit Indian mobile number
    const rawDigits = String(mobile).replace(/\D/g, "");
    const tenDigits = rawDigits.slice(-10);

    if (!tenDigits || tenDigits.length !== 10 || !/^[6-9][0-9]{9}$/.test(tenDigits)) {
      throw new Error(`Invalid Indian mobile number format: ${mobile}`);
    }

    // Exact PHP DLT template: urlencode('Your OTP '.$otp.' is your SATHYA verification code.')
    const rawText = `Your OTP ${otp} is your SATHYA verification code.`;

    // Standard URL-encode with %20 for spaces (required by CERF CPaaS)
    const cerfText = encodeURIComponent(rawText);
    // PHP urlencode with + for spaces (used by Robeeta ASP.NET)
    const robeetaText = encodeURIComponent(rawText).replace(/%20/g, "+");

    let cerfSuccess = false;
    let cerfResponse = "";
    let robeetaSuccess = false;
    let robeetaResponse = "";

    // 1. CERF CPaaS Gateway
    try {
      const cerfHeader = process.env.SMS_API_HEADER;
      const cerfToken = process.env.SMS_API_TOKEN;
      const dltContentId = process.env.SMS_DLT_CONTENT_ID;

      if (!cerfHeader || !cerfToken || !dltContentId) {
        throw new Error("CERF SMS credentials not configured in .env (SMS_API_HEADER, SMS_API_TOKEN, SMS_DLT_CONTENT_ID)");
      }

      const cerfUrl = `https://cerf.cerfgs.com/cpaas?unicode=false&from=${cerfHeader}&to=91${tenDigits}&dltContentId=${dltContentId}&text=${cerfText}&token=${cerfToken}`;
      console.log(`[CERF SMS] Sending OTP to 91${tenDigits}...`);

      const cerfRes = await fetch(cerfUrl, {
        method: "GET",
        headers: { Accept: "*/*" },
      });
      const cerfJson = await cerfRes.json();
      console.log(`[CERF SMS Response for 91${tenDigits}]:`, cerfJson);

      cerfSuccess =
        cerfRes.ok &&
        (cerfJson.statusCode === 200 || cerfJson.state === "SUBMIT_ACCEPTED");
      cerfResponse = JSON.stringify(cerfJson);
    } catch (cerfErr) {
      console.error("[CERF SMS Error]:", cerfErr.message);
      cerfResponse = cerfErr.message;
    }

    // 2. Robeeta SMS Gateway
    try {
      const apiKey = process.env.ROBEETA_SMS_API_KEY;
      const tmpId = process.env.ROBEETA_SMS_TMPID;
      const sid = process.env.ROBEETA_SMS_SID;

      if (!apiKey || !tmpId || !sid) {
        throw new Error("Robeeta SMS credentials not configured in .env (ROBEETA_SMS_API_KEY, ROBEETA_SMS_TMPID, ROBEETA_SMS_SID)");
      }

      const robeetaUrl = `https://api.msg4.cloud.robeeta.com/sms.aspx?apikey=${apiKey}&tmpid=${tmpId}&sid=${sid}&to=${tenDigits}&msg=${robeetaText}`;
      console.log(`[Robeeta SMS] Sending OTP to ${tenDigits}...`);

      const res = await fetch(robeetaUrl, {
        method: "GET",
        headers: { Accept: "*/*" },
      });
      robeetaResponse = await res.text();
      console.log(`[Robeeta SMS Response for ${tenDigits}]:`, robeetaResponse);

      robeetaSuccess = res.ok && !robeetaResponse.toUpperCase().includes("<STATUS>ERROR");
    } catch (robeetaErr) {
      console.error("[Robeeta SMS Error]:", robeetaErr.message);
      robeetaResponse = robeetaErr.message;
    }

    const overallSuccess = cerfSuccess || robeetaSuccess;

    return {
      success: overallSuccess,
      cerf: { success: cerfSuccess, response: cerfResponse },
      robeeta: { success: robeetaSuccess, response: robeetaResponse },
      response: cerfResponse || robeetaResponse,
    };
  } catch (error) {
    console.error("[SMS Gateway Error]:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
