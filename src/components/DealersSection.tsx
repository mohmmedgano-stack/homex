import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { api } from '../lib/api';
import { EGYPT_GOVERNORATES } from '../data/governorates';
import { Phone, MessageCircle, MapPin, Clock, BadgeCheck, Store } from 'lucide-react';

interface Dealer {
  id: number;
  name: string;
  governorate: string;
  area: string;
  address: string;
  phone: string;
  whatsapp: string;
  mapUrl: string;
  logo: string;
  categories: string[];
  hours: string;
  featured: boolean;
}

const GOV_KEY = 'homex_gov';
const waLink = (n: string) => `https://wa.me/${n.replace(/\D/g, '').replace(/^0/, '20')}`;

export const DealersSection: React.FC = () => {
  const { categories } = useStore();
  const [dealers, setDealers] = useState<Dealer[] | null>(null);
  const [gov, setGov] = useState<string>(() => {
    try {
      return localStorage.getItem(GOV_KEY) || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    api.get<Dealer[]>('dealers').then(setDealers).catch(() => setDealers([]));
  }, []);

  const govs = useMemo(() => EGYPT_GOVERNORATES.filter((g) => dealers?.some((d) => d.governorate === g)), [dealers]);
  if (!dealers || dealers.length === 0) return null;

  const pick = (g: string) => {
    setGov(g);
    try {
      localStorage.setItem(GOV_KEY, g);
    } catch {}
  };
  const shown = gov ? dealers.filter((d) => d.governorate === gov) : dealers;
  const catName = (id: string) => categories.find((c) => c.id === id)?.name;
  const track = (d: Dealer, kind: 'call' | 'whatsapp' | 'map') => api.post('dealer-click', { id: d.id, kind }).catch(() => {});

  return (
    <section id="dealers-section" className="scroll-mt-40">
      <div className="bg-ink rounded-2xl p-5 sm:p-8 text-white">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2">
              <Store className="w-6 h-6 text-gold-hi" /> اشتري من أقرب تاجر معتمد
            </h2>
            <p className="text-sm text-white/75 mt-2 leading-relaxed">
              منتجات HOMEX متوفرة عند تجار معتمدين في محافظات مصر، بنفس الضمان. اختار محافظتك وكلّم أقرب تاجر ليك.
            </p>
          </div>
          <label className="w-full sm:w-64">
            <span className="sr-only">اختار محافظتك</span>
            <select
              value={gov}
              onChange={(e) => pick(e.target.value)}
              className="w-full h-12 rounded-xl px-3 bg-white text-ink font-bold border-2 border-transparent focus:outline-hidden focus:border-gold"
            >
              <option value="">كل المحافظات ({dealers.length} تاجر)</option>
              {govs.map((g) => (
                <option key={g} value={g}>
                  {g} ({dealers.filter((d) => d.governorate === g).length})
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
        {shown.map((d) => {
          const cats = d.categories.map(catName).filter(Boolean);
          return (
            <article key={d.id} className={`bg-white rounded-2xl border p-4 sm:p-5 flex flex-col ${d.featured ? 'border-gold ring-1 ring-gold/30' : 'border-line'}`}>
              <div className="flex items-start gap-3">
                {d.logo ? (
                  <img src={d.logo} alt="" className="w-14 h-14 rounded-xl object-cover bg-shelf shrink-0" loading="lazy" />
                ) : (
                  <span className="w-14 h-14 rounded-xl bg-shelf shrink-0 flex items-center justify-center text-xl font-black text-ink">{d.name.slice(0, 1)}</span>
                )}
                <div className="min-w-0">
                  <h3 className="font-extrabold text-ink leading-snug">{d.name}</h3>
                  <p className="text-sm text-steel mt-0.5">{d.governorate}{d.area ? `، ${d.area}` : ''}</p>
                  <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-bold text-save">
                    <BadgeCheck className="w-4 h-4" /> {d.featured ? 'تاجر مميز معتمد' : 'تاجر معتمد'}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-sm text-steel flex-1">
                {d.address && (
                  <p className="flex items-start gap-2"><MapPin className="w-4 h-4 shrink-0 mt-0.5" /> {d.address}</p>
                )}
                {d.hours && (
                  <p className="flex items-start gap-2"><Clock className="w-4 h-4 shrink-0 mt-0.5" /> {d.hours}</p>
                )}
                <p className="text-xs pt-1">{cats.length ? `عنده: ${cats.join('، ')}` : 'عنده كل منتجات HOMEX'}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4">
                {d.phone ? (
                  <a href={`tel:${d.phone}`} onClick={() => track(d, 'call')} className="h-10 rounded-lg bg-ink text-white text-sm font-bold flex items-center justify-center gap-1.5">
                    <Phone className="w-4 h-4" /> اتصال
                  </a>
                ) : <span />}
                {d.whatsapp ? (
                  <a href={waLink(d.whatsapp)} target="_blank" rel="noopener noreferrer" onClick={() => track(d, 'whatsapp')} className="h-10 rounded-lg bg-[#25D366] text-white text-sm font-bold flex items-center justify-center gap-1.5">
                    <MessageCircle className="w-4 h-4" /> واتساب
                  </a>
                ) : <span />}
                {d.mapUrl ? (
                  <a href={d.mapUrl} target="_blank" rel="noopener noreferrer" onClick={() => track(d, 'map')} className="h-10 rounded-lg border border-line text-ink text-sm font-bold flex items-center justify-center gap-1.5 hover:border-ink">
                    <MapPin className="w-4 h-4" /> الخريطة
                  </a>
                ) : <span />}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
