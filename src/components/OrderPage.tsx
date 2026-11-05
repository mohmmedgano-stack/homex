import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { api, thumb } from '../lib/api';
import { trackPurchase } from '../lib/track';
import { FaWhatsapp } from 'react-icons/fa';
import { Check, Mail, Phone, MapPin, CreditCard, Banknote, Truck, PackageCheck, ClipboardCheck, XCircle } from 'lucide-react';

export type OrderView = {
  code: string; status: string; createdAt: string;
  name: string; phone: string; altPhone: string; email: string; city: string; address: string; notes: string;
  paymentMethod: string; paid: boolean; subtotal: number; shippingFee: number; total: number;
  items: { name: string; image: string; price: number; qty: number }[];
};

export const orderFromPath = (): { code: string; t: string } | null => {
  const m = location.pathname.match(/^\/o\/([A-Za-z0-9-]+)\/?$/);
  if (!m) return null;
  return { code: m[1], t: new URLSearchParams(location.search).get('t') || '' };
};

const money = (v: number) => `${Math.round(v).toLocaleString('en-US')} ج.م`;

const STEPS = [
  { id: 'pending', label: 'اتسجل', Icon: ClipboardCheck },
  { id: 'confirmed', label: 'اتأكد', Icon: Check },
  { id: 'shipped', label: 'اتشحن', Icon: Truck },
  { id: 'delivered', label: 'اتسلّم', Icon: PackageCheck },
];

/** Shopify-style order status page: /o/CODE?t=TOKEN — shown right after ordering and from the confirmation email. */
export const OrderPage: React.FC<{ code: string; t: string; fresh?: boolean }> = ({ code, t, fresh }) => {
  const { settings, clearCart, setCurrentView } = useStore();
  const [o, setO] = useState<OrderView | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('order-view', { code, t }).then(setO).catch((e) => setErr(e.message || 'الطلب مش موجود'));
    // back from the card payment page
    const q = new URLSearchParams(location.search);
    if (q.get('pay') === 'success') {
      clearCart();
      try {
        const pending = JSON.parse(sessionStorage.getItem('homex_pending_purchase') || 'null');
        if (pending && pending.code === code) setTimeout(() => trackPurchase(pending.code, pending.total, pending.items), 1500);
        sessionStorage.removeItem('homex_pending_purchase');
      } catch { /* ignore */ }
      history.replaceState(null, '', `/o/${code}?t=${t}`);
    }
    window.scrollTo({ top: 0 });
  }, [code, t]);

  useEffect(() => { document.title = `طلب ${code} | ${settings.store_name}`; }, [code, settings.store_name]);

  if (err) {
    return (
      <main className="flex-1 max-w-xl mx-auto px-4 py-16 text-center">
        <XCircle className="w-12 h-12 text-sale mx-auto" />
        <h1 className="text-xl font-extrabold text-ink mt-3">مش لاقيين الطلب ده</h1>
        <p className="text-sm text-steel mt-2">اتأكد إنك فاتح اللينك اللي وصلك في الإيميل كامل.</p>
        <a href="/" className="btn-gold inline-flex h-11 px-6 mt-6 rounded-xl items-center font-bold">رجوع للمتجر</a>
      </main>
    );
  }
  if (!o) {
    return <main className="flex-1 flex items-center justify-center py-24"><span className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" /></main>;
  }

  const first = o.name.split(' ')[0];
  const cancelled = o.status === 'cancelled' || o.status === 'returned';
  const stepIdx = Math.max(0, STEPS.findIndex((s) => s.id === o.status));
  const wa = (settings.whatsapp || '').replace(/\D/g, '').replace(/^00/, '').replace(/^0/, '20');
  const waText = `أهلاً، بخصوص طلبي رقم ${o.code} باسم ${o.name}`;
  const payLabel = o.paymentMethod === 'card' ? 'فيزا / ماستركارد' : 'الدفع عند الاستلام';

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
      <div className="grid lg:grid-cols-[1fr_380px] gap-5 lg:gap-8 items-start">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-4">
            <span className={`w-14 h-14 rounded-full border-2 flex items-center justify-center shrink-0 ${cancelled ? 'border-sale text-sale' : 'border-gold text-gold-deep'}`}>
              {cancelled ? <XCircle className="w-7 h-7" /> : <Check className="w-7 h-7" strokeWidth={3} />}
            </span>
            <div className="min-w-0">
              <p className="text-sm text-steel">رقم الطلب <span className="price font-bold text-ink" dir="ltr">#{o.code}</span></p>
              <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{fresh ? `شكراً يا ${first}!` : `أهلاً يا ${first}`}</h1>
            </div>
          </div>

          {/* Status */}
          <section className="bg-white rounded-2xl border border-line p-4 sm:p-6">
            {cancelled ? (
              <>
                <h2 className="font-extrabold text-ink text-lg">الطلب ده {o.status === 'returned' ? 'اترجع' : 'اتلغى'}</h2>
                <p className="text-sm text-steel mt-1">لو عندك أي سؤال كلمنا على الواتساب.</p>
              </>
            ) : (
              <>
                <h2 className="font-extrabold text-ink text-lg">
                  {o.status === 'delivered' ? 'طلبك اتسلّم، نتمنى يعجبك 🎉' : o.status === 'shipped' ? 'طلبك في الطريق ليك 🚚' : o.status === 'confirmed' ? 'طلبك اتأكد وبيتجهز' : 'طلبك وصلنا واتسجل'}
                </h2>
                <p className="text-sm text-steel mt-1 leading-relaxed">
                  {o.status === 'pending' && <>فريقنا هيكلمك على <b dir="ltr" className="text-ink">{o.phone}</b> يأكد معاك الطلب قبل الشحن.</>}
                  {o.status === 'confirmed' && 'بنجهّز طلبك عشان يتسلّم لشركة الشحن.'}
                  {o.status === 'shipped' && 'المندوب هيكلمك قبل ما يوصل.'}
                  {o.email && o.status === 'pending' && <> وبعتنالك إيميل التأكيد على <b className="text-ink" dir="ltr">{o.email}</b>.</>}
                </p>
                {/* timeline */}
                <ol className="grid grid-cols-4 mt-5">
                  {STEPS.map((s, i) => {
                    const done = i <= stepIdx;
                    return (
                      <li key={s.id} className="relative flex flex-col items-center text-center">
                        {i > 0 && <span className={`absolute top-4 left-1/2 w-full h-0.5 ${i <= stepIdx ? 'bg-gold' : 'bg-line'}`} aria-hidden="true" />}
                        <span className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${done ? 'bg-gold text-white' : 'bg-shelf text-steel border border-line'}`}>
                          <s.Icon className="w-4 h-4" />
                        </span>
                        <span className={`text-xs mt-1.5 font-bold ${done ? 'text-ink' : 'text-steel'}`}>{s.label}</span>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}
          </section>

          {/* Details */}
          <section className="bg-white rounded-2xl border border-line p-4 sm:p-6">
            <h2 className="font-extrabold text-ink text-lg mb-4">تفاصيل الطلب</h2>
            <div className="grid sm:grid-cols-2 gap-5 text-sm">
              <div>
                <h3 className="font-bold text-ink mb-1.5">بيانات التواصل</h3>
                <p className="text-steel flex items-center gap-2"><Phone className="w-4 h-4 shrink-0" /><span dir="ltr">{o.phone}{o.altPhone ? ` / ${o.altPhone}` : ''}</span></p>
                {o.email && <p className="text-steel flex items-center gap-2 mt-1"><Mail className="w-4 h-4 shrink-0" /><span dir="ltr" className="break-all">{o.email}</span></p>}
              </div>
              <div>
                <h3 className="font-bold text-ink mb-1.5">عنوان التوصيل</h3>
                <p className="text-steel flex items-start gap-2 leading-relaxed"><MapPin className="w-4 h-4 shrink-0 mt-0.5" /><span>{o.name}<br />{o.address}<br />{o.city}، مصر</span></p>
              </div>
              <div>
                <h3 className="font-bold text-ink mb-1.5">طريقة الدفع</h3>
                <p className="text-steel flex items-center gap-2">
                  {o.paymentMethod === 'card' ? <CreditCard className="w-4 h-4 shrink-0" /> : <Banknote className="w-4 h-4 shrink-0" />}
                  {payLabel} · <b className="text-ink price">{money(o.total)}</b>
                  {o.paymentMethod === 'card' && o.paid && <span className="text-xs font-bold text-save bg-save/10 px-1.5 py-0.5 rounded">مدفوع</span>}
                </p>
              </div>
              <div>
                <h3 className="font-bold text-ink mb-1.5">الشحن</h3>
                <p className="text-steel flex items-center gap-2"><Truck className="w-4 h-4 shrink-0" /> توصيل لحد البيت · {money(o.shippingFee)}</p>
              </div>
            </div>
            {o.notes && <p className="text-sm text-steel mt-4 pt-4 border-t border-line">ملاحظاتك: {o.notes}</p>}
          </section>

          <div className="flex flex-col sm:flex-row gap-2">
            {wa && (
              <a href={`https://wa.me/${wa}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer" className="sm:flex-1 h-12 shrink-0 rounded-xl bg-[#25D366] text-white font-extrabold flex items-center justify-center gap-2">
                <FaWhatsapp className="w-5 h-5" /> كلمنا واتساب بخصوص الطلب
              </a>
            )}
            <a href="/" onClick={() => setCurrentView('store')} className="sm:flex-1 h-12 shrink-0 rounded-xl btn-gold font-extrabold flex items-center justify-center">كمّل تسوق</a>
          </div>
        </div>

        {/* Summary */}
        <aside className="bg-white rounded-2xl border border-line p-4 sm:p-6 lg:sticky lg:top-24">
          <h2 className="font-extrabold text-ink mb-3">ملخص الطلب</h2>
          <ul className="space-y-3">
            {o.items.map((i, k) => (
              <li key={k} className="flex items-center gap-3">
                <span className="relative shrink-0">
                  {i.image ? <img src={thumb(i.image)} alt="" className="w-14 h-14 rounded-lg object-cover border border-line bg-shelf" /> : <span className="block w-14 h-14 rounded-lg bg-shelf" />}
                  <span className="absolute -top-2 -left-2 min-w-5 h-5 px-1 rounded-full bg-steel text-white text-[11px] font-bold flex items-center justify-center price">{i.qty}</span>
                </span>
                <span className="flex-1 min-w-0 text-sm font-bold text-ink line-clamp-2">{i.name}</span>
                <span className="price text-sm font-bold text-ink shrink-0">{money(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 pt-4 border-t border-line space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-steel">المنتجات</dt><dd className="price">{money(o.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-steel">الشحن</dt><dd className="price">{money(o.shippingFee)}</dd></div>
            <div className="flex justify-between pt-2 border-t border-line text-base"><dt className="font-extrabold text-ink">الإجمالي</dt><dd className="price font-black text-ink text-lg">{money(o.total)}</dd></div>
            <div className="flex justify-between text-xs">
              <dt className="text-steel">{o.paymentMethod === 'card' && o.paid ? 'اتدفع' : 'هتدفع عند الاستلام'}</dt>
              <dd className="price text-steel">{money(o.total)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </main>
  );
};
