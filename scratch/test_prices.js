import fetch from "node:fetch";

const API_KEY = "94801bd075eae6f1ab7d092504e";

async function testPrices() {
  const start = Date.now();
  console.log("Fetching /prices-info from GetAText...");
  try {
    const res = await fetch("https://getatext.com/api/v1/prices-info", {
      method: "GET",
      headers: {
        "Auth": API_KEY,
        "Content-Type": "application/json"
      }
    });
    console.log("Response status:", res.status);
    const text = await res.text();
    console.log("Response body length:", text.length);
    const data = JSON.parse(text);
    console.log("Parsed keys:", Object.keys(data));
    const services = Array.isArray(data) ? data : (data.services || []);
    console.log("Services array length:", services.length);
    console.log("First 3 services:", JSON.stringify(services.slice(0, 3), null, 2));
    console.log("Time taken (ms):", Date.now() - start);
  } catch (err) {
    console.error("Error:", err);
  }
}

testPrices();
