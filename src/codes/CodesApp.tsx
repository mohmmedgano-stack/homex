import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { api, money, thumb } from '../lib/api';
import { ToastProvider, useToast, Button, Card, Field, Input, Select, Textarea, Toggle, Modal, Spinner, Empty } from '../admin/ui';
import {
  QrCode, Boxes, Users, History, LogOut, Search, Plus, Pencil, Trash2, Printer, PackagePlus, ScanLine, ImagePlus, Eye, EyeOff, Minus,
} from 'lucide-react';

/* ---------------------------- types ---------------------------- */
type Product = { id: string; name: string; category: string | null; price: number; cost: number; stock: number; image: string; active: boolean; sku: string; modelNo: string; brand: string; codes: number };
type Trader = { id: number; name: string; prefix: string; phone: string; note: string; active: boolean; codes: number };
type Code = { id: number; code: string; productId: string; product: string; trader: string; prefix: string; version: string; model: string; serial: number; price: number | null; printed: number; createdAt: string; createdBy: string };
type Category = { id: string; name: string };
type Data = { products: Product[]; categories: Category[]; traders: Trader[]; codes: Code[]; year: string };

const TABS = [
  { id: 'print', label: 'طباعة أكواد', Icon: QrCode },
  { id: 'stock', label: 'المنتجات والمخزن', Icon: Boxes },
  { id: 'traders', label: 'التجار', Icon: Users },
  { id: 'history', label: 'سجل الأكواد', Icon: History },
] as const;
type Tab = (typeof TABS)[number]['id'];

const store = {
  get: (k: string, d: string) => { try { return localStorage.getItem('homex_codes_' + k) ?? d; } catch { return d; } },
  set: (k: string, v: string) => { try { localStorage.setItem('homex_codes_' + k, v); } catch { /* private mode */ } },
};
const clean = (v: string, max: number) => v.toUpperCase().replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[^A-Z0-9]/g, '').slice(0, max);
const esc = (s: string) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const fmt = (n: number) => `${Math.round(n).toLocaleString('en-US')} ج.م`;

/* ---------------------------- printing ---------------------------- */
const LABEL_SIZES: Record<string, { label: string; w: number; h: number; sheet?: boolean }> = {
  '40x25': { label: 'استيكر 40×25 مم', w: 40, h: 25 },
  '50x30': { label: 'استيكر 50×30 مم', w: 50, h: 30 },
  '60x40': { label: 'استيكر 60×40 مم', w: 60, h: 40 },
  a4: { label: 'ورق A4 استيكر (24 في الصفحة)', w: 70, h: 37, sheet: true },
};

type Label = { code: string; name: string; price: number | null };

/** Opens a print window with one QR label per entry. */
async function printLabels(labels: Label[], size: string): Promise<boolean> {
  const S = LABEL_SIZES[size] || LABEL_SIZES['40x25'];
  // Open the window first (inside the click), then fill it — browsers block popups opened after an await
  const w = window.open('', '_blank', 'width=640,height=720');
  if (!w) return false;
  w.document.write('<p style="font-family:Tahoma;padding:20px">بيجهّز الأكواد…</p>');
  const svgs = new Map<string, string>();
  for (const l of labels) {
    if (!svgs.has(l.code)) svgs.set(l.code, await QRCode.toString(l.code, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }));
  }
  // QR + name/price on top, the code across the full width underneath (sized to fit, never wrapped)
  const big = S.w >= 50;
  const line = big ? 4.6 : 3.8; // mm for the code row
  const qr = S.h - 3 - line; // mm
  const codeFont = (code: string) => Math.min(big ? 10 : 8, (S.w - 3) / (code.length * 0.6 * 0.3528)).toFixed(2);
  const html = labels.map((l) => `<div class="lb"><div class="q">${svgs.get(l.code)}</div><div class="t">
      <div class="n">${esc(l.name)}</div>${l.price != null ? `<div class="p">${fmt(l.price)}</div>` : ''}
    </div><div class="c" style="font-size:${codeFont(l.code)}pt">${esc(l.code)}</div></div>`).join('');
  const page = S.sheet
    ? `@page{size:A4;margin:8mm 5mm} body{display:grid;grid-template-columns:repeat(3,${S.w}mm);grid-auto-rows:${S.h}mm;justify-content:center}`
    : `@page{size:${S.w}mm ${S.h}mm;margin:0} .lb{page-break-after:always;break-after:page}`;
  w.document.open();
  w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>أكواد QR</title><style>
    *{box-sizing:border-box} body{margin:0;font-family:Tahoma,Arial,sans-serif;color:#000} ${page}
    .lb{width:${S.w}mm;height:${S.h}mm;padding:1.5mm;display:grid;grid-template-columns:${qr}mm 1fr;grid-template-rows:${qr}mm ${line}mm;column-gap:1.5mm;overflow:hidden}
    .q{width:${qr}mm;height:${qr}mm} .q svg{width:100%;height:100%;display:block}
    .t{min-width:0;display:flex;flex-direction:column;justify-content:center;gap:0.8mm;text-align:right;overflow:hidden}
    .n{font-size:${big ? 9 : 7}pt;font-weight:bold;line-height:1.15;max-height:${big ? '4.6em' : '3.45em'};overflow:hidden}
    .p{font-size:${big ? 11 : 8.5}pt;font-weight:bold;white-space:nowrap}
    .c{grid-column:1 / -1;align-self:end;font-family:Consolas,'Courier New',monospace;font-weight:bold;direction:ltr;text-align:center;white-space:nowrap;line-height:1;letter-spacing:0}
  </style></head><body>${html}<script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>`);
  w.document.close();
  return true;
}

/* ---------------------------- app shell ---------------------------- */
export const CodesApp: React.FC = () => (
  <ToastProvider>
    <Shell />
  </ToastProvider>
);

const Shell: React.FC = () => {
  const [me, setMe] = useState<{ user: string | null; configured: boolean } | null>(null);
  useEffect(() => { api.get('station/me').then(setMe).catch(() => setMe({ user: null, configured: true })); }, []);
  if (!me) return <div className="min-h-dvh flex items-center justify-center"><Spinner /></div>;
  if (!me.user) return <Login configured={me.configured} onDone={setMe} />;
  return <Station user={me.user} onLogout={() => setMe({ user: null, configured: true })} />;
};

const Login: React.FC<{ configured: boolean; onDone: (d: any) => void }> = ({ configured, onDone }) => {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { onDone(await api.post('station/login', { username: u, password: p })); } catch (x: any) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <main className="min-h-dvh flex items-center justify-center p-4 bg-ink">
      <form onSubmit={go} className="w-full max-w-sm bg-white rounded-2xl p-6 space-y-4 shadow-2xl">
        <div className="text-center">
          <span className="inline-flex w-14 h-14 rounded-2xl bg-gold/15 items-center justify-center"><QrCode className="w-8 h-8 text-gold-deep" /></span>
          <h1 className="text-xl font-extrabold text-ink mt-3">محطة الباركود</h1>
          <p className="text-sm text-steel mt-1">HOMEX — أكواد QR والمخزن</p>
        </div>
        {!configured ? (
          <p className="text-sm text-ink bg-gold/10 border border-gold/40 rounded-xl p-3 leading-relaxed">
            المحطة لسه متقفلة. ادخل لوحة التحكم بحساب homex ← <b>إعدادات المتجر</b> ← <b>محطة الباركود</b> ويحدد اسم المستخدم والباسورد.
          </p>
        ) : (
          <>
            <Field label="اسم المستخدم"><Input dir="ltr" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" autoCapitalize="none" required /></Field>
            <Field label="الباسورد">
              <div className="relative">
                <Input dir="ltr" type={show ? 'text' : 'password'} value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required className="pl-10" />
                <button type="button" onClick={() => setShow(!show)} className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 text-steel" aria-label={show ? 'اخفي الباسورد' : 'اظهر الباسورد'}>
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            {err && <p className="text-sm text-sale font-bold">{err}</p>}
            <Button type="submit" loading={busy} className="w-full h-12 text-base">دخول</Button>
          </>
        )}
      </form>
    </main>
  );
};

const Station: React.FC<{ user: string; onLogout: () => void }> = ({ user, onLogout }) => {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>(() => { const t = store.get('tab', 'print'); return (TABS.some((x) => x.id === t) ? t : 'print') as Tab; });
  const [d, setD] = useState<Data | null>(null);
  const [printFor, setPrintFor] = useState<string>('');
  const load = () => api.get<Data>('station/data').then(setD).catch((e) => { if (e.status === 401) onLogout(); else toast(e.message, 'err'); });
  useEffect(() => { load(); }, []);
  useEffect(() => store.set('tab', tab), [tab]);
  const patch = (x: Partial<Data>) => setD((o) => (o ? { ...o, ...x } : o));
  const logout = async () => { try { await api.post('station/logout'); } catch { /* ignore */ } onLogout(); };

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="bg-ink text-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-3 sm:px-5 h-14 flex items-center gap-3">
          <QrCode className="w-6 h-6 text-gold shrink-0" />
          <h1 className="font-extrabold text-base sm:text-lg flex-1 truncate">محطة الباركود <span className="text-white/50 font-bold text-sm">HOMEX</span></h1>
          <span dir="ltr" className="text-xs text-white/60 hidden sm:inline">{user}</span>
          <button onClick={logout} className="p-2 text-white/70 hover:text-white" aria-label="خروج"><LogOut className="w-5 h-5" /></button>
        </div>
        <nav className="max-w-6xl mx-auto px-2 sm:px-5 flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id}
              className={`shrink-0 h-11 px-3 flex items-center gap-1.5 text-sm font-bold border-b-2 ${tab === id ? 'border-gold text-white' : 'border-transparent text-white/60 hover:text-white'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-5 py-4 sm:py-6">
        {!d ? <Spinner /> : (
          <>
            {tab === 'print' && <PrintPanel d={d} preselect={printFor} onDone={patch} goTraders={() => setTab('traders')} />}
            {tab === 'stock' && <StockPanel d={d} onProducts={(products) => patch({ products })} onPrint={(id) => { setPrintFor(id); setTab('print'); }} />}
            {tab === 'traders' && <TradersPanel traders={d.traders} onChange={(traders) => patch({ traders })} />}
            {tab === 'history' && <HistoryPanel d={d} />}
          </>
        )}
      </main>
    </div>
  );
};

/* ---------------------------- print ---------------------------- */
const ProductPicker: React.FC<{ products: Product[]; value: string; onChange: (id: string) => void }> = ({ products, value, onChange }) => {
  const [q, setQ] = useState('');
  const p = products.find((x) => x.id === value);
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((x) => !t || x.name.toLowerCase().includes(t) || x.modelNo.toLowerCase().includes(t) || x.sku.toLowerCase().includes(t)).slice(0, 40);
  }, [q, products]);
  if (p) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-gold bg-gold/5 p-2.5">
        {p.image ? <img src={thumb(p.image)} alt="" className="w-12 h-12 rounded-lg object-cover bg-shelf shrink-0" /> : <span className="w-12 h-12 rounded-lg bg-shelf shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-ink text-sm line-clamp-2">{p.name}</p>
          <p className="text-xs text-steel price">{money(p.price)} · المخزن {p.stock}{p.modelNo ? <> · موديل <span dir="ltr">{p.modelNo}</span></> : ''}</p>
        </div>
        <Button variant="ghost" className="h-9 shrink-0" onClick={() => onChange('')}>غيّر</Button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <label className="relative block">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-steel" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر باسم المنتج أو رقم الموديل" className="pr-9" />
      </label>
      {products.length === 0 ? <p className="text-sm text-steel">مفيش منتجات لسه. ضيف منتج من تاب «المنتجات والمخزن».</p> : (
        <ul className="max-h-64 overflow-y-auto divide-y divide-line border border-line rounded-xl">
          {rows.map((x) => (
            <li key={x.id}>
              <button onClick={() => onChange(x.id)} className="w-full text-right flex items-center gap-3 p-2 hover:bg-shelf">
                {x.image ? <img src={thumb(x.image)} alt="" className="w-9 h-9 rounded-md object-cover bg-shelf shrink-0" /> : <span className="w-9 h-9 rounded-md bg-shelf shrink-0" />}
                <span className="flex-1 min-w-0 text-sm font-bold text-ink line-clamp-1">{x.name}</span>
                <span className="text-xs text-steel price shrink-0">مخزن {x.stock}</span>
              </button>
            </li>
          ))}
          {rows.length === 0 && <li className="p-3 text-sm text-steel">مفيش نتيجة</li>}
        </ul>
      )}
    </div>
  );
};

const PrintPanel: React.FC<{ d: Data; preselect: string; onDone: (x: Partial<Data>) => void; goTraders: () => void }> = ({ d, preselect, onDone, goTraders }) => {
  const toast = useToast();
  const traders = d.traders.filter((t) => t.active);
  const [pid, setPid] = useState(preselect);
  const [tid, setTid] = useState(() => store.get('trader', ''));
  const [version, setVersion] = useState(() => store.get('version', d.year));
  const [model, setModel] = useState('');
  const [qty, setQty] = useState(1);
  const [serial, setSerial] = useState(() => store.get('serial', '0') === '1');
  const [showPrice, setShowPrice] = useState(() => store.get('price', '1') === '1');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState(() => store.get('size', '40x25'));
  const [addStock, setAddStock] = useState(false);
  const [busy, setBusy] = useState(false);
  const p = d.products.find((x) => x.id === pid);
  const t = traders.find((x) => String(x.id) === tid) || (traders.length === 1 ? traders[0] : undefined);

  useEffect(() => { setPid(preselect); }, [preselect]);
  useEffect(() => { if (p) { setModel(p.modelNo || ''); setPrice(String(p.price || '')); } }, [pid]);

  const base = `${t?.prefix || '??'}${version || '??'}-${model || '????'}`;
  const sample = serial ? `${base}-001` : base;

  const go = async () => {
    if (!p) return toast('اختار المنتج', 'err');
    if (!t) return toast('اختار التاجر', 'err');
    if (!version) return toast('اكتب السنة أو الإصدار', 'err');
    if (!model) return toast('اكتب رقم الموديل', 'err');
    store.set('trader', String(t.id)); store.set('version', version); store.set('serial', serial ? '1' : '0'); store.set('price', showPrice ? '1' : '0'); store.set('size', size);
    setBusy(true);
    try {
      const r = await api.post('station/generate', { productId: p.id, traderId: t.id, version, model, qty, serial, price: showPrice ? price : null, addStock, saveModel: true });
      onDone({ products: r.products, codes: r.history });
      const ok = await printLabels(r.codes.map((c: string) => ({ code: c, name: p.name, price: showPrice && price !== '' ? Number(price) : null })), size);
      toast(ok ? `اتعمل ${qty} كود${addStock ? ` واتزوّدوا على المخزن (بقى ${r.stock})` : ''}` : 'الأكواد اتحفظت بس المتصفح منع نافذة الطباعة — اطبعها من «سجل الأكواد»', ok ? 'ok' : 'err');
      setAddStock(false);
    } catch (e: any) { toast(e.message, 'err'); }
    setBusy(false);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
      <Card title="طباعة أكواد QR">
        <div className="space-y-4">
          <Field label="المنتج"><ProductPicker products={d.products} value={pid} onChange={setPid} /></Field>
          {traders.length === 0 ? (
            <div className="rounded-xl bg-gold/10 border border-gold/40 p-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="flex-1 min-w-[180px]">ضيف التجار الأول وحدد لكل تاجر حرف أو حرفين.</span>
              <Button className="h-9" onClick={goTraders}><Plus className="w-4 h-4" /> ضيف تاجر</Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="التاجر">
                <Select value={t ? String(t.id) : ''} onChange={(e) => setTid(e.target.value)}>
                  {!t && <option value="">اختار…</option>}
                  {traders.map((x) => <option key={x.id} value={x.id}>{x.prefix} — {x.name}</option>)}
                </Select>
              </Field>
              <Field label="السنة / الإصدار" hint="مثلاً 26 أو V2">
                <Input dir="ltr" value={version} onChange={(e) => setVersion(clean(e.target.value, 4))} className="font-mono" />
              </Field>
              <Field label="رقم الموديل">
                <Input dir="ltr" value={model} onChange={(e) => setModel(clean(e.target.value, 20))} placeholder="1520" className="font-mono" />
              </Field>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="عدد الاستيكرات">
              <div className="flex items-center border border-line rounded-lg h-11 bg-white">
                <button type="button" onClick={() => setQty(Math.min(500, qty + 1))} className="w-11 h-full flex items-center justify-center" aria-label="زوّد"><Plus className="w-4 h-4" /></button>
                <input value={qty} onChange={(e) => setQty(Math.max(1, Math.min(500, parseInt(e.target.value.replace(/\D/g, '')) || 1)))} inputMode="numeric" className="flex-1 min-w-0 text-center price font-bold bg-transparent outline-none" aria-label="عدد الاستيكرات" />
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="w-11 h-full flex items-center justify-center" aria-label="قلّل"><Minus className="w-4 h-4" /></button>
              </div>
            </Field>
            <Field label="مقاس الاستيكر">
              <Select value={size} onChange={(e) => setSize(e.target.value)}>
                {Object.entries(LABEL_SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </Field>
          </div>
          <div className="space-y-3 rounded-xl bg-shelf p-3">
            <Toggle checked={showPrice} onChange={setShowPrice} label="اطبع السعر على الاستيكر" />
            {showPrice && (
              <Field label="السعر اللي يتطبع (ج.م)" hint="بيتملى بسعر المنتج، وتقدر تغيّره للطبعة دي بس">
                <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))} className="price" />
              </Field>
            )}
            <Toggle checked={serial} onChange={setSerial} label="رقم مسلسل لكل قطعة (كل استيكر كود مختلف)" />
            <Toggle checked={addStock} onChange={setAddStock} label={`دي بضاعة جديدة وصلت — زوّد ${qty} على المخزن`} />
          </div>
        </div>
      </Card>

      <div className="space-y-3 lg:sticky lg:top-32">
        <Card title="شكل الكود">
          <CodePreview code={sample} name={p?.name || 'اسم المنتج'} price={showPrice && price !== '' ? Number(price) : null} />
          <p className="text-xs text-steel mt-3 leading-relaxed">
            الكود = حرف التاجر + السنة/الإصدار + رقم الموديل{serial ? ' + مسلسل القطعة' : ''}. الكاشير في لوحة التحكم بيقرأه بالسكانر ويجيب المنتج على طول.
          </p>
        </Card>
        <Button onClick={go} loading={busy} disabled={!p || !t} className="w-full h-12 text-base"><Printer className="w-5 h-5" /> اطبع {qty} استيكر</Button>
      </div>
    </div>
  );
};

const CodePreview: React.FC<{ code: string; name: string; price: number | null }> = ({ code, name, price }) => {
  const [svg, setSvg] = useState('');
  useEffect(() => { QRCode.toString(code, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }).then(setSvg).catch(() => setSvg('')); }, [code]);
  return (
    <div className="mx-auto w-full max-w-[280px] aspect-[40/25] bg-white border-2 border-dashed border-line rounded-lg p-2.5 flex flex-col gap-1.5">
      <div className="flex-1 min-h-0 flex gap-2.5">
        <div className="h-full aspect-square shrink-0 [&_svg]:w-full [&_svg]:h-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
          <p className="text-[11px] font-bold text-ink leading-tight line-clamp-3">{name}</p>
          {price != null && <p className="text-[12px] font-black text-ink price">{fmt(price)}</p>}
        </div>
      </div>
      <p dir="ltr" className="font-mono text-[13px] font-black text-ink text-center whitespace-nowrap leading-none">{code}</p>
    </div>
  );
};

/* ---------------------------- products & stock ---------------------------- */
const MODES: [string, string, string][] = [
  ['restock', 'استلام بضاعة', 'الكمية اللي وصلت'],
  ['count', 'تسوية جرد', 'العدد الفعلي في المخزن'],
  ['out', 'صرف (هدية/عينة)', 'الكمية اللي خرجت'],
  ['damaged', 'تالف / هالك', 'الكمية اللي باظت'],
];

const StockPanel: React.FC<{ d: Data; onProducts: (p: Product[]) => void; onPrint: (id: string) => void }> = ({ d, onProducts, onPrint }) => {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [low, setLow] = useState(false);
  const [edit, setEdit] = useState<Partial<Product> | null>(null);
  const [move, setMove] = useState<Product | null>(null);
  const [scan, setScan] = useState('');
  const [found, setFound] = useState<Code | null>(null);
  const cats = Object.fromEntries(d.categories.map((c) => [c.id, c.name]));
  const rows = d.products.filter((p) => (!low || p.stock <= 5) && (!q || p.name.includes(q) || p.modelNo.includes(q.toUpperCase()) || p.sku.includes(q)));
  const units = d.products.reduce((a, p) => a + p.stock, 0);
  const value = d.products.reduce((a, p) => a + p.stock * (p.cost || 0), 0);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scan.trim()) return;
    try { setFound(await api.get('station/lookup', { code: scan.trim() })); } catch (x: any) { setFound(null); toast(x.message, 'err'); }
    setScan('');
  };
  const fp = found ? d.products.find((p) => p.id === found.productId) : undefined;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white rounded-xl border border-line p-3"><p className="text-xs text-steel">منتجات</p><p className="price text-xl font-black text-ink">{d.products.length}</p></div>
        <div className="bg-white rounded-xl border border-line p-3"><p className="text-xs text-steel">قطع في المخزن</p><p className="price text-xl font-black text-ink">{units.toLocaleString('en-US')}</p></div>
        <div className="bg-white rounded-xl border border-line p-3"><p className="text-xs text-steel">قيمتها بالتكلفة</p><p className="price text-lg sm:text-xl font-black text-ink">{money(Math.round(value))}</p></div>
      </div>

      <Card>
        <form onSubmit={lookup} className="flex gap-2">
          <label className="relative flex-1">
            <ScanLine className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-steel" />
            <Input dir={scan ? 'ltr' : 'rtl'} value={scan} onChange={(e) => setScan(e.target.value)} placeholder="امسح كود QR أو اكتبه" className="pr-9 font-mono" />
          </label>
          <Button type="submit" variant="dark">اعرف المنتج</Button>
        </form>
        {found && (
          <div className="mt-3 rounded-xl bg-shelf p-3 text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
            <span dir="ltr" className="font-mono font-black text-ink">{found.code}</span>
            <span className="font-bold text-ink">{found.product}</span>
            {found.trader && <span className="text-steel">التاجر: {found.trader} ({found.prefix})</span>}
            {fp && <span className="text-steel price">المخزن: <b className="text-ink">{fp.stock}</b> · السعر {money(fp.price)}</span>}
            {found.createdAt && <span className="text-steel">اتطبع {found.createdAt}</span>}
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-steel" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر على منتج" className="pr-9" />
        </label>
        <button onClick={() => setLow(!low)} aria-pressed={low} className={`h-10 px-3 rounded-lg text-sm font-bold border ${low ? 'bg-sale text-white border-sale' : 'bg-white text-ink border-line'}`}>قرب يخلص</button>
        <Button onClick={() => setEdit({ active: true, stock: 0 })}><Plus className="w-4 h-4" /> منتج جديد</Button>
      </div>

      {rows.length === 0 ? <Card><Empty title={d.products.length ? 'مفيش نتيجة' : 'مفيش منتجات لسه'} text={d.products.length ? undefined : 'ضيف أول منتج، وتقدر تخليه يظهر على الموقع أو يفضل في المخزن بس.'} /></Card> : (
        <ul className="grid md:grid-cols-2 gap-2.5">
          {rows.map((p) => (
            <li key={p.id} className="bg-white rounded-xl border border-line p-3 flex gap-3">
              {p.image ? <img src={thumb(p.image)} alt="" className="w-16 h-16 rounded-lg object-cover bg-shelf shrink-0" /> : <span className="w-16 h-16 rounded-lg bg-shelf shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink line-clamp-2">{p.name}</p>
                <p className="text-xs text-steel mt-0.5 price">
                  {money(p.price)}{p.modelNo ? <> · موديل <span dir="ltr">{p.modelNo}</span></> : ''}{p.category && cats[p.category] ? ` · ${cats[p.category]}` : ''}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className={`text-xs font-black px-2 py-0.5 rounded price ${p.stock <= 0 ? 'bg-sale/10 text-sale' : p.stock <= 5 ? 'bg-gold/15 text-gold-deep' : 'bg-save/10 text-save'}`}>المخزن {p.stock}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${p.active ? 'bg-ink/5 text-ink' : 'bg-shelf text-steel'}`}>{p.active ? 'ظاهر على الموقع' : 'مخزن بس'}</span>
                  {p.codes > 0 && <span className="text-xs text-steel price">{p.codes} كود</span>}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Button variant="ghost" className="h-8 px-2.5 text-xs" onClick={() => setMove(p)}><PackagePlus className="w-3.5 h-3.5" /> المخزن</Button>
                  <Button variant="ghost" className="h-8 px-2.5 text-xs" onClick={() => onPrint(p.id)}><QrCode className="w-3.5 h-3.5" /> أكواد</Button>
                  <Button variant="ghost" className="h-8 px-2.5 text-xs" onClick={() => setEdit(p)}><Pencil className="w-3.5 h-3.5" /> تعديل</Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {edit && <ProductForm initial={edit} categories={d.categories} onClose={() => setEdit(null)} onSaved={(l) => { onProducts(l); setEdit(null); }} />}
      {move && <StockMove p={move} onClose={() => setMove(null)} onSaved={(l) => { onProducts(l); setMove(null); }} />}
    </div>
  );
};

const ProductForm: React.FC<{ initial: Partial<Product> & { description?: string }; categories: Category[]; onClose: () => void; onSaved: (l: Product[]) => void }> = ({ initial, categories, onClose, onSaved }) => {
  const toast = useToast();
  const [p, setP] = useState({
    name: initial.name || '', category: initial.category || categories[0]?.id || '', modelNo: initial.modelNo || '', price: initial.price ? String(initial.price) : '',
    cost: initial.cost ? String(initial.cost) : '', stock: String(initial.stock ?? 0), image: initial.image || '', active: initial.active ?? true, brand: initial.brand || 'HOMEX',
  });
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof p, v: any) => setP((x) => ({ ...x, [k]: v }));
  const upload = async (f?: File) => {
    if (!f) return;
    setUp(true);
    try { const fd = new FormData(); fd.append('img', f); const r = await api.form<{ url: string }>('station/upload', fd); set('image', r.url); } catch (e: any) { toast(e.message, 'err'); }
    setUp(false);
  };
  const save = async () => {
    setBusy(true);
    try {
      const body: any = { name: p.name, category: p.category, modelNo: p.modelNo, price: p.price, cost: p.cost, image: p.image, active: p.active, brand: p.brand };
      if (initial.id) body.id = initial.id; else body.stock = Number(p.stock) || 0;
      onSaved(await api.post('station/product', body));
      toast(initial.id ? 'المنتج اتعدّل' : p.active ? 'المنتج اتضاف للمخزن وظاهر على الموقع' : 'المنتج اتضاف للمخزن (مخفي من الموقع)');
    } catch (e: any) { toast(e.message, 'err'); }
    setBusy(false);
  };
  return (
    <Modal open onClose={onClose} title={initial.id ? 'تعديل منتج' : 'منتج جديد'} wide
      footer={<><Button variant="ghost" onClick={onClose}>إلغاء</Button><Button onClick={save} loading={busy}>حفظ</Button></>}>
      <div className="space-y-4">
        <div className="flex gap-4 items-start">
          <button type="button" onClick={() => file.current?.click()} className="w-24 h-24 rounded-xl border-2 border-dashed border-line bg-shelf flex items-center justify-center overflow-hidden shrink-0" aria-label="صورة المنتج">
            {up ? <Spinner /> : p.image ? <img src={thumb(p.image)} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-7 h-7 text-steel" />}
          </button>
          <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          <Field label="اسم المنتج" className="flex-1"><Input value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="كبة خضار 500 وات" /></Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="القسم">
            <Select value={p.category} onChange={(e) => set('category', e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="رقم الموديل"><Input dir="ltr" value={p.modelNo} onChange={(e) => set('modelNo', clean(e.target.value, 20))} className="font-mono" placeholder="1520" /></Field>
          <Field label="الماركة"><Input value={p.brand} onChange={(e) => set('brand', e.target.value)} /></Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="سعر البيع (ج.م)"><Input inputMode="decimal" value={p.price} onChange={(e) => set('price', e.target.value.replace(/[^\d.]/g, ''))} /></Field>
          <Field label="التكلفة (ج.م)"><Input inputMode="decimal" value={p.cost} onChange={(e) => set('cost', e.target.value.replace(/[^\d.]/g, ''))} /></Field>
          {!initial.id ? (
            <Field label="الكمية في المخزن"><Input inputMode="numeric" value={p.stock} onChange={(e) => set('stock', e.target.value.replace(/\D/g, ''))} /></Field>
          ) : <Field label="الكمية في المخزن" hint="بتتغيّر من زرار «المخزن»"><Input value={String(initial.stock ?? 0)} disabled /></Field>}
        </div>
        <Toggle checked={p.active} onChange={(v) => set('active', v)} label="يظهر على الموقع (لو مقفول يفضل في المخزن بس)" />
        {!initial.id && <p className="text-xs text-steel">الوصف والمواصفات وباقي الصور تقدر تكمّلها بعدين من لوحة التحكم ← المنتجات.</p>}
      </div>
    </Modal>
  );
};

const StockMove: React.FC<{ p: Product; onClose: () => void; onSaved: (l: Product[]) => void }> = ({ p, onClose, onSaved }) => {
  const toast = useToast();
  const [mode, setMode] = useState('restock');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const m = MODES.find((x) => x[0] === mode)!;
  const n = Number(qty) || 0;
  const after = mode === 'restock' ? p.stock + n : mode === 'count' ? n : p.stock - n;
  const save = async () => {
    setBusy(true);
    try { onSaved(await api.post('station/stock', { productId: p.id, mode, qty: n, note })); toast(`المخزن بقى ${after}`); } catch (e: any) { toast(e.message, 'err'); }
    setBusy(false);
  };
  return (
    <Modal open onClose={onClose} title={`المخزن — ${p.name}`}
      footer={<><Button variant="ghost" onClick={onClose}>إلغاء</Button><Button onClick={save} loading={busy} disabled={qty === ''}>حفظ</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {MODES.map(([id, label]) => (
            <button key={id} onClick={() => setMode(id)} aria-pressed={mode === id}
              className={`h-11 rounded-lg text-sm font-bold border ${mode === id ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-line'}`}>{label}</button>
          ))}
        </div>
        <Field label={m[2]}><Input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} autoFocus /></Field>
        <Field label="ملاحظة" hint="اختياري"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <p className="text-sm text-steel price">المخزن دلوقتي <b className="text-ink">{p.stock}</b>{qty !== '' && <> ← هيبقى <b className={after < 0 ? 'text-sale' : 'text-ink'}>{after}</b></>}</p>
      </div>
    </Modal>
  );
};

/* ---------------------------- traders ---------------------------- */
const TradersPanel: React.FC<{ traders: Trader[]; onChange: (t: Trader[]) => void }> = ({ traders, onChange }) => {
  const toast = useToast();
  const [edit, setEdit] = useState<Partial<Trader> | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!edit) return;
    setBusy(true);
    try { onChange(await api.post('station/trader', edit)); setEdit(null); toast('التاجر اتحفظ'); } catch (e: any) { toast(e.message, 'err'); }
    setBusy(false);
  };
  const del = async (t: Trader) => {
    if (!confirm(t.codes ? `التاجر ${t.name} ليه أكواد مطبوعة، هيتوقف بس ومش هيتمسح. تكمل؟` : `تمسح التاجر ${t.name}؟`)) return;
    try { onChange(await api.post('station/trader-delete', { id: t.id })); } catch (e: any) { toast(e.message, 'err'); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-steel max-w-xl">كل تاجر ليه حرف أو حرفين إنجليزي بيبدأ بيهم الكود. الحرف مينفعش يتكرر، ومينفعش يتغيّر بعد ما يتطبعله أكواد.</p>
        <Button onClick={() => setEdit({ active: true })}><Plus className="w-4 h-4" /> تاجر جديد</Button>
      </div>
      {traders.length === 0 ? <Card><Empty title="مفيش تجار لسه" text="مثال: أحمد مصطفى ← AM ، شركة النور ← N" /></Card> : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {traders.map((t) => (
            <li key={t.id} className={`bg-white rounded-xl border border-line p-3 flex items-center gap-3 ${t.active ? '' : 'opacity-60'}`}>
              <span dir="ltr" className="w-12 h-12 rounded-xl bg-ink text-white font-mono font-black text-lg flex items-center justify-center shrink-0">{t.prefix}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink line-clamp-1">{t.name}</p>
                <p className="text-xs text-steel price">{t.codes} كود{t.phone ? ` · ${t.phone}` : ''}{!t.active ? ' · موقوف' : ''}</p>
              </div>
              <button onClick={() => setEdit(t)} className="p-2 text-steel hover:text-ink" aria-label="تعديل"><Pencil className="w-4 h-4" /></button>
              {t.active && <button onClick={() => del(t)} className="p-2 text-steel hover:text-sale" aria-label="مسح"><Trash2 className="w-4 h-4" /></button>}
            </li>
          ))}
        </ul>
      )}
      {edit && (
        <Modal open onClose={() => setEdit(null)} title={edit.id ? 'تعديل تاجر' : 'تاجر جديد'}
          footer={<><Button variant="ghost" onClick={() => setEdit(null)}>إلغاء</Button><Button onClick={save} loading={busy}>حفظ</Button></>}>
          <div className="space-y-4">
            <Field label="اسم التاجر"><Input value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="الحرف (حرف أو حرفين إنجليزي)">
              <Input dir="ltr" value={edit.prefix || ''} onChange={(e) => setEdit({ ...edit, prefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) })} placeholder="AM" className="font-mono text-lg font-black" />
            </Field>
            <Field label="تليفون" hint="اختياري"><Input dir="ltr" inputMode="tel" value={edit.phone || ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
            <Field label="ملاحظة" hint="اختياري"><Textarea rows={2} value={edit.note || ''} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></Field>
            {edit.id && <Toggle checked={!!edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="التاجر شغال" />}
          </div>
        </Modal>
      )}
    </div>
  );
};

/* ---------------------------- history ---------------------------- */
const HistoryPanel: React.FC<{ d: Data }> = ({ d }) => {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Code[]>(d.codes);
  const [size, setSize] = useState(() => store.get('size', '40x25'));
  useEffect(() => {
    const t = setTimeout(() => { api.get<Code[]>('station/codes', { q }).then(setRows).catch((e) => toast(e.message, 'err')); }, 250);
    return () => clearTimeout(t);
  }, [q]);
  const reprint = async (c: Code) => {
    const n = c.serial ? 1 : Math.max(1, Math.min(500, parseInt(prompt('كام استيكر؟', '1') || '0') || 0));
    if (!n) return;
    try {
      await api.post('station/reprint', { id: c.id });
      const ok = await printLabels(Array.from({ length: n }, () => ({ code: c.code, name: c.product, price: c.price })), size);
      if (!ok) toast('المتصفح منع نافذة الطباعة — اسمح بالـ popups للموقع', 'err');
    } catch (e: any) { toast(e.message, 'err'); }
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <label className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-steel" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر بالكود أو المنتج أو التاجر" className="pr-9" />
        </label>
        <Select value={size} onChange={(e) => { setSize(e.target.value); store.set('size', e.target.value); }} className="w-auto">
          {Object.entries(LABEL_SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </div>
      {rows.length === 0 ? <Card><Empty title="مفيش أكواد" /></Card> : (
        <div className="bg-white rounded-xl border border-line overflow-hidden">
          <ul className="divide-y divide-line">
            {rows.map((c) => (
              <li key={c.id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p dir="ltr" className="font-mono font-black text-ink text-right">{c.code}</p>
                  <p className="text-xs text-steel line-clamp-1">{c.product} · {c.trader || '—'} · {c.createdAt}{c.price != null ? ` · ${fmt(c.price)}` : ''}{!c.serial && c.printed > 1 ? ` · اتطبع ${c.printed} مرة` : ''}</p>
                </div>
                <Button variant="ghost" className="h-9 shrink-0" onClick={() => reprint(c)}><Printer className="w-4 h-4" /> اطبع</Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
