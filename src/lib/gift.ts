/** The bride's list a visitor is buying a gift for (kept on this device until the order is placed). */
export type GiftFor = { code: string; title: string; bride: string };
const KEY = 'homex_gift_for';
export const getGift = (): GiftFor | null => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
export const setGift = (g: GiftFor) => { try { localStorage.setItem(KEY, JSON.stringify(g)); } catch { /* private mode */ } };
export const clearGift = () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } };

/** Links for the bride's own lists, so she can come back and edit (this device only) */
const MINE = 'homex_my_lists';
export const myLists = (): { code: string; k: string; title: string }[] => { try { return JSON.parse(localStorage.getItem(MINE) || '[]'); } catch { return []; } };
export const rememberMyList = (l: { code: string; k: string; title: string }) => {
  try { localStorage.setItem(MINE, JSON.stringify([l, ...myLists().filter((x) => x.code !== l.code)].slice(0, 5))); } catch { /* ignore */ }
};
