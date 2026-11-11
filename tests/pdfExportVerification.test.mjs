import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const SECRET = process.env.JWT_SECRET || "sathya_ecom_secret_key";

// Generate a valid mock user token
const testUser = {
  userId: "64f123456789abcdef012345",
  email: "customer@sathya.store",
  name: "Sathya Customer",
  role: "user",
};
const validToken = jwt.sign(testUser, SECRET, { expiresIn: "1h" });

async function runTests() {
  console.log("=== STARTING PDF EXPORT VERIFICATION SUITE ===");
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Auth Guard Test - Unauthenticated Request
  try {
    console.log("\n[Test 1] Testing Auth Guard on /api/deals-offer/pdf (Unauthenticated)...");
    const unauthRes = await fetch(`${BASE_URL}/api/deals-offer/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    assert(
      unauthRes.status === 401,
      `Unauthenticated POST rejected with 401 (got ${unauthRes.status})`
    );

    const unauthJson = await unauthRes.json();
    assert(
      unauthJson?.status === 0 || unauthJson?.error,
      `Unauthenticated response includes error: "${unauthJson?.error}"`
    );
  } catch (err) {
    console.error("Test 1 error:", err.message);
    failed++;
  }

  // 2. Deals PDF Generation with Authenticated Token
  let generatedFileName = null;
  try {
    console.log("\n[Test 2] Testing Authenticated PDF Generation on /api/deals-offer/pdf...");
    const samplePayload = {
      sections: [
        {
          title: "TV & ACCESSORIES",
          products: [
            {
              name: "Xiaomi 43 QLED TV X Pro (4K UHD Smart Google TV)",
              price: 32999,
              special_price: 26999,
              quantity: 15,
              stock_status: "In Stock",
              brand: "Xiaomi",
            },
            {
              name: "Samsung 55 Crystal 4K Vivid Ultra HD Smart TV",
              price: 49900,
              special_price: 39990,
              quantity: 8,
              stock_status: "In Stock",
              brand: "Samsung",
            },
          ],
        },
        {
          title: "APPLIANCES",
          products: [
            {
              name: "LG 7.5 Kg 5 Star Smart Inverter Washing Machine",
              price: 24990,
              special_price: 18490,
              quantity: 12,
              stock_status: "In Stock",
              brand: "LG",
            },
          ],
        },
      ],
      activeTimer: {
        offerTitle: "DIWALI & DHANTERAS MEGA DEALS",
      },
    };

    const authRes = await fetch(`${BASE_URL}/api/deals-offer/pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify(samplePayload),
    });

    assert(authRes.status === 200, `POST /api/deals-offer/pdf returns 200 (got ${authRes.status})`);

    const authJson = await authRes.json();
    console.log("Response payload:", authJson);

    assert(authJson.status === 1, "Response contains status: 1");
    assert(
      Boolean(authJson.file_name && /^[0-9]{4}\.pdf$/.test(authJson.file_name)),
      `file_name is 4-digit random pdf: "${authJson.file_name}"`
    );

    generatedFileName = authJson.file_name;

    // Check physical file on disk in public/php-excel-export/
    const diskPath = path.join(process.cwd(), "public", "php-excel-export", generatedFileName);
    assert(fs.existsSync(diskPath), `Physical file exists at: public/php-excel-export/${generatedFileName}`);

    const fileBuffer = fs.readFileSync(diskPath);
    assert(fileBuffer.length > 500, `PDF size is valid (${fileBuffer.length} bytes)`);

    const headerStr = fileBuffer.subarray(0, 5).toString("utf-8");
    assert(headerStr === "%PDF-", `File is a valid PDF (header: ${headerStr})`);
  } catch (err) {
    console.error("Test 2 error:", err.message);
    failed++;
  }

  // 3. Dynamic PDF Serving Route Test: /php-excel-export/[filename]
  if (generatedFileName) {
    try {
      console.log(`\n[Test 3] Testing dynamic PDF serving at /php-excel-export/${generatedFileName}...`);
      const getRes = await fetch(`${BASE_URL}/php-excel-export/${generatedFileName}`);

      assert(getRes.status === 200, `GET /php-excel-export/${generatedFileName} returns 200`);

      const contentType = getRes.headers.get("content-type");
      assert(
        contentType && contentType.includes("application/pdf"),
        `Content-Type is application/pdf (got "${contentType}")`
      );

      const arrayBuf = await getRes.arrayBuffer();
      assert(arrayBuf.byteLength > 500, `Downloaded file size is valid (${arrayBuf.byteLength} bytes)`);
    } catch (err) {
      console.error("Test 3 error:", err.message);
      failed++;
    }
  }

  // 4. Test Unified PDF Export Endpoint: /api/pdf-export
  try {
    console.log("\n[Test 4] Testing Unified /api/pdf-export (category mode)...");
    const catRes = await fetch(`${BASE_URL}/api/pdf-export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        type: "category",
        title: "SMART TELEVISIONS",
      }),
    });

    assert(catRes.status === 200, `POST /api/pdf-export returns 200 (got ${catRes.status})`);
    const catJson = await catRes.json();
    console.log("Category export payload:", catJson);

    assert(catJson.status === 1, "Category export status is 1");
    assert(
      Boolean(catJson.file_name && /^[0-9]{4}\.pdf$/.test(catJson.file_name)),
      `Category export file_name is valid: "${catJson.file_name}"`
    );

    const catDiskPath = path.join(process.cwd(), "public", "php-excel-export", catJson.file_name);
    assert(fs.existsSync(catDiskPath), `Category PDF exists at: public/php-excel-export/${catJson.file_name}`);
  } catch (err) {
    console.error("Test 4 error:", err.message);
    failed++;
  }

  console.log(`\n=== SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
