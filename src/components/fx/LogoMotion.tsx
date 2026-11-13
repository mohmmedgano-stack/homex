/**
 * Header logo animation «الشرارة»: an orange spark runs along the swoosh, drawing it,
 * and each letter of HOMEX rises as the spark passes under it. Replays every 10 seconds.
 * The cut lines below are traced from /logo.webp (600×167); a different uploaded logo
 * or reduced-motion visitors get the plain image.
 */
import React, { useEffect, useId, useRef } from 'react';
import { gsap, reducedMotion } from '../../lib/fx';

const W = 600, H = 167;
const L: [number, number][] = [[0, 118], [118, 243], [243, 378], [378, 468], [468, 600]];
// below this line is the swoosh, above it the letters
const SEP = '0,17 6,114 12,114 18,114 24,114 30,114 36,113 42,73 48,73 54,73 60,73 66,73 72,73 78,73 84,113 90,113 96,113 102,113 108,113 114,113 120,75 126,89 132,96 138,102 144,106 150,110 156,112 162,114 168,115 174,116 180,116 186,116 192,115 198,113 204,111 210,109 216,105 222,101 228,95 234,86 240,69 246,113 252,113 258,113 264,113 270,113 276,113 282,67 288,77 294,87 300,97 306,107 312,111 318,101 324,90 330,80 336,70 342,112 348,113 354,113 360,113 366,113 372,113 378,113 384,113 390,113 396,113 402,113 408,113 414,113 420,113 426,113 432,113 438,113 444,113 450,113 456,110 462,106 468,102 474,113 480,113 486,113 492,113 498,114 504,109 510,104 516,98 522,92 528,85 534,87 540,95 546,104 552,112 558,113 564,113 570,113 576,113 582,113 588,18 594,11 600,11'
  .split(' ').map((q) => q.split(',').map(Number) as [number, number]);
// centre line of the swoosh, for the spark to ride on
const PATH: [number, number][] = [[0, 146], [15, 140], [30, 134], [45, 130], [60, 128], [90, 126], [120, 127], [150, 130], [180, 134], [210, 140], [240, 144], [270, 148], [300, 151], [345, 151], [375, 148], [405, 142], [435, 134], [465, 121], [495, 115], [540, 111], [600, 104]];

const lerp = (pts: [number, number][], x: number) => {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};
const line = (a: number, b: number): [number, number][] => [[a, lerp(SEP, a)], ...SEP.filter(([x]) => x > a && x < b), [b, lerp(SEP, b)]];
const pts = (p: [number, number][]) => p.map((q) => q.join(',')).join(' ');

export const LogoMotion: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className = '' }) => {
  const animatable = /(^|\/)logo\.webp$/.test(src) || src === '/logo.webp';
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg || !animatable || reducedMotion()) return;
    const q = (id: string) => svg.querySelector<SVGElement>(`#${uid}${id}`)!;
    const letters = L.map((_, j) => q(`l${j}`));
    const full = q('full'), dot = q('dot'), sw = q('swr'), all = q('all');
    const st = L.map(([a, b]) => ({ y: 0, s: 1, cx: (a + b) / 2 }));
    const spark = { x: 0, s: 1 };
    const paint = () => {
      st.forEach((t, j) => letters[j].setAttribute('transform', `translate(${t.cx} ${58 + t.y}) scale(${t.s}) translate(${-t.cx} -58)`));
      dot.setAttribute('transform', `translate(${spark.x} ${lerp(PATH, spark.x)}) scale(${spark.s})`);
      sw.setAttribute('width', String(spark.x));
    };
    const ease = gsap.parseEase('power2.inOut');
    const RUN = 1.8, T0 = 0.3;

    const tl = gsap.timeline({ repeat: -1, onUpdate: paint });
    tl.set(letters, { opacity: 0 }, 0)
      .set([full, dot], { opacity: 0 }, 0)
      .set(all, { opacity: 1 }, 0)
      .set(spark, { x: 0, s: 1 }, 0)
      .set(st, { y: 0, s: 1 }, 0)
      .set(dot, { opacity: 1 }, T0)
      .fromTo(spark, { x: 0 }, { x: W, duration: RUN, ease: 'power2.inOut' }, T0);
    L.forEach(([a, b], j) => {
      // when does the eased spark reach this letter's middle?
      const target = (a + b) / 2 / W;
      let lo = 0, hi = 1;
      for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (ease(m) < target) lo = m; else hi = m; }
      const t = T0 + RUN * lo - 0.1;
      tl.fromTo(letters[j], { opacity: 0 }, { opacity: 1, duration: 0.3 }, t)
        .fromTo(st[j], { y: 34, s: 0.85 }, { y: 0, s: 1, duration: 0.6, ease: 'back.out(2.4)' }, t);
    });
    tl.to(spark, { s: 2.2, duration: 0.35, ease: 'power2.out' }, T0 + RUN)
      .to(dot, { opacity: 0, duration: 0.35 }, T0 + RUN)
      .set(full, { opacity: 1 }, 2.5) // swap to the untouched image once it's all in (no seams)
      .to(all, { opacity: 0, duration: 0.45, ease: 'power1.in' }, 9.3)
      .set({}, {}, 10);
    paint();
    return () => { tl.kill(); };
  }, [animatable, uid]);

  if (!animatable) return <img src={src} width={W} height={H} alt={alt} className={className} />;

  const img = <image href={src} width={W} height={H} />;
  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className={`${className} overflow-visible`} style={{ aspectRatio: `${W} / ${H}` }} role="img" aria-label={alt}>
      <defs>
        {L.map(([a, b], j) => (
          <clipPath key={j} id={`${uid}c${j}`}>
            <polygon points={`${a},0 ${b},0 ${pts(line(a, b).reverse())}`} />
          </clipPath>
        ))}
        <clipPath id={`${uid}s`}><polygon points={`${pts(line(0, W))} ${W},170 0,170`} /></clipPath>
        <clipPath id={`${uid}sw`}><rect id={`${uid}swr`} x="0" y="0" width={W} height="170" /></clipPath>
        <radialGradient id={`${uid}g`}>
          <stop offset="0" stopColor="#fff" />
          <stop offset=".35" stopColor="#ffb070" />
          <stop offset="1" stopColor="#f47a20" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g id={`${uid}all`}>
        {L.map((_, j) => (
          <g key={j} id={`${uid}l${j}`}><g clipPath={`url(#${uid}c${j})`}>{img}</g></g>
        ))}
        <g clipPath={`url(#${uid}sw)`}><g clipPath={`url(#${uid}s)`}>{img}</g></g>
        <image id={`${uid}full`} href={src} width={W} height={H} opacity={reducedMotion() ? 1 : 0} />
      </g>
      <circle id={`${uid}dot`} r="26" fill={`url(#${uid}g)`} opacity="0" />
    </svg>
  );
};
