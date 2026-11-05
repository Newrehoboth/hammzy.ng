import fs from 'fs';

// Read the complete prices-info JSON from content.md
const content = fs.readFileSync('/Users/user/.gemini/antigravity-ide/brain/6d4da699-f64d-4cd3-9057-36a4ee559f91/.system_generated/steps/3705/content.md', 'utf-8');
const jsonStart = content.indexOf('{');
const jsonText = content.slice(jsonStart);
const getatextData = JSON.parse(jsonText);
const realPrices = getatextData.prices; // Array of { service_name, api_name, price, stock, multiple_sms, ttl }

console.log("Real GetAText services fetched:", realPrices.length);

// Read current getatext.server.ts fallback services
const serverFile = fs.readFileSync('src/lib/api/getatext.server.ts', 'utf-8');
const match = serverFile.match(/export const GETATEXT_FALLBACK_SERVICES: GetatextService\[\] = \[([\s\S]+?)\];/);

if (!match) {
  console.error("Could not find GETATEXT_FALLBACK_SERVICES in getatext.server.ts");
  process.exit(1);
}

// Let's build a map of real services by service_name (lowercased/trimmed) and api_name (lowercased)
const realByName = new Map();
const realBySlug = new Map();

realPrices.forEach(p => {
  const nameKey = p.service_name.toLowerCase().replace(/[^a-z0-9]/g, '');
  realByName.set(nameKey, p);
  realBySlug.set(p.api_name.toLowerCase(), p);
});

// We want to generate a new fallback list matching the real slugs and prices from getatext.com!
// Since we have the full real list of 250+ services directly from getatext.com, let's just use the real services list itself!
// Why use a static fallback list with old items when we can use the actual live services list formatted cleanly?
// Let's generate a clean TypeScript array of all active services directly from the real prices-info!

const formattedServices = realPrices.map(p => {
  return `  { service_name: ${JSON.stringify(p.service_name)}, api_name: ${JSON.stringify(p.api_name)}, price: ${JSON.stringify(String(p.price))}, stock: ${p.stock}, ttl: ${p.ttl ?? 10}, multiple_sms: ${JSON.stringify(String(p.multiple_sms ?? false))} }`;
});

const newArrayContent = `export const GETATEXT_FALLBACK_SERVICES: GetatextService[] = [\n${formattedServices.join(',\n')}\n];`;

console.log("Generated fallback services count:", realPrices.length);
fs.writeFileSync('scratch/new_fallback_services.ts', newArrayContent);
console.log("Saved new fallback services to scratch/new_fallback_services.ts");
