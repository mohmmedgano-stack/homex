import React from 'react';

/**
 * Flat illustration of small home appliances (TV, kettle, food chopper, iron, stand mixer)
 * in the HOMEX graphite + orange palette, for the brand banner. Purely decorative.
 */
export const ApplianceArt: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 600 300" className={className} aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="hx-screen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3a414c" />
        <stop offset="0.55" stopColor="#1c1f24" />
        <stop offset="1" stopColor="#2a2f36" />
      </linearGradient>
      <linearGradient id="hx-glow" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#f47a20" stopOpacity="0.55" />
        <stop offset="1" stopColor="#f47a20" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="hx-steel" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#c9ced6" />
        <stop offset="0.45" stopColor="#f4f6f8" />
        <stop offset="1" stopColor="#aab1bb" />
      </linearGradient>
      <linearGradient id="hx-orange" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ff9142" />
        <stop offset="1" stopColor="#e0680f" />
      </linearGradient>
      <linearGradient id="hx-glass" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
        <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.1" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0.24" />
      </linearGradient>
    </defs>

    {/* floor shadow */}
    <ellipse cx="300" cy="274" rx="285" ry="10" fill="#000" opacity="0.35" />

    {/* ---- TV (back) ---- */}
    <rect x="150" y="28" width="300" height="182" rx="10" fill="#111317" stroke="#4a525e" strokeWidth="3" />
    <rect x="160" y="38" width="280" height="162" rx="4" fill="url(#hx-screen)" />
    <path d="M160 200 L300 38 L360 38 L220 200 Z" fill="#fff" opacity="0.05" />
    <rect x="160" y="150" width="280" height="50" fill="url(#hx-glow)" opacity="0.6" />
    <circle cx="300" cy="205" r="2" fill="#f47a20" />
    <rect x="285" y="210" width="30" height="22" fill="#2b3038" />
    <rect x="245" y="230" width="110" height="7" rx="3.5" fill="#2b3038" />

    {/* ---- Kettle ---- */}
    <rect x="34" y="258" width="120" height="12" rx="6" fill="#2b3038" />
    <path d="M52 258 L62 168 Q64 156 76 156 L114 156 Q126 156 128 168 L138 258 Z" fill="url(#hx-steel)" />
    <rect x="57" y="214" width="76" height="10" fill="url(#hx-orange)" />
    <path d="M62 172 L40 150 L46 146 L70 166 Z" fill="#c9ced6" />
    <path d="M128 172 Q158 176 156 212 Q154 244 134 248" fill="none" stroke="#2b3038" strokeWidth="11" strokeLinecap="round" />
    <rect x="80" y="146" width="30" height="12" rx="4" fill="#2b3038" />
    <rect x="89" y="138" width="12" height="9" rx="3" fill="url(#hx-orange)" />
    <rect x="68" y="176" width="5" height="70" rx="2.5" fill="#fff" opacity="0.6" />

    {/* ---- Food chopper ---- */}
    <rect x="198" y="236" width="96" height="34" rx="9" fill="#2b3038" />
    <circle cx="246" cy="253" r="7" fill="#f47a20" />
    <path d="M204 236 L210 176 L284 176 L290 236 Z" fill="url(#hx-glass)" stroke="#d7dce2" strokeOpacity="0.6" strokeWidth="2" />
    <rect x="243" y="182" width="6" height="50" rx="3" fill="#aab1bb" />
    <path d="M222 214 L270 206 L270 212 L222 220 Z" fill="#e6e9ed" />
    <rect x="204" y="164" width="84" height="14" rx="7" fill="url(#hx-orange)" />
    <rect x="236" y="154" width="20" height="12" rx="5" fill="#2b3038" />

    {/* ---- Iron ---- */}
    <path d="M300 268 L408 268 Q412 268 410 262 Q398 232 360 228 L328 228 Q306 230 300 250 Z" fill="url(#hx-orange)" />
    <path d="M298 268 L410 268 L410 272 L296 272 Z" fill="url(#hx-steel)" />
    <path d="M330 228 Q336 198 366 198 L392 198 Q402 198 402 208 L402 214" fill="none" stroke="#2b3038" strokeWidth="11" strokeLinecap="round" />
    <circle cx="352" cy="248" r="6" fill="#fff" opacity="0.85" />

    {/* ---- Stand mixer ---- */}
    <rect x="424" y="256" width="146" height="14" rx="7" fill="#2b3038" />
    <path d="M526 258 L532 150 L562 150 L566 258 Z" fill="url(#hx-orange)" />
    <path d="M436 118 Q436 102 452 102 L556 102 Q572 102 572 120 L572 150 Q572 164 556 164 L470 164 Q446 164 440 146 Z" fill="url(#hx-orange)" />
    <circle cx="548" cy="132" r="8" fill="#2b3038" />
    <rect x="474" y="164" width="8" height="40" fill="#aab1bb" />
    <path d="M440 200 L516 200 Q514 250 478 254 Q442 250 440 200 Z" fill="url(#hx-steel)" />
    <rect x="436" y="196" width="84" height="8" rx="4" fill="#d7dce2" />
    <path d="M456 112 L540 112" stroke="#fff" strokeOpacity="0.35" strokeWidth="5" strokeLinecap="round" />
  </svg>
);
