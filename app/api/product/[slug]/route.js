import { getProductData } from "@/lib/productFetcher";
import { normalizeRegion, isKarnatakaPincode } from "@/lib/regionHelper";

export async function GET(request, context) {
  const { params } = await context;
  const { slug } = await params;

  if (!slug) {
    return new Response(JSON.stringify({ message: "Missing product slug" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const url = request?.url ? new URL(request.url) : null;
    const qPincode = url?.searchParams.get("pincode");
    const qRegion = url?.searchParams.get("region") || url?.searchParams.get("state");
    const cookieLoc = request.cookies?.get("sathya_location")?.value;

    let cookieParsed = null;
    if (cookieLoc) {
      try {
        const decoded = cookieLoc.startsWith("%") ? decodeURIComponent(cookieLoc) : cookieLoc;
        cookieParsed = JSON.parse(decoded);
      } catch {}
    }

    const effectivePin = String(qPincode || cookieParsed?.pincode || "").replace(/\D/g, "").trim();
    const effectiveState = cookieParsed?.stateName || cookieParsed?.state || "";
    const isKarnataka =
      isKarnatakaPincode(effectivePin) ||
      /karnataka/i.test(String(effectiveState)) ||
      normalizeRegion(qRegion || cookieParsed?.region) === "karnataka";

    const region = isKarnataka
      ? "karnataka"
      : normalizeRegion(qRegion || cookieParsed?.region || effectiveState || "tamilnadu");

    const responseProduct = await getProductData(slug, region);

    if (!responseProduct) {
      return new Response(
        JSON.stringify({ message: "Product not found or inactive" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    return new Response(JSON.stringify(responseProduct), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, sathya_location",
      "Access-Control-Max-Age": "86400",
    },
  });
}
