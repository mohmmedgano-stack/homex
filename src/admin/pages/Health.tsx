import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Spinner, Stat, useToast } from '../ui';
import { Activity, AlertTriangle, CheckCircle2, Gauge, HardDrive, Database, Archive, Search, ServerCrash, Mail, RefreshCw } from 'lucide-react';

interface Alert { rule: string; severity: 'critical' | 'warning'; title: string; desc: string; firing: boolean; since: number; value: string }
interface Log { id: number; at: number; level: string; source: string; message: string; ctx: string }
interface Data {
  hours: number; total: number; errors5: number; errors4: number; errorRate: number; p95: number | null; avg: number;
  series: { t: number; n: number; e: number; avg: number }[]; step: number;
  routes: { route: string; n: number; avg: number; max: number; errors: number }[];
  alerts: Alert[]; logs: Log[]; logCounts: Record<string, number>;
  disk: { free: number | null; total: number | null; db: number }; lastBackup: number; php: string; memoryPeak: number;
  notifyEmail: boolean; lastTick: number;
}

const PERIODS = [{ h: 1, l: 'ساعة' }, { h: 6, l: '6 ساعات' }, { h: 24, l: '24 ساعة' }, { h: 168, l: '7 أيام' }];
const LEVELS: Record<string, { l: string; cls: string }> = {
  critical: { l: 'خطير', cls: 'bg-sale text-white' },
  error: { l: 'خطأ', cls: 'bg-sale/15 text-sale' },
  warning: { l: 'تحذير', cls: 'bg-amber-100 text-amber-800' },
  info: { l: 'معلومة', cls: 'bg-ink/10 text-ink/70' },
};
const SOURCES: Record<string, string> = { server: 'السيرفر', browser: 'متصفح زائر', alert: 'التنبيهات', payment: 'الدفع' };
const ROUTES: Record<string, string> = {
  'GET catalog': 'تحميل المنتجات', 'GET settings': 'إعدادات المتجر', 'POST order': 'تسجيل طلب', 'GET img': 'الصور', 'POST visit': 'تسجيل زيارة',
  'PAGE home': 'الصفحة الرئيسية', 'PAGE product': 'صفحة منتج', 'PAGE page': 'صفحة تعريفية', 'POST login': 'دخول لوحة التحكم',
  'GET admin/orders': 'لوحة: الطلبات', 'GET admin/stats': 'لوحة: الرئيسية', 'GET admin/visitors': 'لوحة: الزوار', 'GET admin/health': 'لوحة: صحة الموقع', 'GET me': 'فتح لوحة التحكم', 'GET ping': 'فحص من بره',
};
const fmt = (n: number) => n.toLocaleString('en-US');
const sec = (ms: number | null) => (ms == null ? '—' : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);
const size = (b: number | null) => (b == null ? '—' : b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${(b / 1e6).toFixed(1)} MB`);
const ago = (t: number) => {
  const s = Math.max(0, Date.now() / 1000 - t);
  if (s < 60) return 'من ثواني';
  if (s < 3600) return `من ${Math.floor(s / 60)} دقيقة`;
  if (s < 86400) return `من ${Math.floor(s / 3600)} ساعة`;
  return `من ${Math.floor(s / 86400)} يوم`;
};
const clock = (t: number) => new Date(t * 1000).toLocaleString('ar-EG', { weekday: 'short', hour: 'numeric', minute: '2-digit' });

/** «صحة الموقع»: is the site OK right now, how fast it answers, what broke, and the alerts that email the owner. */
export const Health: React.FC = () => {
  const toast = useToast();
  const [hours, setHours] = useState(24);
  const [d, setD] = useState<Data | null>(null);
  const [level, setLevel] = useState('');
  const [source, setSource] = useState('');
  const [q, setQ] = useState('');
  const [qLive, setQLive] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { const t = setTimeout(() => setQ(qLive), 350); return () => clearTimeout(t); }, [qLive]);
  useEffect(() => {
    api.get<Data>('admin/health', { hours: String(hours), level, source, q }).then(setD).catch((e) => toast(e.message, 'err'));
  }, [hours, level, source, q, tick]);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 60_000); return () => clearInterval(t); }, []);

  if (!d) return <Spinner />;
  const firing = d.alerts.filter((a) => a.firing);
  const critical = firing.some((a) => a.severity === 'critical');
  const peak = Math.max(1, ...d.series.map((s) => s.n));
  const freePct = d.disk.free != null && d.disk.total ? Math.round((100 * d.disk.free) / d.disk.total) : null;
  const backupAge = d.lastBackup ? (Date.now() / 1000 - d.lastBackup) / 3600 : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-ink">صحة الموقع</h1>
          <p className="text-sm text-steel mt-1">كل طلب على الموقع بيتقاس، والأخطاء بتتسجل هنا، ولو حاجة وقعت يوصلك إيميل.</p>
        </div>
        <div className="flex items-center gap-2 self-start shrink-0">
          <button onClick={() => setTick((x) => x + 1)} className="w-10 h-10 rounded-full glass grid place-items-center cursor-pointer" aria-label="تحديث"><RefreshCw className="w-4 h-4" /></button>
          <div className="flex gap-1 p-1 rounded-full glass" role="tablist">
            {PERIODS.map((p) => (
              <button key={p.h} role="tab" aria-selected={hours === p.h} onClick={() => setHours(p.h)}
                className={`px-3 py-2 rounded-full text-sm font-bold cursor-pointer whitespace-nowrap ${hours === p.h ? 'bg-ink text-white' : 'text-ink/70'}`}>{p.l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Status */}
      <div className={`rounded-2xl p-4 sm:p-5 flex items-start gap-3 ${firing.length ? (critical ? 'bg-sale text-white' : 'bg-amber-100 text-amber-900') : 'bg-emerald-600 text-white'}`}>
        {firing.length ? <AlertTriangle className="w-7 h-7 shrink-0" /> : <CheckCircle2 className="w-7 h-7 shrink-0" />}
        <div className="min-w-0">
          <b className="block text-lg">{firing.length ? `فيه ${firing.length === 1 ? 'تنبيه' : `${firing.length} تنبيهات`} شغال دلوقتي` : 'الموقع شغال تمام'}</b>
          {firing.length ? (
            <ul className="mt-1 text-sm space-y-0.5">{firing.map((a) => <li key={a.rule}>• {a.title}{a.value && ` (${a.value})`} — {ago(a.since)}</li>)}</ul>
          ) : (
            <span className="text-sm opacity-90">آخر فحص {d.lastTick ? ago(d.lastTick) : '—'}. مفيش ولا قاعدة من قواعد التنبيه شغالة.</span>
          )}
        </div>
      </div>
      {!d.notifyEmail && (
        <div className="rounded-2xl p-3.5 bg-white/70 text-sm text-ink flex items-start gap-2.5">
          <Mail className="w-5 h-5 text-gold-deep shrink-0 mt-0.5" />
          <span>إيميلات التنبيه مش هتوصل لحد ما تكتب <b>إيميل تنبيه الطلبات</b> في إعدادات المتجر. هو نفس الإيميل اللي بيوصله الطلبات الجديدة.</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="طلبات على السيرفر" value={fmt(d.total)} icon={<Activity className="w-4 h-4" />} />
        <Stat label="أخطاء السيرفر" value={`${d.errorRate}%`} sub={`${fmt(d.errors5)} خطأ 500`} icon={<ServerCrash className="w-4 h-4" />} tone={d.errors5 ? 'bad' : 'good'} />
        <Stat label="أبطأ 5% (p95)" value={sec(d.p95)} sub={`المتوسط ${sec(d.avg)}`} icon={<Gauge className="w-4 h-4" />} tone={d.p95 != null && d.p95 > 2000 ? 'bad' : 'default'} />
        <Stat label="المساحة الفاضية" value={freePct == null ? '—' : `${freePct}%`} sub={`قاعدة البيانات ${size(d.disk.db)}`} icon={<HardDrive className="w-4 h-4" />} tone={freePct != null && freePct < 10 ? 'bad' : 'default'} />
      </div>

      <Card title="الطلبات على السيرفر">
        <div className="flex items-end gap-[2px] h-36" dir="ltr">
          {d.series.map((s) => (
            <div key={s.t} className="flex-1 h-full flex flex-col justify-end" title={`${clock(s.t)}: ${s.n} طلب · ${s.e} خطأ · متوسط ${sec(s.avg)}`}>
              {s.e > 0 && <div className="bg-sale rounded-t" style={{ height: `${Math.max(3, (s.e / peak) * 100)}%` }} />}
              <div className={`bg-gold/80 ${s.e ? '' : 'rounded-t'}`} style={{ height: `${((s.n - s.e) / peak) * 100}%`, minHeight: s.n ? 2 : 0 }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-steel mt-2" dir="ltr">
          <span>{d.series[0] && clock(d.series[0].t)}</span>
          <span className="flex items-center gap-3"><span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-gold/80" /> طلبات</span><span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-sale" /> أخطاء</span></span>
          <span>دلوقتي</span>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="قواعد التنبيه">
          <ul className="divide-y divide-ink/10">
            {d.alerts.map((a) => (
              <li key={a.rule} className="py-2.5 flex items-start gap-3">
                <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${a.firing ? (a.severity === 'critical' ? 'bg-sale animate-pulse' : 'bg-amber-500 animate-pulse') : 'bg-emerald-500'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <b className="text-sm text-ink">{a.title}</b>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${a.severity === 'critical' ? 'bg-sale/10 text-sale' : 'bg-amber-100 text-amber-800'}`}>{a.severity === 'critical' ? 'خطير' : 'تحذير'}</span>
                  </div>
                  <p className="text-xs text-steel mt-0.5">{a.firing ? `شغال ${ago(a.since)}${a.value ? ` · ${a.value}` : ''}` : a.desc}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-steel mt-3">كل مشكلة بيوصلك عنها إيميل واحد بس، ولما تتحل يوصلك إيميل إنها اتحلت. لو السيرفر نفسه فيه أخطاء، مش هيبعتلك كمان عن البطء لأنهم غالباً نفس المشكلة.</p>
        </Card>

        <div className="space-y-4">
          <Card title="أبطأ الصفحات والطلبات">
            {d.routes.length === 0 ? <p className="text-sm text-steel">لسه مفيش بيانات كفاية.</p> : (
              <ul className="space-y-2">
                {d.routes.map((r) => (
                  <li key={r.route} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate"><b className="text-ink">{ROUTES[r.route] || r.route}</b> <span className="text-xs text-steel">· {fmt(r.n)} مرة{r.errors ? ` · ${r.errors} خطأ` : ''}</span></span>
                    <span className={`price shrink-0 font-bold ${r.avg > 1500 ? 'text-sale' : 'text-ink'}`}>{sec(r.avg)} <span className="text-xs text-steel font-normal">أقصى {sec(r.max)}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="آخر نسخة احتياطية" value={d.lastBackup ? ago(d.lastBackup).replace('من ', '') : 'مفيش'} icon={<Archive className="w-4 h-4" />} tone={backupAge != null && backupAge > 48 ? 'bad' : 'good'} />
            <Stat label="PHP" value={d.php} sub={`ذاكرة ${size(d.memoryPeak)}`} icon={<Database className="w-4 h-4" />} />
          </div>
        </div>
      </div>

      <Card title={`اللوجز (آخر 7 أيام)`}
        action={<span className="text-xs text-steel">الباسوردات والتوكنز وأرقام الموبايلات بتتخبى قبل ما تتسجل</span>}>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-steel" />
            <input value={qLive} onChange={(e) => setQLive(e.target.value)} placeholder="دوّر في اللوجز…" className="w-full h-10 rounded-xl bg-white/70 border border-ink/10 pr-9 pl-3 text-sm outline-none focus:border-gold" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {[['', 'الكل'], ['critical', 'خطير'], ['error', 'أخطاء'], ['warning', 'تحذيرات'], ['info', 'معلومات']].map(([k, l]) => (
              <button key={k} onClick={() => setLevel(k)} className={`px-3 h-10 rounded-xl text-sm font-bold whitespace-nowrap cursor-pointer ${level === k ? 'bg-ink text-white' : 'bg-white/60 text-ink/70'}`}>
                {l}{k && d.logCounts[k] ? <span className="price text-xs opacity-70"> {d.logCounts[k]}</span> : null}
              </button>
            ))}
          </div>
          <select value={source} onChange={(e) => setSource(e.target.value)} className="h-10 rounded-xl bg-white/60 border border-ink/10 px-3 text-sm font-bold cursor-pointer">
            <option value="">كل المصادر</option>
            {Object.entries(SOURCES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        {d.logs.length === 0 ? (
          <p className="text-sm text-steel py-6 text-center">مفيش حاجة متسجلة{level || source || q ? ' بالفلتر ده' : ' — مفيش أخطاء'}.</p>
        ) : (
          <ul className="divide-y divide-ink/10 -mx-1">
            {d.logs.map((l) => (
              <li key={l.id} className="px-1">
                <button onClick={() => setOpen(open === l.id ? null : l.id)} className="w-full py-2.5 flex items-start gap-2.5 text-right cursor-pointer">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${LEVELS[l.level]?.cls || LEVELS.info.cls}`}>{LEVELS[l.level]?.l || l.level}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-ink break-words" dir="auto">{l.message}</span>
                    <span className="block text-xs text-steel mt-0.5">{SOURCES[l.source] || l.source} · {clock(l.at)}</span>
                  </span>
                </button>
                {open === l.id && l.ctx && (
                  <pre className="mb-2.5 p-3 rounded-xl bg-ink text-white/85 text-xs overflow-x-auto whitespace-pre-wrap break-all" dir="ltr">{(() => { try { return JSON.stringify(JSON.parse(l.ctx), null, 2); } catch { return l.ctx; } })()}</pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
