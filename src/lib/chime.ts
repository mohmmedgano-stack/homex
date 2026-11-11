/**
 * Short, glassy two-note notification chime (original, synthesized — no audio file).
 * Same idea as a phone's message tone: bright, soft and quick.
 */
let ctx: AudioContext | null = null;
let last = 0;

const getCtx = () => {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
};

// Browsers only allow sound after the first tap on the page
if (typeof window !== 'undefined') {
  const unlock = () => { getCtx(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

export function playChime(volume = 0.5) {
  const now = Date.now();
  if (now - last < 500) return; // several banners at once → one sound
  last = now;
  const c = getCtx();
  if (!c || c.state !== 'running') return;
  const t0 = c.currentTime + 0.01;
  const master = c.createGain();
  master.gain.value = volume;
  master.connect(c.destination);
  // two bell-like notes, each a sine with a quiet overtone and a fast decay
  ([[1318.5, 0], [1975.5, 0.11]] as const).forEach(([f, dt]) => {
    [[1, 1], [2.76, 0.18], [5.4, 0.05]].forEach(([mult, amp]) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = f * mult;
      const s = t0 + dt;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(amp, s + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, s + (mult === 1 ? 0.55 : 0.2));
      o.connect(g).connect(master);
      o.start(s);
      o.stop(s + 0.6);
    });
  });
}
