export async function GET() {
  const gifBase64 = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  const buffer = Buffer.from(gifBase64, "base64");
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
