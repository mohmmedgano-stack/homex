/** URL helpers for the store's pages (kept apart from the page components so those can load on demand). */
import type { Product } from '../types';

export const productPath = (p: Pick<Product, 'id'> & { slug?: string }) => `/product/${p.id}${p.slug ? `-${p.slug}` : ''}`;
export const productIdFromPath = (): string | null => {
  const m = location.pathname.match(/^\/product\/(\d+)(?:-[a-z0-9-]*)?\/?$/);
  return m ? m[1] : null;
};
export const policyKeyFromPath = (): string | null => {
  const m = location.pathname.match(/^\/p\/([a-z0-9-]+)\/?$/);
  return m ? m[1] : null;
};
export const orderFromPath = (): { code: string; t: string } | null => {
  const m = location.pathname.match(/^\/o\/([A-Za-z0-9-]+)\/?$/);
  if (!m) return null;
  return { code: m[1], t: new URLSearchParams(location.search).get('t') || '' };
};
export const reviewFromPath = (): { code: string; t: string } | null => {
  const m = location.pathname.match(/^\/r\/([A-Za-z0-9-]+)\/?$/);
  return m ? { code: m[1], t: new URLSearchParams(location.search).get('t') || '' } : null;
};
export const registryFromPath = (): { code: string | null; k: string } | null => {
  const m = location.pathname.match(/^\/w(?:\/([A-Za-z0-9-]+))?\/?$/);
  if (!m) return null;
  return { code: m[1] ? (m[1] === 'new' ? 'new' : m[1].toUpperCase()) : null, k: new URLSearchParams(location.search).get('k') || '' };
};
