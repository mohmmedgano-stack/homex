import React, { useEffect, useState } from 'react';
import { api, thumb, money } from '../../lib/api';
import { Card, Spinner, Empty, StatusBadge, useToast } from '../ui';
import { Gift, CalendarHeart, ExternalLink, MapPin, Phone } from 'lucide-react';

/** «قوايم العرايس»: the gift lists brides made, what's been bought from each, and the gift orders. */
export const Registries: React.FC = () => {
  const toast = useToast();
  const [d, setD] = useState<any[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => { api.get('admin/registries').then((r) => setD(r.registries)).catch((e) => toast(e.message, 'err')); }, []);
  if (!d) return <Spinner />;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">قوايم العرايس</h1>
        <p className="text-sm text-steel mt-1">القوايم اللي العرايس عملوها من صفحة «قايمة جهاز العروسة» (home-x.online/w). طلبات الهدايا بتوصلك في الطلبات عادي، ومكتوب في ملاحظاتها إنها هدية ولأنهي قايمة.</p>
      </div>
      {d.length === 0 ? <Card><Empty title="لسه مفيش قوايم" text="أول ما عروسة تعمل قايمة هتظهر هنا." /></Card> : d.map((r) => {
        const wanted = r.items.reduce((a: number, i: any) => a + i.wanted, 0);
        const bought = r.items.reduce((a: number, i: any) => a + i.bought, 0);
        const isOpen = open === r.id;
        return (
          <Card key={r.id}>
            <button className="w-full text-right flex items-start gap-3" onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen}>
              <span className="w-11 h-11 rounded-xl bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"><Gift className="w-5 h-5" /></span>
              <span className="flex-1 min-w-0">
                <b className="block text-ink">{r.title}</b>
                <span className="block text-xs text-steel mt-0.5"><span dir="ltr" className="price">{r.code}</span> · {r.fullName} · اتعملت {r.createdAt.slice(0, 10)}{r.weddingDate && <> · <CalendarHeart className="inline w-3.5 h-3.5" /> {r.weddingDate}</>}</span>
                <span className="block h-1.5 rounded-full bg-line mt-2 overflow-hidden"><span className="block h-full bg-gold rounded-full" style={{ width: `${wanted ? (bought / wanted) * 100 : 0}%` }} /></span>
                <span className="block text-xs text-steel mt-1">اتجاب <span className="price">{bought}</span> من <span className="price">{wanted}</span> · {r.orders.length} طلب هدية</span>
              </span>
            </button>
            {isOpen && (
              <div className="mt-4 space-y-4">
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-steel" /> <span dir="ltr" className="price">{r.phone}</span></p>
                  <p className="flex items-start gap-2"><MapPin className="w-4 h-4 text-steel mt-0.5" /> {r.city} — {r.address}</p>
                </div>
                <ul className="divide-y divide-line">
                  {r.items.map((i: any) => (
                    <li key={i.product.id} className="py-2 flex items-center gap-3">
                      <img src={thumb(i.product.image)} alt="" className="w-10 h-10 rounded-lg object-cover bg-shelf" />
                      <span className="flex-1 min-w-0 text-sm font-bold text-ink truncate">{i.product.name}</span>
                      <span className={`text-sm font-bold price ${i.bought >= i.wanted ? 'text-save' : 'text-steel'}`}>{i.bought}/{i.wanted}</span>
                    </li>
                  ))}
                </ul>
                {r.orders.length > 0 && (
                  <div>
                    <p className="text-sm font-extrabold text-ink mb-1">طلبات الهدايا</p>
                    <ul className="divide-y divide-line">
                      {r.orders.map((o: any) => (
                        <li key={o.code} className="py-2 flex items-center justify-between gap-2 text-sm">
                          <span><b>{o.customer_name}</b> <span dir="ltr" className="price text-steel">{o.code}</span></span>
                          <span className="flex items-center gap-2"><span className="price font-bold">{money(o.total)}</span><StatusBadge s={o.status} /></span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <a href={`/w/${r.code}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-bold text-gold-deep"><ExternalLink className="w-4 h-4" /> افتح القايمة زي ما الضيوف بيشوفوها</a>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
