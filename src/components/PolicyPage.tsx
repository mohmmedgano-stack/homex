import React from 'react';
import { useStore } from '../context/StoreContext';
import { POLICY_PAGES } from '../lib/api';

export const policyKeyFromPath = (): string | null => {
  const m = location.pathname.match(/^\/p\/(about|shipping|returns|privacy|terms)\/?$/);
  return m ? m[1] : null;
};

export const PolicyPage: React.FC<{ pageKey: string }> = ({ pageKey }) => {
  const { settings } = useStore();
  const meta = POLICY_PAGES.find((p) => p.key === pageKey)!;
  const text = ((settings as any)[`page_${pageKey}`] as string) || '';

  React.useEffect(() => {
    document.title = `${meta.title} | ${settings.store_name}`;
  }, [meta.title, settings.store_name]);

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <nav className="text-sm text-steel mb-4" aria-label="مسار الصفحة">
        <a href="/" className="hover:text-ink underline underline-offset-4">الرئيسية</a>
        <span className="mx-2">/</span>
        <span className="text-ink">{meta.title}</span>
      </nav>
      <article className="bg-white rounded-2xl border border-line p-5 sm:p-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink mb-6">{meta.title}</h1>
        <div className="space-y-4 text-[15px] sm:text-base text-ink/90 leading-loose">
          {text.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="whitespace-pre-line">{para}</p>
          ))}
        </div>
        {(settings.phone || settings.whatsapp || settings.email) && (
          <div className="mt-8 pt-6 border-t border-line text-sm text-steel space-y-1">
            <p className="font-bold text-ink">للتواصل معانا</p>
            {settings.phone && <p>تليفون: <a dir="ltr" href={`tel:${settings.phone}`} className="text-ink underline">{settings.phone}</a></p>}
            {settings.whatsapp && <p>واتساب: <span dir="ltr" className="text-ink">{settings.whatsapp}</span></p>}
            {settings.email && <p>إيميل: <a href={`mailto:${settings.email}`} className="text-ink underline">{settings.email}</a></p>}
            {settings.address && <p>العنوان: {settings.address}</p>}
          </div>
        )}
      </article>
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {POLICY_PAGES.filter((p) => p.key !== pageKey).map((p) => (
          <a key={p.key} href={`/p/${p.key}`} className="text-steel hover:text-ink underline underline-offset-4">{p.title}</a>
        ))}
      </div>
    </main>
  );
};
