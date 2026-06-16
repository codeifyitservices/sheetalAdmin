const BASE_URL = "http://localhost:8000/api/v1";

const testCases = [
  { query: "suit", description: "Exact match" },
  { query: "zya", description: "Short typo (3 chars) - Should match Ziya" },
  { query: "ziy", description: "Partial word" },
  { query: "sut set", description: "Typo in middle (Sut -> Suit)" },
  { query: "embroiderd", description: 'Typo (missing "e")' },
  { query: "ziya suti", description: "Multiple words with typo" },
  { query: "red suit", description: "Color + Category" },
  { query: "nonexistentproduct123", description: "Zero results case" },
];

async function runSearchStressTest() {
  console.log("--- STARTING SEARCH FUZZY & STRESS TEST ---");
  const results = [];

  for (const test of testCases) {
    try {
      const startTime = Date.now();
      const res = await fetch(
        `${BASE_URL}/products/all?search=${encodeURIComponent(test.query)}&limit=5`,
      );
      const data = await res.json();
      const duration = Date.now() - startTime;

      if (data.success) {
        const products = data.products || [];
        const foundNames = products.map((p) => p.name).join(", ");
        results.push({
          Query: test.query,
          Description: test.description,
          Count: products.length,
          Top_Results:
            foundNames.substring(0, 50) + (foundNames.length > 50 ? "..." : ""),
          Time_ms: duration,
          Status:
            products.length > 0
              ? "✅"
              : test.query === "nonexistentproduct123"
                ? "✅"
                : "❌",
        });
      } else {
        results.push({
          Query: test.query,
          Description: test.description,
          Status: "ERROR",
          message: data.message,
        });
      }
    } catch (error) {
      results.push({
        Query: test.query,
        Description: test.description,
        Status: "FAILED",
        message: error.message,
      });
    }
  }

  console.table(results);
  console.log("\n--- TEST SUMMARY ---");
  const passed = results.filter((r) => r.Status === "✅").length;
  console.log(
    `Total: ${testCases.length}, Passed: ${passed}, Failed: ${testCases.length - passed}`,
  );
}

runSearchStressTest();
