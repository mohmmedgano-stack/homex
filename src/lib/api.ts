// Tiny client for the PHP API at /api/?r=<route>
export class ApiError extends Error {
  status: number;
  constructor(msg: string, status: number) {
    super(msg);
    this.status = status;
  }
}

const BASE = '/api/';

async function handle<T>(res: Response): Promise<T> {
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    throw new ApiError('السيرفر مش بيرد. اتأكد إن الموقع مرفوع على الاستضافة', res.status || 0);
  }
  if (!json.ok) throw new ApiError(json.error || 'حصل خطأ', res.status);
  return json.data as T;
}

export const api = {
  get<T = any>(route: string, params: Record<string, string | undefined> = {}): Promise<T> {
    const q = new URLSearchParams({ r: route });
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && q.set(k, v));
    return fetch(`${BASE}?${q}`, { credentials: 'same-origin' }).then((r) => handle<T>(r));
  },
  post<T = any>(route: string, body: unknown = {}): Promise<T> {
    return fetch(`${BASE}?r=${encodeURIComponent(route)}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Homex': '1' },
      body: JSON.stringify(body),
    }).then((r) => handle<T>(r));
  },
  upload(file: File, kind?: 'banner'): Promise<{ url: string }> {
    const fd = new FormData();
    fd.append('img', file);
    if (kind) fd.append('kind', kind);
    return fetch(`${BASE}?r=admin/upload`, { method: 'POST', credentials: 'same-origin', body: fd }).then((r) =>
      handle<{ url: string }>(r)
    );
  },
};

export const money = (n: number | string | null | undefined) =>
  `${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ج.م`;

export interface StoreSettings {
  store_name: string;
  logo: string;
  top_bar_text: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  shipping_fee: string;
  free_shipping_over: string;
  pay_cod: string;
  brand_banner_desktop?: string;
  brand_banner_mobile?: string;
  brand_title?: string;
  brand_subtitle?: string;
  pay_vodafone: string;
  pay_instapay: string;
  hero_title: string;
  hero_subtitle: string;
  pay_card?: string; // '1' when a card gateway is connected
  page_about?: string;
  page_shipping?: string;
  page_returns?: string;
  page_privacy?: string;
  page_terms?: string;
  meta_pixel_id?: string;
  tiktok_pixel_id?: string;
  ga4_id?: string;
}

export const POLICY_PAGES = [
  { key: 'about', title: 'من نحن' },
  { key: 'shipping', title: 'سياسة الشحن والتوصيل' },
  { key: 'returns', title: 'سياسة الاسترجاع والاستبدال' },
  { key: 'privacy', title: 'سياسة الخصوصية' },
  { key: 'terms', title: 'الشروط والأحكام' },
] as const;

/** Small version of an uploaded image (cards, lists). External URLs are returned as-is. */
export const thumb = (url?: string) => (url && url.startsWith('/api/?r=img&f=') ? `${url}&s=1` : url || '');
