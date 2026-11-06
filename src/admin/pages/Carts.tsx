import React, { useEffect, useState } from 'react';
import { api, money, thumb } from '../../lib/api';
import { Card, Spinner, Empty, Input, Button, useToast } from '../ui';
import { FaWhatsapp } from 'react-icons/fa';
import { Phone, Check, X, RotateCcw, ShoppingCart, TrendingUp } from 'lucide-react';

type Cart = {
  id: number; name: string; phone: string; city: string; total: number; status: string; orderCode: string; note: string; handledBy: string;
  createdAt: string; updatedAt: string; items: { id: number; name: string; price: number; qty: number; image: string }[];
};

const TABS: [string, string][] = [['open', 'محتاجين متابعة'], ['contacted', 'اتواصلنا معاهم'], ['ordered', 'كمّلوا الطلب'], ['dismissed', 'اتقفلت']];

const ago = (t: string) => {
  const d = (Date.now() - new Date(t.replace(' ', 'T') + ':00+02:00').getTime()) / 60000;
  if (d < 60) return `من ${Math.max(1, Math.round(d))} دقيقة`;
  if (d < 1440) return `من ${Math.round(d / 60)} ساعة`;
  return `من ${Math.round(d / 1440)} يوم`;
};

/** Customers who typed their name and phone at checkout but never placed the order. */
export const Carts: React.FC = () => {
  const toast = useToast();
  const [tab, setTab] = useState('open');
  const [d, setD] = useState<{ carts: Cart[]; counts: Record<string, { n: number; value: number }>; recovered: { n: number; value: number } } | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const load = () => api.get('admin/carts', { status: tab }).then(setD).catch((e) => toast(e.message, 'err'));
  useEffect(() => { setD(null); load(); }, [tab]);

  const update = async (c: Cart, status: string) => {
    try {
      setD(await api.post('admin/cart', { id: c.id, status, note: notes[c.id] ?? c.note, view: tab }));
      toast(status === 'contacted' ? 'اتسجل إنك كلمته' : status === 'dismissed' ? 'السلة اتقفلت' : 'رجعت للمتابعة');
    } catch (e: any) { toast(e.message, 'err'); }
  };

  const waLink = (c: Cart) => {
    const first = c.name.split(' ')[0] || '';
    const list = c.items.map((i) => `• ${i.name}${i.qty > 1 ? ` × ${i.qty}` : ''}`).join('\n');
    const msg = `أهلاً ${first} 👋 معاك HOMEX.\nلاحظنا إنك كنت بتطلب:\n${list}\nبإجمالي ${Math.round(c.total).toLocaleString('en-US')} ج.م\nلو محتاج أي مساعدة أو عندك سؤال قبل ما تكمّل، إحنا معاك، ونقدر نأكدلك الطلب على طول من هنا 🙏`;
    return `https://wa.me/${c.phone.replace(/^0/, '20')}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">السلات المتروكة</h1>
        <p className="text-sm text-steel mt-1">عملاء كتبوا اسمهم ورقمهم في صفحة الطلب ومكمّلوش. كلّمهم على الواتساب وغالباً هيكمّلوا.</p>
      </div>

      {d && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <Stat label="محتاجين متابعة" value={String(d.counts.open?.n || 0)} sub={money(d.counts.open?.value || 0)} />
          <Stat label="اتواصلنا معاهم" value={String(d.counts.contacted?.n || 0)} sub={money(d.counts.contacted?.value || 0)} />
          <Stat label="كمّلوا الطلب" value={String(d.counts.ordered?.n || 0)} sub={money(d.counts.ordered?.value || 0)} />
          <Stat label="رجعوا بعد ما كلمناهم" value={String(d.recovered.n)} sub={money(d.recovered.value)} good />
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id}
            className={`shrink-0 h-9 px-3.5 rounded-lg text-sm font-bold border ${tab === id ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-line'}`}>
            {label} {d?.counts[id] ? <span className="opacity-60 price">({d.counts[id].n})</span> : null}
          </button>
        ))}
      </div>

      {!d ? <Spinner /> : d.carts.length === 0 ? (
        <Card><Empty title="مفيش حاجة هنا" text={tab === 'open' ? 'أول ما عميل يكتب رقمه ويسيب صفحة الطلب أكتر من نص ساعة هيظهر هنا.' : undefined} /></Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-3">
          {d.carts.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-extrabold text-ink">{c.name || 'بدون اسم'}</p>
                  <p className="text-sm text-steel"><span dir="ltr" className="price">{c.phone}</span>{c.city ? ` · ${c.city}` : ''}</p>
                  <p className="text-xs text-steel mt-0.5">{ago(c.updatedAt)}{c.handledBy ? ` · كلمه ${c.handledBy}` : ''}{c.orderCode ? ` · طلب ${c.orderCode}` : ''}</p>
                </div>
                <span className="price font-black text-ink text-lg shrink-0">{money(c.total)}</span>
              </div>
              <ul className="mt-3 space-y-2">
                {c.items.map((i) => (
                  <li key={i.id} className="flex items-center gap-2 text-sm">
                    {i.image ? <img src={thumb(i.image)} alt="" className="w-10 h-10 rounded-lg object-cover bg-shelf shrink-0" /> : <span className="w-10 h-10 rounded-lg bg-shelf shrink-0" />}
                    <span className="flex-1 min-w-0 line-clamp-1">{i.name}</span>
                    <span className="text-steel price shrink-0">× {i.qty}</span>
                  </li>
                ))}
              </ul>
              {(tab === 'open' || tab === 'contacted') && (
                <>
                  <Input className="mt-3" value={notes[c.id] ?? c.note} onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })} placeholder="ملاحظة: مثلاً قال هيكلمنا بكرة" />
                  <div className="flex flex-wrap gap-2 mt-3">
                    <a href={waLink(c)} target="_blank" rel="noopener noreferrer" onClick={() => tab === 'open' && update(c, 'contacted')}
                      className="h-10 px-4 rounded-lg bg-[#25D366] text-white text-sm font-bold flex items-center gap-1.5"><FaWhatsapp className="w-4 h-4" /> واتساب</a>
                    <a href={`tel:${c.phone}`} onClick={() => tab === 'open' && update(c, 'contacted')} className="h-10 px-4 rounded-lg bg-ink text-white text-sm font-bold flex items-center gap-1.5"><Phone className="w-4 h-4" /> اتصال</a>
                    {tab === 'open' && <Button variant="ghost" className="h-10" onClick={() => update(c, 'contacted')}><Check className="w-4 h-4" /> كلمته</Button>}
                    {tab === 'contacted' && <Button variant="ghost" className="h-10" onClick={() => update(c, 'contacted')}><Check className="w-4 h-4" /> احفظ الملاحظة</Button>}
                    <Button variant="ghost" className="h-10 text-steel" onClick={() => update(c, 'dismissed')}><X className="w-4 h-4" /> اقفلها</Button>
                  </div>
                </>
              )}
              {tab === 'dismissed' && <Button variant="ghost" className="h-9 mt-3" onClick={() => update(c, 'open')}><RotateCcw className="w-4 h-4" /> رجّعها للمتابعة</Button>}
              {c.note && tab !== 'open' && tab !== 'contacted' && <p className="text-xs text-steel mt-2">ملاحظة: {c.note}</p>}
            </Card>
          ))}
        </div>
      )}
      <p className="text-xs text-steel flex items-center gap-1.5"><ShoppingCart className="w-4 h-4" /> لو العميل كمّل الطلب بعدين بنفس الرقم، السلة بتتنقل لوحدها لـ«كمّلوا الطلب». <TrendingUp className="w-4 h-4 mr-2" /> «رجعوا بعد ما كلمناهم» = فلوس رجعت بسبب المتابعة.</p>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; sub: string; good?: boolean }> = ({ label, value, sub, good }) => (
  <div className="bg-white rounded-xl border border-line p-3">
    <p className="text-xs text-steel">{label}</p>
    <p className={`price text-xl font-black mt-0.5 ${good ? 'text-save' : 'text-ink'}`}>{value}</p>
    <p className="text-xs text-steel price">{sub}</p>
  </div>
);
