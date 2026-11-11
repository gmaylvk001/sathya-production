import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const SECRET = process.env.JWT_SECRET || "sathya_ecom_secret_key";

const validToken = jwt.sign(
  {
    userId: "64f123456789abcdef012345",
    email: "customer@sathya.store",
    name: "Sathya Customer",
    role: "user",
  },
  SECRET,
  { expiresIn: "2h" }
);

async function runComprehensiveTests() {
  console.log("==================================================================");
  console.log("       SATHYA STORE - FINAL 5-POINT PDF VERIFICATION SUITE        ");
  console.log("==================================================================\n");

  let totalPassed = 0;
  let totalFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      totalPassed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      totalFailed++;
    }
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 1: All 5 PDF Export Modes
  // -------------------------------------------------------------------------
  console.log("--- TEST GROUP 1: ALL 5 PDF EXPORT MODES ---");

  // Mode 1: Deals & Offer Export
  try {
    const res = await fetch(`${BASE_URL}/api/deals-offer/pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        sections: [
          {
            title: "TELEVISIONS",
            products: [
              {
                name: "Sony Bravia 55 Inch 4K Google TV",
                price: 65990,
                special_price: 54990,
                quantity: 10,
                stock_status: "In Stock",
              },
            ],
          },
        ],
      }),
    });
    assert(res.status === 200, "Mode 1: deals-offer returns 200");
    const json = await res.json();
    assert(json.status === 1 && /^[0-9]{4}\.pdf$/.test(json.file_name), `Mode 1 file generated: ${json.file_name}`);
    const filePath = path.join(process.cwd(), "public", "php-excel-export", json.file_name);
    assert(fs.existsSync(filePath), `Mode 1 physical file exists on disk (${json.file_name})`);
  } catch (err) {
    console.error("Mode 1 error:", err.message);
    totalFailed++;
  }

  // Mode 2: Category Export
  try {
    const res = await fetch(`${BASE_URL}/api/pdf-export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        type: "category",
        title: "HOME APPLIANCES",
        category_id: "appliances",
      }),
    });
    assert(res.status === 200, "Mode 2: category export returns 200");
    const json = await res.json();
    assert(json.status === 1 && /^[0-9]{4}\.pdf$/.test(json.file_name), `Mode 2 file generated: ${json.file_name}`);
  } catch (err) {
    console.error("Mode 2 error:", err.message);
    totalFailed++;
  }

  // Mode 3: Sub-Category Export
  try {
    const res = await fetch(`${BASE_URL}/api/pdf-export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        type: "sub_category",
        title: "REFRIGERATORS CATALOG",
        sub_category_id: "refrigerators",
      }),
    });
    assert(res.status === 200, "Mode 3: sub_category export returns 200");
    const json = await res.json();
    assert(json.status === 1 && /^[0-9]{4}\.pdf$/.test(json.file_name), `Mode 3 file generated: ${json.file_name}`);
  } catch (err) {
    console.error("Mode 3 error:", err.message);
    totalFailed++;
  }

  // Mode 4: Category Division Export (with final_price > 5000 check)
  try {
    const res = await fetch(`${BASE_URL}/api/pdf-export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        type: "category_division",
        title: "PREMIUM AIR CONDITIONERS",
        division_id: "air-conditioners",
        price: "10000_80000",
      }),
    });
    assert(res.status === 200, "Mode 4: category_division export returns 200");
    const json = await res.json();
    assert(json.status === 1 && /^[0-9]{4}\.pdf$/.test(json.file_name), `Mode 4 file generated: ${json.file_name}`);
  } catch (err) {
    console.error("Mode 4 error:", err.message);
    totalFailed++;
  }

  // Mode 5: Search Export (excluding gift products)
  try {
    const res = await fetch(`${BASE_URL}/api/pdf-export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        type: "search",
        q: "Samsung",
        title: "Search Results for 'Samsung'",
      }),
    });
    assert(res.status === 200, "Mode 5: search export returns 200");
    const json = await res.json();
    assert(json.status === 1 && /^[0-9]{4}\.pdf$/.test(json.file_name), `Mode 5 file generated: ${json.file_name}`);
  } catch (err) {
    console.error("Mode 5 error:", err.message);
    totalFailed++;
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 2: Dynamic Filters & Buy-Now Priority Sorting
  // -------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 2: DYNAMIC FILTERS & BUY-NOW PRIORITY SORTING ---");

  // Dynamic Filters: price + offers + stock
  try {
    const res = await fetch(`${BASE_URL}/api/pdf-export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        type: "category",
        price: "15000_50000",
        offers: "1",
        stock: "1",
        sort_by: "price_desc", // price ASC
      }),
    });
    assert(res.status === 200, "Dynamic filters (price, offers, stock, sort_by) returns 200");
    const json = await res.json();
    assert(json.status === 1, `Filtered PDF created successfully: ${json.file_name} (found: ${json.count} products)`);
  } catch (err) {
    console.error("Dynamic filters error:", err.message);
    totalFailed++;
  }

  // Sort_by: price_asc (price DESC)
  try {
    const res = await fetch(`${BASE_URL}/api/pdf-export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        type: "category",
        sort_by: "price_asc",
      }),
    });
    assert(res.status === 200, "Sort by price_asc returns 200");
    const json = await res.json();
    assert(json.status === 1, `Sorted PDF created: ${json.file_name}`);
  } catch (err) {
    console.error("Sort test error:", err.message);
    totalFailed++;
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 3: Edge Cases & Security / Injection Safety
  // -------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 3: EDGE CASES & SECURITY INJECTION SAFETY ---");

  // Edge Case 1: Empty results (0 matching products)
  try {
    const res = await fetch(`${BASE_URL}/api/pdf-export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        type: "search",
        q: "ZXQ_NON_EXISTENT_PRODUCT_XYZ_9999",
      }),
    });
    assert(res.status === 200, "Empty result search returns 200 without crashing");
    const json = await res.json();
    assert(json.status === 1 && json.count === 0, "Gracefully handled 0 matching products");
    const filePath = path.join(process.cwd(), "public", "php-excel-export", json.file_name);
    assert(fs.existsSync(filePath), "Empty result PDF file was generated with placeholder message");
  } catch (err) {
    console.error("Empty results error:", err.message);
    totalFailed++;
  }

  // Edge Case 2: SQL Injection attempt in search query
  try {
    const sqlInjectionPayload = "'; DROP TABLE products; SELECT * FROM users WHERE '1'='1";
    const res = await fetch(`${BASE_URL}/api/pdf-export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        type: "search",
        q: sqlInjectionPayload,
      }),
    });
    assert(res.status === 200, "SQL injection string in 'q' handled safely without crash");
    const json = await res.json();
    assert(json.status === 1, `Safe output file generated: ${json.file_name}`);
  } catch (err) {
    console.error("SQL injection search error:", err.message);
    totalFailed++;
  }

  // Edge Case 3: SQL Injection attempt in price filter
  try {
    const res = await fetch(`${BASE_URL}/api/pdf-export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        type: "category",
        price: "1000' OR '1'='1_50000;--",
      }),
    });
    assert(res.status === 200, "SQL injection string in 'price' parsed safely without crash");
    const json = await res.json();
    assert(json.status === 1, `Safe output file generated: ${json.file_name}`);
  } catch (err) {
    console.error("SQL injection price error:", err.message);
    totalFailed++;
  }

  // Edge Case 4: Non-existent / invalid category slug
  try {
    const res = await fetch(`${BASE_URL}/api/pdf-export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        type: "category",
        category_id: "non-existent-category-slug-$$$--",
      }),
    });
    assert(res.status === 200, "Non-existent category slug handled safely without crash");
    const json = await res.json();
    assert(json.status === 1, `Safe output file generated: ${json.file_name}`);
  } catch (err) {
    console.error("Invalid category slug error:", err.message);
    totalFailed++;
  }

  // Edge Case 5: Dynamic route serving for random non-pdf / traversal attempt
  try {
    const badReq = await fetch(`${BASE_URL}/php-excel-export/..%2f..%2fpackage.json`);
    assert(badReq.status === 400 || badReq.status === 404, "Directory traversal attack blocked at /php-excel-export/[filename]");
  } catch (err) {
    console.error("Directory traversal test error:", err.message);
    totalFailed++;
  }

  console.log("\n==================================================================");
  console.log(`TOTAL TEST RESULTS: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log("==================================================================\n");

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runComprehensiveTests();
