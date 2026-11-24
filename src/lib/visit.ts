// One visit per browser tab session: where it came from (referrer + link tags) and the screen/device details
// the server can't see on its own. Sent after the page is idle so it never slows the first load.
export function recordVisit() {
  try {
    if (sessionStorage.getItem('hx-visit')) return;
    sessionStorage.setItem('hx-visit', '1');
  } catch { /* private mode: still count it */ }

  const send = async () => {
    const body: Record<string, unknown> = {
      path: location.pathname,
      ref: document.referrer,
      q: location.search,
      sw: screen.width,
      sh: screen.height,
      tp: navigator.maxTouchPoints || 0,
    };
    // Chrome on Android hides the phone model from the User-Agent but tells it when asked
    const uad = (navigator as any).userAgentData;
    if (uad?.getHighEntropyValues) {
      try {
        const h = await uad.getHighEntropyValues(['model', 'platformVersion']);
        if (h.model) body.model = h.model;
        if (h.platformVersion) body.osv = h.platformVersion;
      } catch { /* not allowed: skip */ }
    }
    fetch('/api/?r=visit', {
      method: 'POST',
      keepalive: true,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Homex': '1' },
      body: JSON.stringify(body),
    }).catch(() => {});
  };
  const idle = (window as any).requestIdleCallback || ((f: () => void) => setTimeout(f, 1500));
  if (document.readyState === 'complete') idle(send);
  else addEventListener('load', () => idle(send), { once: true });
}
