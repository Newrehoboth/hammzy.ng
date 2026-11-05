// Rakib Socials API Integration
const API_KEY = process.env.RAKIB_SOCIALS_API_KEY || "keykjqsmm7du9";
const BASE_URL = process.env.RAKIB_SOCIALS_API_URL || "https://rakibsocials.com";

export interface RakibProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  stock: number;
}

async function rakibRequest<T>(endpoint: string): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`[Rakib] GET ${url}`);
  
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Rakib API error: ${res.status}`);
  }

  return res.json();
}

export async function fetchRakibProducts(): Promise<RakibProduct[]> {
  try {
    const data = await rakibRequest<any>('/api/products');
    // Map API response to our format
    return (data.products || []).map((p: any) => ({
      id: `rakib-${p.id}`,
      name: p.name || p.title,
      category: p.category || 'Other',
      price: Number(p.price),
      description: p.description,
      stock: Number(p.stock || 999),
    }));
  } catch (err) {
    console.error('[Rakib] Failed to fetch products:', err);
    return [];
  }
}

export async function purchaseRakibProduct(productId: string, userId: string): Promise<{ credential: string }> {
  // Extract real ID
  const realId = productId.replace('rakib-', '');
  
  const url = `${BASE_URL}/api/purchase`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: realId,
      user_id: userId,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `Purchase failed: ${res.status}`);
  }

  const data = await res.json();
  return {
    credential: data.credential || data.account || data.data,
  };
}
