import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Spinner, Empty, Stat, useToast } from '../ui';
import { Users, Eye, Smartphone, ShoppingBag, MapPin, Share2, Cpu, Globe, FileText, Monitor, Tablet } from 'lucide-react';

type Row = { label: string; count: number };
interface Data {
  days: number; total: number; unique: number; orders: number; mobileShare: number; placed: number;
  series: { day: string; visits: number; visitors: number }[];
  governorates: Row[]; cities: Row[]; countries: Row[]; sources: Row[]; devices: Row[];
  os: Row[]; brands: Row[]; models: Row[]; browsers: Row[]; pages: Row[];
}

const PERIODS = [{ d: 1, l: 'النهارده' }, { d: 7, l: '7 أيام' }, { d: 30, l: '30 يوم' }, { d: 90, l: '3 شهور' }];
const fmt = (n: number) => n.toLocaleString('en-US');

/** A ranked list with a bar and the share of the total. */
const Ranked: React.FC<{ rows: Row[]; total?: number; empty?: string }> = ({ rows, total, empty = 'لسه مفيش بيانات' }) => {
  if (!rows.length) return <p className="text-sm text-steel py-2">{empty}</p>;
  const sum = total || rows.reduce((a, r) => a + r.count, 0);
  const max = rows[0].count || 1;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink font-bold truncate" dir="auto">{r.label}</span>
            <span className="price text-steel shrink-0">{fmt(r.count)} <span className="text-xs">· {Math.round((r.count / sum) * 100)}%</span></span>
          </div>
          <div className="h-2 rounded-full bg-ink/5 mt-1 overflow-hidden"><div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(3, (r.count / max) * 100)}%` }} /></div>
        </li>
      ))}
    </ul>
  );
};

const DEVICE_ICON: Record<string, React.ReactNode> = {
  'موبايل': <Smartphone className="w-5 h-5" />, 'تابلت': <Tablet className="w-5 h-5" />, 'كمبيوتر': <Monitor className="w-5 h-5" />,
};

/** «الزوار»: where people open the store from and what they open it on. */
export const Visitors: React.FC = () => {
  const toast = useToast();
  const [days, setDays] = useState(7);
  const [d, setD] = useState<Data | null>(null);
  const [tab, setTab] = useState<'models' | 'brands' | 'os' | 'browsers'>('brands');

  useEffect(() => {
    setD(null);
    api.get<Data>('admin/visitors', { days: String(days) }).then(setD).catch((e) => toast(e.message, 'err'));
  }, [days]);

  const peak = d ? Math.max(1, ...d.series.map((s) => s.visits)) : 1;
  const conv = d && d.unique ? ((d.orders / d.unique) * 100).toFixed(1) : '0';
  const egypt = d ? d.governorates.reduce((a, r) => a + r.count, 0) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-ink">الزوار</h1>
          <p className="text-sm text-steel mt-1">الناس بتدخل الموقع منين، وجاية من أنهي مكان، وبتفتح من أنهي جهاز. زياراتك إنت والفريق وانتوا مسجلين دخول مش بتتحسب.</p>
        </div>
        <div className="flex gap-1 p-1 rounded-full glass self-start shrink-0" role="tablist">
          {PERIODS.map((p) => (
            <button key={p.d} role="tab" aria-selected={days === p.d} onClick={() => setDays(p.d)}
              className={`px-3.5 py-2 rounded-full text-sm font-bold cursor-pointer transition ${days === p.d ? 'bg-ink text-white' : 'text-ink/70'}`}>{p.l}</button>
          ))}
        </div>
      </div>

      {!d ? <Spinner /> : d.total === 0 ? (
        <Card><Empty title="لسه مفيش زيارات في الفترة دي" text="أول ما حد يفتح الموقع هيظهر هنا: جاي منين وبيفتح من إيه." /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="زيارات" value={fmt(d.total)} icon={<Eye className="w-4 h-4" />} />
            <Stat label="زوار مختلفين" value={fmt(d.unique)} icon={<Users className="w-4 h-4" />} />
            <Stat label="من الموبايل" value={`${d.mobileShare}%`} icon={<Smartphone className="w-4 h-4" />} tone="brand" />
            <Stat label="نسبة الطلب" value={`${conv}%`} sub={`${fmt(d.orders)} طلب`} icon={<ShoppingBag className="w-4 h-4" />} tone="good" />
          </div>

          {d.series.length > 1 && (
            <Card title="الزيارات يوم بيوم">
              <div className="flex items-end gap-[3px] h-36" dir="ltr">
                {d.series.map((s) => (
                  <div key={s.day} className="flex-1 h-full flex flex-col justify-end group relative" title={`${s.day}: ${s.visits} زيارة · ${s.visitors} زائر`}>
                    <div className="rounded-t bg-gold/80 group-hover:bg-gold-deep transition-colors" style={{ height: `${(s.visits / peak) * 100}%`, minHeight: s.visits ? 3 : 0 }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-steel mt-2 price" dir="ltr">
                <span>{d.series[0].day.slice(5)}</span><span>{d.series[d.series.length - 1].day.slice(5)}</span>
              </div>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <Card title={<span className="flex items-center gap-2"><MapPin className="w-5 h-5 text-gold-deep" /> المحافظات</span>}>
              <Ranked rows={d.governorates} total={egypt} empty="لسه بنحدد أماكن الزوار، بتظهر خلال دقايق من الزيارة." />
              {d.placed < d.total && <p className="text-xs text-steel mt-3">{fmt(d.total - d.placed)} زيارة مكانها متحددش.</p>}
            </Card>
            <Card title={<span className="flex items-center gap-2"><Share2 className="w-5 h-5 text-gold-deep" /> جايين منين</span>}>
              <Ranked rows={d.sources} />
              <p className="text-xs text-steel mt-3">«دخول مباشر» يعني كتب اسم الموقع بنفسه، أو فتح لينك من رسالة ومعرفناش مصدره.</p>
            </Card>
            <Card title={<span className="flex items-center gap-2"><MapPin className="w-5 h-5 text-gold-deep" /> المدن</span>}>
              <Ranked rows={d.cities} />
            </Card>
            <Card title={<span className="flex items-center gap-2"><Smartphone className="w-5 h-5 text-gold-deep" /> نوع الجهاز</span>}>
              <div className="grid grid-cols-3 gap-2">
                {d.devices.map((r) => (
                  <div key={r.label} className="rounded-xl bg-white/60 p-3 text-center">
                    <span className="inline-flex text-gold-deep">{DEVICE_ICON[r.label]}</span>
                    <b className="block price text-lg text-ink mt-1">{Math.round((r.count / d.total) * 100)}%</b>
                    <span className="block text-xs text-steel">{r.label}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card title={<span className="flex items-center gap-2"><Cpu className="w-5 h-5 text-gold-deep" /> الأجهزة</span>}
            action={
              <div className="flex gap-1 overflow-x-auto -mx-1 px-1" role="tablist">
                {([['brands', 'الشركة'], ['models', 'الموديل'], ['os', 'النظام'], ['browsers', 'المتصفح']] as const).map(([k, l]) => (
                  <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                    className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap cursor-pointer ${tab === k ? 'bg-ink text-white' : 'bg-white/60 text-ink/70'}`}>{l}</button>
                ))}
              </div>
            }>
            <Ranked rows={d[tab]} total={d.total} />
            {tab === 'models' && <p className="text-xs text-steel mt-3">الآيفون مبيقولش موديله بالظبط، فبنعرفه من مقاس الشاشة ويظهر كمجموعة موديلات بنفس المقاس.</p>}
            {tab === 'browsers' && <p className="text-xs text-steel mt-3">«داخل فيسبوك» و«داخل إنستجرام» يعني فتح الموقع من لينك جوه التطبيق من غير ما يخرج منه.</p>}
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card title={<span className="flex items-center gap-2"><FileText className="w-5 h-5 text-gold-deep" /> أول صفحة دخلوا عليها</span>}>
              <Ranked rows={d.pages} />
            </Card>
            {d.countries.length > 1 && (
              <Card title={<span className="flex items-center gap-2"><Globe className="w-5 h-5 text-gold-deep" /> الدول</span>}>
                <Ranked rows={d.countries} />
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
};
