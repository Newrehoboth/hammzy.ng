// RakibSocials API integration for social media logs
const BASE_URL = "https://rakibsocials.com/api/v1";
const API_KEY = process.env.RAKIB_API_KEY || "keykjqsmm7du9";

interface RakibProduct {
  id: string;
  platform: string;
  category: string;
  type: string;
  price: number;
  stock: number;
  description?: string;
}

async function rakibRequest(endpoint: string, method: "GET" | "POST" = "GET", body?: any) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`[RakibSocials] ${method} ${url}`);
  
  const res = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  
  const data = await res.json();
  console.log(`[RakibSocials] Response (${res.status}):`, JSON.stringify(data).substring(0, 200));
  
  if (!res.ok) {
    throw new Error(`RakibSocials API error: ${data.error || res.statusText}`);
  }
  return data;
}

export async function listRakibProducts() {
  try {
    console.log("[RakibSocials] Fetching all products (with pagination)...");
    
    let allProducts: any[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const data = await rakibRequest(`/products?page=${page}`);
      const results = data.results || [];
      allProducts = [...allProducts, ...results];
      
      console.log(`[RakibSocials] Page ${page}: Got ${results.length} products (total so far: ${allProducts.length}/${data.count})`);
      
      // Log first product to see structure (helpful for debugging)
      if (page === 1 && results.length > 0) {
        console.log(`[RakibSocials] Sample product structure:`, JSON.stringify(results[0], null, 2));
      }
      
      // Check if there are more pages
      hasMore = allProducts.length < data.count;
      page++;
      
      // Safety limit
      if (page > 10) {
        console.warn("[RakibSocials] Stopped at page 10 to prevent infinite loop");
        break;
      }
    }
    
    console.log(`[RakibSocials] Total fetched: ${allProducts.length} products`);
    return { count: allProducts.length, results: allProducts };
  } catch (err) {
    console.error("[RakibSocials] List products error:", err);
    throw err;
  }
}

export async function getCategories() {
  try {
    const data = await rakibRequest("/categories");
    console.log(`[RakibSocials] Got ${data.count} categories`);
    return data;
  } catch (err) {
    console.error("[RakibSocials] Get categories error:", err);
    throw err;
  }
}

export async function getProductDetails(productId: string) {
  try {
    const numericId = parseInt(productId, 10);
    console.log(`[RakibSocials] Fetching details for product ${numericId}`);
    
    // Try to get product details - may include preview samples
    const data = await rakibRequest(`/products/${numericId}`);
    console.log(`[RakibSocials] Product details:`, data);
    
    return {
      success: true,
      product: data,
      previews: data.previews || data.samples || data.preview_links || []
    };
  } catch (err: any) {
    console.error("[RakibSocials] Product details error:", err);
    return {
      success: false,
      product: null,
      previews: []
    };
  }
}

export async function getProductPreviews(productId: string) {
  try {
    const numericId = parseInt(productId, 10);
    console.log(`[RakibSocials] Fetching previews for product ${numericId}`);
    
    // RakibSocials API endpoint for previews (adjust if different)
    const data = await rakibRequest(`/products/${numericId}/previews`);
    
    return {
      success: true,
      previews: data.previews || data.samples || []
    };
  } catch (err: any) {
    console.error("[RakibSocials] Preview fetch error:", err);
    // If API doesn't support previews endpoint, return empty
    return {
      success: false,
      previews: []
    };
  }
}

function extractRakibCredential(result: any): string {
  if (!result) return 'Contact support for credentials';

  if (Array.isArray(result.keys) && result.keys.length > 0) {
    return result.keys.map((k: any) => (typeof k === 'object' ? JSON.stringify(k) : String(k))).join('\n');
  }
  if (typeof result.keys === 'string' && result.keys.trim()) {
    return result.keys.trim();
  }
  if (Array.isArray(result.data) && result.data.length > 0) {
    return result.data.map((k: any) => (typeof k === 'object' ? JSON.stringify(k) : String(k))).join('\n');
  }
  if (typeof result.data === 'string' && result.data.trim()) {
    return result.data.trim();
  }
  if (typeof result.key === 'string' && result.key.trim()) {
    return result.key.trim();
  }
  if (typeof result.account === 'string' && result.account.trim()) {
    return result.account.trim();
  }
  if (Array.isArray(result.accounts) && result.accounts.length > 0) {
    return result.accounts.map((k: any) => (typeof k === 'object' ? JSON.stringify(k) : String(k))).join('\n');
  }
  if (typeof result.credential === 'string' && result.credential.trim()) {
    return result.credential.trim();
  }
  if (typeof result.log === 'string' && result.log.trim()) {
    return result.log.trim();
  }
  if (Array.isArray(result.logs) && result.logs.length > 0) {
    return result.logs.map((k: any) => (typeof k === 'object' ? JSON.stringify(k) : String(k))).join('\n');
  }
  if (typeof result === 'string') return result;
  if (typeof result === 'object') {
    if (result.text) return String(result.text);
    if (result.item) return typeof result.item === 'object' ? JSON.stringify(result.item) : String(result.item);
    return JSON.stringify(result);
  }
  return String(result);
}

export async function purchaseRakibLog(productId: string, userId: string) {
  try {
    const numericId = parseInt(productId, 10);
    console.log(`[RakibSocials] Purchasing product ${numericId} for user ${userId}`);
    
    const result = await rakibRequest("/buy", "POST", { product: numericId, quantity: 1 });
    console.log(`[RakibSocials] Purchase successful:`, result);
    
    const credential = extractRakibCredential(result);
    
    return {
      success: true,
      credential: credential,
      platform: result.platform || result.product_name || 'Social Media',
      type: result.product || result.product_name || 'Account',
      price: Number(result.charge || result.price || 0) * 2,
      account: credential
    };
  } catch (err: any) {
    console.error("[RakibSocials] Purchase error:", err);
    return {
      success: false,
      message: err.message || "Purchase failed"
    };
  }
}
