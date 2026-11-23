import React from 'react';
import { Sparkles, Gift } from 'lucide-react';

/** Banner on the home page that opens the finder */
export const FinderBanner: React.FC<{ onOpen: () => void }> = ({ onOpen }) => (
  <section data-reveal className="rounded-2xl bg-ink text-white p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden relative">
    <div className="absolute -left-16 -bottom-20 w-56 h-56 rounded-full bg-gold/25 blur-3xl" aria-hidden="true" />
    <div className="relative">
      <p className="text-lg sm:text-2xl font-extrabold flex items-center gap-2"><Sparkles className="w-6 h-6 text-gold-hi" /> محتار تختار؟</p>
      <p className="text-sm sm:text-base text-white/75 mt-1">جاوب على سؤالين وإحنا نرشّحلك الجهاز المناسب ليك.</p>
    </div>
    <button onClick={onOpen} className="relative btn-gold shiny-text justify-center h-12 px-6 rounded-xl font-extrabold shrink-0">اختار جهازك المناسب</button>
  </section>
);

/** Banner on the home page for the bride's gift list */
export const RegistryBanner: React.FC = () => (
  <section data-reveal className="rounded-2xl bg-gradient-to-l from-[#fff1e6] to-white border border-gold/30 p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <p className="text-lg sm:text-2xl font-extrabold text-ink flex items-center gap-2"><Gift className="w-6 h-6 text-gold-deep" /> قايمة جهاز العروسة</p>
      <p className="text-sm sm:text-base text-steel mt-1">اختاري أجهزتك وابعتي اللينك لأهلك وصحابك، والهدايا توصلك من غير ما تتكرر.</p>
    </div>
    <a href="/w" onClick={(e) => { e.preventDefault(); history.pushState(null, '', '/w'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0 }); }}
      className="h-12 px-6 rounded-xl bg-ink text-white font-extrabold inline-flex items-center justify-center shrink-0">اعملي قايمتك</a>
  </section>
);
