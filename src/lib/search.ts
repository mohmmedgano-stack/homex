/**
 * Store search that understands how people actually type:
 * - Arabic spelling variants (أ/إ/آ→ا، ة→ه، ى→ي، no tashkeel, no tatweel), Arabic/Persian digits
 * - everyday names and English words for the same thing (كتل / غلاية / kettle → كاتيل)
 * - small typos (one letter wrong, missing or extra)
 * Every result gets a score so the best match comes first.
 */
import type { Product } from '../types';
type Category = { id: string; name: string; image?: string };

export const normalize = (s: string) =>
  (s || '')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '') // tashkeel + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Groups of words that mean the same product. The first word is how the store names it. */
const GROUPS: string[][] = [
  ['كاتيل', 'كاتل', 'كتل', 'كتيل', 'كيتل', 'غلايه', 'غلاية', 'سخان مياه', 'kettle', 'katel'],
  ['خلاط', 'بلندر', 'blender', 'خلاطه', 'عصاره', 'عصارة'],
  ['هاند بلندر', 'هاند', 'خلاط يد', 'خلاط يدوي', 'hand blender', 'hand mixer', 'مضرب'],
  ['محضر طعام', 'محضر', 'كبه كبيره', 'food processor', 'processor'],
  ['كبه', 'كبة', 'مفرمه', 'مفرمة', 'فرامه', 'فرامة', 'كبايه', 'chopper', 'مطحنه', 'مطحنة'],
  ['قطاعه خضار', 'قطاعه', 'قطاعة', 'مقطع خضار', 'تقطيع خضار', 'vegetable cutter', 'slicer'],
  ['مكواه', 'مكواة', 'مكوه', 'مكوة', 'مكوي', 'iron', 'steam iron', 'مكواة بخار'],
  ['شاشه', 'شاشة', 'تلفزيون', 'تليفزيون', 'تلفاز', 'تليفيزيون', 'tv', 'television', 'screen', 'smart tv'],
  ['سمارت', 'اسمارت', 'smart', 'اندرويد', 'android'],
  ['كنكه', 'كنكة', 'قهوه', 'قهوة', 'ماكينه قهوه', 'coffee', 'coffee maker', 'كنكه كهربا'],
  ['قلايه', 'قلاية', 'ايرفراير', 'اير فراير', 'air fryer', 'fryer'],
  ['مكنسه', 'مكنسة', 'vacuum'],
  ['ميكروويف', 'ميكرويف', 'microwave'],
  ['ثلاجه', 'ثلاجة', 'تلاجه', 'fridge', 'refrigerator'],
  ['غساله', 'غسالة', 'washing machine', 'washer'],
  ['بوتاجاز', 'فرن', 'oven', 'cooker'],
  ['تكييف', 'تكيف', 'مكيف', 'ac', 'air conditioner'],
  ['مروحه', 'مروحة', 'fan'],
  ['سخان', 'heater'],
  ['هوم اكس', 'homex', 'home x', 'هومكس', 'هوميكس'],
];
const SYN = new Map<string, string[]>();
for (const g of GROUPS) {
  const n = g.map(normalize);
  for (const w of n) SYN.set(w, n);
}

/** Levenshtein distance, stopping early once it's over the limit */
function dist(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** All the ways one typed word could be meant: itself, its synonyms, and the store word it's a typo of */
function expand(word: string, vocab: string[]): string[] {
  const out = new Set<string>([word]);
  const syn = SYN.get(word);
  if (syn) syn.forEach((s) => out.add(s));
  // a word inside a synonym phrase ("هاند") or a phrase starting with it
  if (word.length >= 3) for (const [k, v] of SYN) if (k.startsWith(word)) v.forEach((s) => out.add(s));
  if (word.length >= 4 && !/\d/.test(word)) { // codes and sizes must match exactly
    const max = word.length >= 7 ? 2 : 1;
    for (const v of vocab) if (v.length >= 3 && dist(word, v, max) <= max) { out.add(v); SYN.get(v)?.forEach((s) => out.add(s)); }
    for (const k of SYN.keys()) if (dist(word, k, max) <= max) SYN.get(k)!.forEach((s) => out.add(s));
  }
  return [...out];
}

type Indexed = { p: Product; name: string; rest: string; words: string[] };
let cacheKey = '';
let cache: { items: Indexed[]; vocab: string[] } = { items: [], vocab: [] };

function index(products: Product[], categories: Category[]) {
  const key = products.map((p) => p.id + p.name + p.price).join('|') + categories.length;
  if (key === cacheKey) return cache;
  const cat = new Map(categories.map((c) => [String(c.id), c.name]));
  const items = products.map((p) => {
    const name = normalize(`${p.name} ${p.brand || ''}`);
    const rest = normalize([cat.get(String(p.category)) || '', p.code || '', p.sku || '', p.capacity || '', p.wattage || '', p.description || '',
      ...(p.specs || []).map((s: any) => `${s.label} ${s.value}`), ...(p.options || []).flatMap((g) => g.values.map((v) => v.label))].join(' '));
    return { p, name, rest, words: `${name} ${rest}`.split(' ') };
  });
  const vocab = [...new Set(items.flatMap((i) => i.words))].filter((w) => w.length >= 3 && !/^\d+$/.test(w));
  cacheKey = key;
  cache = { items, vocab };
  return cache;
}

/** Products ranked by how well they match. Every typed word has to match something (in any of its forms). */
export function searchProducts(products: Product[], categories: Category[], query: string): Product[] {
  const q = normalize(query);
  if (!q) return products;
  const { items, vocab } = index(products, categories);
  const terms = q.split(' ').filter(Boolean).map((w) => expand(w, vocab));
  const scored: { p: Product; s: number }[] = [];
  for (const it of items) {
    let score = 0;
    let ok = true;
    for (const forms of terms) {
      let best = 0;
      for (const f of forms) {
        if (it.name.includes(f)) best = Math.max(best, it.name.startsWith(f) ? 6 : 4);
        else if (it.rest.includes(f)) best = Math.max(best, 2);
      }
      if (!best) { ok = false; break; }
      score += best;
    }
    if (ok) {
      if (it.name.includes(q)) score += 5; // the whole phrase as typed
      else if (it.rest.includes(q)) score += 4; // e.g. the exact model code
      if (it.p.stock > 0) score += 0.5;
      scored.push({ p: it.p, s: score });
    }
  }
  return scored.sort((a, b) => b.s - a.s).map((x) => x.p);
}

/** Categories whose name matches what's typed (for the suggestions list) */
export function searchCategories(categories: Category[], query: string): Category[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const forms = q.split(' ').flatMap((w) => expand(w, []));
  return categories.filter((c) => { const n = normalize(c.name); return forms.some((f) => n.includes(f) || f.includes(n)); }).slice(0, 3);
}

/* recent searches, kept on this device only */
const KEY = 'homex_recent_search';
export const recentSearches = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
export const rememberSearch = (q: string) => {
  const t = q.trim();
  if (t.length < 2) return;
  try { localStorage.setItem(KEY, JSON.stringify([t, ...recentSearches().filter((x) => x !== t)].slice(0, 6))); } catch { /* private mode */ }
};
export const clearRecentSearches = () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } };
