import dbConnect from "@/lib/db";
import InvensoResponseResult from "@/models/invenso_response_result";

/**
 * Persist full Invenzo API response JSON for each call.
 * Never throws — logging must not break the main flow.
 */
export async function saveInvensoResponseResult({
  user_id = null,
  order_number = null,
  call_type = null,
  response = null,
} = {}) {
  try {
    await dbConnect();

    let responseValue = response;
    if (responseValue !== null && typeof responseValue === "string") {
      try {
        responseValue = JSON.parse(responseValue);
      } catch {
        // keep raw string
      }
    }

    await InvensoResponseResult.create({
      user_id: user_id != null && String(user_id).trim() !== "" ? String(user_id) : null,
      order_number:
        order_number != null && String(order_number).trim() !== ""
          ? String(order_number).trim()
          : null,
      call_type: call_type != null ? String(call_type).trim() : null,
      response: responseValue,
    });
  } catch (err) {
    console.error("invenso_response_result save error:", err?.message || err);
  }
}
