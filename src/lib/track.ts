// Ad / analytics pixels. IDs come from the dashboard (Store settings → tracking).
// Each helper is a no-op until its pixel is configured.
declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    ttq?: any;
    gtag?: any;
    dataLayer?: any[];
  }
}

let ready = false;
let ids = { meta: '', tiktok: '', ga4: '' };

const loadScript = (src: string) => {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
};

export function initTracking(cfg: { meta_pixel_id?: string; tiktok_pixel_id?: string; ga4_id?: string }) {
  if (ready) return;
  ready = true;
  ids = { meta: cfg.meta_pixel_id || '', tiktok: cfg.tiktok_pixel_id || '', ga4: cfg.ga4_id || '' };

  if (ids.meta) {
    const f: any = (window.fbq = function (...a: any[]) {
      f.callMethod ? f.callMethod(...a) : f.queue.push(a);
    });
    if (!window._fbq) window._fbq = f;
    f.push = f;
    f.loaded = true;
    f.version = '2.0';
    f.queue = [];
    loadScript('https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', ids.meta);
    window.fbq('track', 'PageView');
  }

  if (ids.tiktok) {
    // TikTok's official base code (queue array + deferred methods), written out
    const w = window as any;
    w.TiktokAnalyticsObject = 'ttq';
    const ttq: any = (w.ttq = w.ttq || []);
    ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie', 'holdConsent', 'revokeConsent', 'grantConsent'];
    ttq.setAndDefer = (t: any, e: string) => {
      t[e] = (...args: any[]) => t.push([e, ...args]);
    };
    ttq.methods.forEach((m: string) => ttq.setAndDefer(ttq, m));
    const src = 'https://analytics.tiktok.com/i18n/pixel/events.js';
    ttq._i = ttq._i || {};
    ttq._i[ids.tiktok] = [];
    ttq._i[ids.tiktok]._u = src;
    ttq._t = ttq._t || {};
    ttq._t[ids.tiktok] = +new Date();
    ttq._o = ttq._o || {};
    ttq._o[ids.tiktok] = {};
    loadScript(`${src}?sdkid=${encodeURIComponent(ids.tiktok)}&lib=ttq`);
    ttq.page();
  }

  if (ids.ga4) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ids.ga4)}`);
    window.gtag('js', new Date());
    window.gtag('config', ids.ga4);
  }
}

type Item = { id: string; name: string; price: number; quantity?: number };

const metaContents = (items: Item[]) => items.map((i) => ({ id: i.id, quantity: i.quantity || 1, item_price: i.price }));
const ttContents = (items: Item[]) => items.map((i) => ({ content_id: i.id, content_name: i.name, quantity: i.quantity || 1, price: i.price }));
const gaItems = (items: Item[]) => items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity || 1 }));

export function trackViewContent(item: Item) {
  window.fbq?.('track', 'ViewContent', { content_ids: [item.id], content_name: item.name, content_type: 'product', value: item.price, currency: 'EGP' });
  window.ttq?.track('ViewContent', { contents: ttContents([item]), content_type: 'product', value: item.price, currency: 'EGP' });
  window.gtag?.('event', 'view_item', { currency: 'EGP', value: item.price, items: gaItems([item]) });
}

export function trackAddToCart(item: Item) {
  const value = item.price * (item.quantity || 1);
  window.fbq?.('track', 'AddToCart', { content_ids: [item.id], content_name: item.name, content_type: 'product', contents: metaContents([item]), value, currency: 'EGP' });
  window.ttq?.track('AddToCart', { contents: ttContents([item]), content_type: 'product', value, currency: 'EGP' });
  window.gtag?.('event', 'add_to_cart', { currency: 'EGP', value, items: gaItems([item]) });
}

export function trackInitiateCheckout(items: Item[], value: number) {
  window.fbq?.('track', 'InitiateCheckout', { content_ids: items.map((i) => i.id), contents: metaContents(items), num_items: items.length, value, currency: 'EGP' });
  window.ttq?.track('InitiateCheckout', { contents: ttContents(items), content_type: 'product', value, currency: 'EGP' });
  window.gtag?.('event', 'begin_checkout', { currency: 'EGP', value, items: gaItems(items) });
}

export function trackPurchase(orderCode: string, value: number, items: Item[] = []) {
  window.fbq?.('track', 'Purchase', { content_ids: items.map((i) => i.id), contents: metaContents(items), content_type: 'product', value, currency: 'EGP' }, { eventID: orderCode });
  window.ttq?.track('CompletePayment', { contents: ttContents(items), content_type: 'product', value, currency: 'EGP', order_id: orderCode });
  window.gtag?.('event', 'purchase', { transaction_id: orderCode, currency: 'EGP', value, items: gaItems(items) });
}
