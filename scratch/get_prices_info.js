import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) acc[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

async function main() {
  const apiKey = env.GETATEXT_API_KEY || "94801bd075eae6f1ab7d092504e";
  try {
    const res = await fetch("https://getatext.com/api/v1/prices-info", {
      method: "GET",
      headers: {
        Auth: apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    console.log("Status:", res.status);
    
    // Save all api_names and service_names to a JSON file
    const services = data.prices.map(p => ({
      service_name: p.service_name,
      api_name: p.api_name,
      price: p.price,
      stock: p.stock
    }));

    fs.writeFileSync('scratch/getatext_real_services.json', JSON.stringify(services, null, 2));
    console.log(`Successfully fetched and saved ${services.length} services to scratch/getatext_real_services.json`);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main();
