import React from 'react';
import { useStore } from '../context/StoreContext';
import { POLICY_PAGES } from '../lib/api';
import { ReturnRequestButton } from './ReturnRequest';

export const policyKeyFromPath = (): string | null => {
  const m = location.pathname.match(/^\/p\/([a-z0-9-]+)\/?$/);
  return m ? m[1] : null;
};

/** Pages managed from the dashboard («صفحات الموقع»); falls back to the built-in titles while settings load. */
export const PolicyPage: React.FC<{ pageKey: string }> = ({ pageKey }) => {
  const { settings } = useStore();
  const pages = settings.pages;
  const page = pages?.find((p) => p.slug === pageKey);
  const title = page?.title || POLICY_PAGES.find((p) => p.key === pageKey)?.title || '';
  const text = page?.content ?? (((settings as any)[`page_${pageKey}`] as string) || '');
  const others = (pages || []).filter((p) => p.inFooter && p.slug !== pageKey);

  React.useEffect(() => {
    if (title) document.title = `${title} | ${settings.store_name}`;
  }, [title, settings.store_name]);

  if (pages && !page) {
    return (
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-ink mb-3">الصفحة دي مش موجودة</h1>
        <a href="/" className="btn-gold inline-flex h-11 px-6 rounded-xl items-center font-bold">ارجع للرئيسية</a>
      </main>
    );
  }

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <nav className="text-sm text-steel mb-4" aria-label="مسار الصفحة">
        <a href="/" className="hover:text-ink underline underline-offset-4">الرئيسية</a>
        <span className="mx-2">/</span>
        <span className="text-ink">{title}</span>
      </nav>
      <article className="bg-white rounded-2xl border border-line p-5 sm:p-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink mb-6">{title}</h1>
        {pageKey === 'returns' && (
          <div className="mb-8 rounded-2xl bg-shelf p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-extrabold text-ink">عايز ترجّع أو تستبدل منتج؟</p>
              <p className="text-sm text-steel mt-1">قدّم طلبك هنا برقم الأوردر، واكتب المشكلة وضيف صورة للمنتج لو معاك.</p>
            </div>
            <ReturnRequestButton className="shrink-0" />
          </div>
        )}
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
      {others.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {others.map((p) => (
            <a key={p.slug} href={`/p/${p.slug}`} className="text-steel hover:text-ink underline underline-offset-4">{p.title}</a>
          ))}
        </div>
      )}
    </main>
  );
};
