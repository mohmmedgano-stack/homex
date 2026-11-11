import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, money, thumb } from '../../lib/api';
import JsBarcode from 'jsbarcode';
import { Card, Spinner, Empty, Input, Select, Field, Modal, Button, useToast } from '../ui';
import {
  Search, Plus, Minus, Trash2, ScanBarcode, Printer, ShoppingCart, PackagePlus, PackageMinus, ClipboardList, History,
  Boxes, AlertTriangle, RotateCcw, Receipt, X, Tags, FileText,
} from 'lucide-react';

type Product = { id: string; name: string; price: number; cost: number; stock: number; image: string; sku?: string; active?: boolean; category: string };
type Line = { productId: string; name: string; image: string; qty: number; price: number; stock: number; listPrice: number };
type Receipt = {
  id: number; code: string; createdAt: string; cashier: string; customerName: string; customerPhone: string; note: string;
  paymentLabel: string; channelLabel: string; discount: number; subtotal: number; total: number; status: string;
  items: { name: string; qty: number; price: number }[];
};

const PAYMENTS: [string, string][] = [['cash', 'كاش'], ['card', 'فيزا / ماكينة'], ['wallet', 'محفظة'], ['instapay', 'إنستاباي'], ['credit', 'آجل']];
const CHANNELS: [string, string][] = [['shop', 'المحل / المعرض'], ['dealer', 'تاجر جملة'], ['facebook', 'فيسبوك / إنستجرام'], ['whatsapp', 'واتساب'], ['phone', 'تليفون'], ['other', 'أخرى']];

/** «الكاشير والمخزن»: sell outside the website (stock drops instantly) + manage stock movements. */
export const Inventory: React.FC = () => {
  const [tab, setTab] = useState<'pos' | 'stock'>(() => (location.hash === '#stock' ? 'stock' : 'pos'));
  const [products, setProducts] = useState<Product[] | null>(null);
  const toast = useToast();
  const reload = () => api.get('admin/products').then(setProducts).catch((e) => toast(e.message, 'err'));
  useEffect(() => { reload(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">الكاشير والمخزن</h1>
        <div className="flex gap-1 p-1 bg-white border border-line rounded-xl">
          {([['pos', 'بيع (كاشير)', ShoppingCart], ['stock', 'المخزن', Boxes]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id}
              className={`h-9 px-3 sm:px-4 rounded-lg text-sm font-bold flex items-center gap-1.5 ${tab === id ? 'bg-ink text-white' : 'text-steel hover:text-ink'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>
      {!products ? <Spinner /> : tab === 'pos' ? <Cashier products={products} onSold={reload} /> : <Stock products={products} onChanged={reload} />}
    </div>
  );
};

/* ============================ Cashier ============================ */

const Cashier: React.FC<{ products: Product[]; onSold: () => void }> = ({ products, onSold }) => {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState('');
  const [pay, setPay] = useState('cash');
  const [channel, setChannel] = useState('shop');
  const [cust, setCust] = useState({ name: '', phone: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [day, setDay] = useState<any>(null);
  const [showDay, setShowDay] = useState(false);
  const [printInv, setPrintInv] = useState(false);
  const [printLabels, setPrintLabels] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const loadDay = () => api.get('admin/pos-day').then(setDay).catch(() => {});
  useEffect(() => { loadDay(); searchRef.current?.focus(); }, []);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const all = products.filter((p) => p.active !== false);
    if (!t) return all.slice(0, 60);
    return all.filter((p) => p.name.toLowerCase().includes(t) || (p.sku || '').toLowerCase() === t || (p.sku || '').toLowerCase().includes(t)).slice(0, 60);
  }, [q, products]);

  const inCart = (id: string) => lines.find((l) => l.productId === id)?.qty || 0;

  const add = (p: Product, n = 1) => {
    if (p.stock - inCart(p.id) < n) return toast(`المخزن فيه ${p.stock} بس من «${p.name}»`, 'err');
    setLines((ls) => {
      const i = ls.findIndex((l) => l.productId === p.id);
      if (i >= 0) return ls.map((l, k) => (k === i ? { ...l, qty: l.qty + n } : l));
      return [...ls, { productId: p.id, name: p.name, image: p.image, qty: n, price: p.price, listPrice: p.price, stock: p.stock }];
    });
  };
  const setQty = (id: string, qty: number) =>
    setLines((ls) => ls.map((l) => (l.productId === id ? { ...l, qty: Math.max(1, Math.min(l.stock, qty || 1)) } : l)));
  const setPrice = (id: string, price: string) => setLines((ls) => ls.map((l) => (l.productId === id ? { ...l, price: Math.max(0, Number(price) || 0) } : l)));
  const remove = (id: string) => setLines((ls) => ls.filter((l) => l.productId !== id));

  // Barcode scanners type the code + Enter
  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const t = q.trim().toLowerCase();
    if (!t) return;
    const exact = products.find((p) => (p.sku || '').toLowerCase() === t);
    const only = list.length === 1 ? list[0] : null;
    const hit = exact || only;
    if (hit) { add(hit); setQ(''); return; }
    // QR labels from the barcode station (trader letters + version + model)
    const raw = q.trim();
    api.get('admin/code-lookup', { code: raw })
      .then((c: { productId: string }) => {
        const p = products.find((x) => x.id === c.productId);
        if (p) { add(p); setQ(''); } else toast('المنتج ده مش متاح للبيع', 'err');
      })
      .catch(() => toast('مفيش منتج بالكود ده', 'err'));
  };

  const sub = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const disc = Math.min(sub, Math.max(0, Number(discount) || 0));
  const total = sub - disc;
  const count = lines.reduce((a, l) => a + l.qty, 0);

  const checkout = async () => {
    if (!lines.length) return toast('ضيف منتجات للفاتورة الأول', 'err');
    if (pay === 'credit' && !cust.name.trim()) return toast('البيع الآجل محتاج اسم العميل', 'err');
    setBusy(true);
    try {
      const r: Receipt = await api.post('admin/pos-sale', {
        items: lines.map((l) => ({ productId: Number(l.productId), qty: l.qty, price: l.price })),
        discount: disc, paymentMethod: pay, channel, customerName: cust.name, customerPhone: cust.phone, note: cust.note,
      });
      setReceipt(r);
      setLines([]); setDiscount(''); setCust({ name: '', phone: '', note: '' });
      onSold(); loadDay();
    } catch (e: any) { toast(e.message, 'err'); }
    setBusy(false);
  };

  const returnSale = async (s: any) => {
    if (!confirm(`ترجّع الفاتورة ${s.code}؟ الكمية هترجع المخزن والمبلغ هيتشال من المبيعات.`)) return;
    try { setDay(await api.post('admin/pos-return', { id: s.id })); onSold(); toast('الفاتورة اترجعت والكمية رجعت المخزن'); } catch (e: any) { toast(e.message, 'err'); }
  };

  const quote = () => printReceipt({
    id: 0, code: '', createdAt: new Date().toLocaleString('en-GB', { timeZone: 'Africa/Cairo' }).slice(0, 17), cashier: '', customerName: cust.name, customerPhone: cust.phone, note: '',
    paymentLabel: '', channelLabel: '', discount: disc, subtotal: sub, total, status: '', items: lines.map((l) => ({ name: l.name, qty: l.qty, price: l.price })),
  }, true);

  return (
    <>
      {/* Print tools */}
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" className="h-10" onClick={() => setPrintInv(true)}><Printer className="w-4 h-4" /> طباعة فاتورة</Button>
        <Button variant="ghost" className="h-10" onClick={() => setPrintLabels(true)}><Tags className="w-4 h-4" /> طباعة أكواد (باركود)</Button>
      </div>

      {/* Today */}
      {day && (
        <button onClick={() => setShowDay(true)} className="w-full bg-ink text-white rounded-xl p-3 sm:p-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-right">
          <span className="flex items-center gap-2 font-extrabold"><Receipt className="w-5 h-5 text-gold" /> مبيعات الكاشير النهارده</span>
          <span className="price"><b className="text-lg">{money(day.total)}</b> <span className="text-white/60 text-sm">· {day.count} فاتورة</span></span>
          {Object.entries(day.byPayment || {}).map(([k, v]: any) => (
            <span key={k} className="text-sm text-white/70 price">{day.payments?.[k] || k}: {money(v)}</span>
          ))}
          <span className="mr-auto text-xs text-gold-hi underline">عرض الفواتير</span>
        </button>
      )}

      <div className="grid lg:grid-cols-[1fr_400px] gap-4 items-start">
        {/* Products */}
        <Card>
          <label className="relative block">
            <ScanBarcode className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-steel" />
            <Input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onSearchKey}
              placeholder="امسح الباركود أو اكتب اسم المنتج واضغط Enter" className="pr-10 h-12 text-base" />
          </label>
          {list.length === 0 ? (
            <p className="text-sm text-steel text-center py-10">مفيش منتجات بالاسم ده</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 mt-3 max-h-[60vh] overflow-y-auto overscroll-contain p-0.5">
              {list.map((p) => {
                const left = p.stock - inCart(p.id);
                return (
                  <button key={p.id} onClick={() => add(p)} disabled={left <= 0}
                    className="relative text-right bg-white border border-line rounded-xl overflow-hidden hover:border-gold disabled:opacity-40 disabled:cursor-not-allowed">
                    <span className="block aspect-[4/3] bg-shelf">
                      {p.image && <img src={thumb(p.image)} alt="" loading="lazy" className="w-full h-full object-cover" />}
                    </span>
                    <span className="block p-2">
                      <span className="block text-[13px] font-bold text-ink leading-snug line-clamp-2 min-h-[2.4em]">{p.name}</span>
                      <span className="flex items-center justify-between mt-1">
                        <span className="price font-black text-ink text-sm">{money(p.price)}</span>
                        <span className={`price text-[11px] font-bold ${left <= 3 ? 'text-sale' : 'text-steel'}`}>{left} متاح</span>
                      </span>
                    </span>
                    {inCart(p.id) > 0 && <span className="absolute top-1.5 left-1.5 min-w-6 h-6 px-1 rounded-full bg-gold text-white text-xs font-black flex items-center justify-center price">{inCart(p.id)}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Invoice */}
        <div id="pos-invoice" className="scroll-mt-20">
        <Card className="lg:sticky lg:top-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-ink">الفاتورة {count > 0 && <span className="text-steel font-bold price">({count} قطعة)</span>}</h2>
            {lines.length > 0 && <button onClick={() => setLines([])} className="text-xs text-steel hover:text-sale">مسح الكل</button>}
          </div>

          {lines.length === 0 ? (
            <p className="text-sm text-steel text-center py-8 border-2 border-dashed border-line rounded-xl">دوس على المنتج أو امسح الباركود عشان يتضاف هنا</p>
          ) : (
            <ul className="divide-y divide-line max-h-[38vh] overflow-y-auto -mx-1 px-1">
              {lines.map((l) => (
                <li key={l.productId} className="py-2.5">
                  <div className="flex items-start gap-2">
                    <span className="flex-1 min-w-0 text-sm font-bold text-ink line-clamp-2">{l.name}</span>
                    <button onClick={() => remove(l.productId)} className="p-1 text-steel hover:text-sale shrink-0" aria-label="شيل"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center border border-line rounded-lg h-9">
                      <button onClick={() => setQty(l.productId, l.qty + 1)} disabled={l.qty >= l.stock} className="w-8 h-full flex items-center justify-center disabled:opacity-30" aria-label="زوّد"><Plus className="w-3.5 h-3.5" /></button>
                      <input value={l.qty} onChange={(e) => setQty(l.productId, parseInt(e.target.value.replace(/\D/g, '')) || 1)} inputMode="numeric"
                        className="w-10 text-center price font-bold bg-transparent outline-none" aria-label="الكمية" />
                      <button onClick={() => setQty(l.productId, l.qty - 1)} disabled={l.qty <= 1} className="w-8 h-full flex items-center justify-center disabled:opacity-30" aria-label="قلّل"><Minus className="w-3.5 h-3.5" /></button>
                    </div>
                    <span className="text-xs text-steel">×</span>
                    <input value={l.price} onChange={(e) => setPrice(l.productId, e.target.value)} inputMode="decimal"
                      className={`w-24 h-9 rounded-lg border px-2 price text-sm font-bold outline-none focus:border-gold ${l.price !== l.listPrice ? 'border-gold bg-gold/5' : 'border-line'}`} aria-label="سعر القطعة" />
                    <span className="mr-auto price font-black text-ink text-sm">{money(l.price * l.qty)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-3 mt-4 pt-4 border-t border-line">
            <div className="grid grid-cols-2 gap-2">
              <Field label="خصم على الفاتورة">
                <Input inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0" />
              </Field>
              <Field label="اتباع فين">
                <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
                  {CHANNELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
            </div>
            <div>
              <p className="text-xs font-bold text-ink mb-1.5">الدفع</p>
              <div className="flex flex-wrap gap-1.5">
                {PAYMENTS.map(([v, l]) => (
                  <button key={v} onClick={() => setPay(v)} aria-pressed={pay === v}
                    className={`h-9 px-3 rounded-lg text-sm font-bold border ${pay === v ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-line'}`}>{l}</button>
                ))}
              </div>
            </div>
            <details className="text-sm" open={pay === 'credit'}>
              <summary className="cursor-pointer font-bold text-steel text-xs">بيانات العميل (اختياري)</summary>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Input value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} placeholder="اسم العميل" />
                <Input dir="ltr" inputMode="tel" value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} placeholder="01xxxxxxxxx" />
                <Input className="col-span-2" value={cust.note} onChange={(e) => setCust({ ...cust, note: e.target.value })} placeholder="ملاحظة" />
              </div>
            </details>

            <dl className="text-sm space-y-1">
              <div className="flex justify-between"><dt className="text-steel">الإجمالي قبل الخصم</dt><dd className="price">{money(sub)}</dd></div>
              {disc > 0 && <div className="flex justify-between text-sale"><dt>خصم</dt><dd className="price">- {money(disc)}</dd></div>}
              <div className="flex justify-between text-lg font-black text-ink pt-1"><dt>المطلوب</dt><dd className="price">{money(total)}</dd></div>
            </dl>
            <Button className="w-full h-14 text-base" loading={busy} disabled={!lines.length} onClick={checkout}>
              <Receipt className="w-5 h-5" /> إتمام البيع وخصم من المخزن
            </Button>
          </div>
        </Card>
        </div>
      </div>

      {/* Phones: running total always visible */}
      {lines.length > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-line px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center gap-3 shadow-[0_-6px_20px_rgba(0,0,0,0.06)]">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-steel price">{count} قطعة</p>
            <p className="price font-black text-ink text-lg leading-tight">{money(total)}</p>
          </div>
          <Button className="h-11 px-5" onClick={() => document.getElementById('pos-invoice')?.scrollIntoView({ behavior: 'smooth' })}>
            <Receipt className="w-4 h-4" /> الفاتورة
          </Button>
        </div>
      )}

      {printInv && <InvoicePrintModal hasCart={lines.length > 0} onQuote={quote} onClose={() => setPrintInv(false)} />}
      {printLabels && <LabelsModal products={products} onClose={() => setPrintLabels(false)} onChanged={onSold} />}
      {receipt && <ReceiptModal r={receipt} onClose={() => { setReceipt(null); setTimeout(() => searchRef.current?.focus(), 50); }} />}

      <Modal open={showDay} onClose={() => setShowDay(false)} title={`فواتير الكاشير — ${day?.date || ''}`} wide>
        {!day?.sales?.length ? <Empty title="مفيش فواتير النهارده لسه" /> : (
          <ul className="divide-y divide-line">
            {day.sales.map((s: any) => {
              const back = s.status === 'returned' || s.status === 'cancelled';
              return (
                <li key={s.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${back ? 'line-through text-steel' : 'text-ink'}`}>
                      <span dir="ltr" className="price">{s.code}</span> · {s.customer_name}
                    </p>
                    <p className="text-xs text-steel price">{s.created_at.slice(11, 16)} · {day.payments?.[s.payment_method]} · {day.channels?.[s.channel]} · {s.created_by}{back ? ' · اترجعت' : ''}</p>
                  </div>
                  <span className={`price font-black ${back ? 'text-steel line-through' : 'text-ink'}`}>{money(s.total)}</span>
                  <button onClick={() => api.get('admin/pos-receipt', { code: s.code }).then(setReceipt)} className="p-2 text-steel hover:text-ink" aria-label="طباعة"><Printer className="w-4 h-4" /></button>
                  {!back && <button onClick={() => returnSale(s)} className="p-2 text-steel hover:text-sale" aria-label="مرتجع" title="مرتجع"><RotateCcw className="w-4 h-4" /></button>}
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </>
  );
};

/** 80mm thermal receipt in a print window. `quote` prints the cart before selling (عرض سعر). */
export function printReceipt(r: Receipt, quote = false) {
    const w = window.open('', '_blank', 'width=380,height=640');
    if (!w) return;
    const rows = r.items.map((i) => `<tr><td>${esc(i.name)}<br><small>${i.qty} × ${fmt(i.price)}</small></td><td class="l">${fmt(i.price * i.qty)}</td></tr>`).join('');
    w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${r.code}</title><style>
      @page{size:80mm auto;margin:4mm} body{font-family:Tahoma,Arial,sans-serif;font-size:13px;color:#000;margin:0;width:72mm}
      h1{font-size:18px;text-align:center;margin:0 0 2px} .c{text-align:center} .muted{color:#444;font-size:11px}
      table{width:100%;border-collapse:collapse;margin:8px 0} td{padding:4px 0;border-bottom:1px dashed #999;vertical-align:top} .l{text-align:left;white-space:nowrap}
      .t td{border:0;padding:2px 0} .big td{font-size:16px;font-weight:bold;border-top:1px solid #000;padding-top:6px}
    </style></head><body>
      <h1>HOMEX</h1><div class="c muted">${quote ? 'عرض سعر — مش فاتورة' : 'فاتورة بيع'}</div>
      <div class="muted" style="margin-top:6px">${r.code ? `رقم: ${esc(r.code)}<br>` : ''}التاريخ: ${esc(r.createdAt)}${r.cashier ? `<br>الكاشير: ${esc(r.cashier)}` : ''}${r.customerName ? `<br>العميل: ${esc(r.customerName)}` : ''}${r.customerPhone ? ` — ${esc(r.customerPhone)}` : ''}</div>
      <table>${rows}</table>
      <table class="t"><tr><td>الإجمالي</td><td class="l">${fmt(r.subtotal)}</td></tr>
      ${r.discount > 0 ? `<tr><td>خصم</td><td class="l">- ${fmt(r.discount)}</td></tr>` : ''}
      <tr class="big"><td>المطلوب</td><td class="l">${fmt(r.total)}</td></tr>${r.paymentLabel ? `<tr><td>الدفع</td><td class="l">${esc(r.paymentLabel)}</td></tr>` : ''}</table>
      <div class="c muted" style="margin-top:10px">شكراً لتعاملك مع HOMEX<br>home-x.online</div>
      <script>window.onload=function(){window.print();setTimeout(function(){window.close()},300)}<\/script>
    </body></html>`);
    w.document.close();
}

const ReceiptModal: React.FC<{ r: Receipt; onClose: () => void }> = ({ r, onClose }) => {
  const print = () => printReceipt(r);
  return (
    <Modal open onClose={onClose} title="تم البيع ✅"
      footer={<div className="flex gap-2 justify-end"><Button variant="ghost" onClick={print}><Printer className="w-4 h-4" /> طباعة الفاتورة</Button><Button onClick={onClose}>فاتورة جديدة</Button></div>}>
      <div className="text-center">
        <p className="text-sm text-steel">فاتورة <span dir="ltr" className="price font-bold text-ink">{r.code}</span></p>
        <p className="text-3xl font-black text-ink price mt-1">{money(r.total)}</p>
        <p className="text-sm text-steel mt-1">{r.paymentLabel} · {r.channelLabel}</p>
      </div>
      <ul className="mt-4 divide-y divide-line text-sm">
        {r.items.map((i, k) => (
          <li key={k} className="flex justify-between gap-3 py-2"><span>{i.name} <span className="text-steel price">× {i.qty}</span></span><span className="price font-bold">{money(i.price * i.qty)}</span></li>
        ))}
      </ul>
      <p className="text-xs text-steel mt-3">الكمية اتخصمت من المخزن، والبيعة اتسجلت في الحسابات والطلبات (فلتر «الكاشير»).</p>
    </Modal>
  );
};

const esc = (s: string) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const fmt = (n: number) => `${Math.round(n).toLocaleString('en-US')} ج.م`;

/* ============================ Stock ============================ */

const MODES: Record<string, { label: string; Icon: React.FC<any>; hint: string; tone: string }> = {
  restock: { label: 'استلام بضاعة', Icon: PackagePlus, hint: 'الكمية اللي وصلت المخزن', tone: 'text-save' },
  damaged: { label: 'تالف / هالك', Icon: AlertTriangle, hint: 'الكمية اللي باظت', tone: 'text-sale' },
  out: { label: 'صرف', Icon: PackageMinus, hint: 'هدية، عينة، استخدام داخلي...', tone: 'text-sale' },
  count: { label: 'جرد (العدد الفعلي)', Icon: ClipboardList, hint: 'اكتب العدد اللي لقيته فعلاً على الرف', tone: 'text-ink' },
};

const Stock: React.FC<{ products: Product[]; onChanged: () => void }> = ({ products, onChanged }) => {
  const [q, setQ] = useState('');
  const [low, setLow] = useState(false);
  const [adj, setAdj] = useState<{ p: Product; mode: string } | null>(null);
  const [hist, setHist] = useState<Product | null>(null);

  const rows = products.filter((p) => (!low || p.stock <= 5) && (!q || p.name.includes(q) || (p.sku || '').includes(q)));
  const units = products.reduce((a, p) => a + p.stock, 0);
  const costValue = products.reduce((a, p) => a + p.stock * (p.cost || 0), 0);
  const saleValue = products.reduce((a, p) => a + p.stock * p.price, 0);
  const lowCount = products.filter((p) => p.stock <= 5 && p.active !== false).length;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {[
          ['قطع في المخزن', units.toLocaleString('en-US'), ''],
          ['قيمته بالتكلفة', money(Math.round(costValue)), ''],
          ['قيمته بسعر البيع', money(Math.round(saleValue)), ''],
          ['منتجات قربت تخلص', String(lowCount), lowCount ? 'text-sale' : ''],
        ].map(([l, v, c]) => (
          <div key={l} className="bg-white rounded-xl border border-line p-3">
            <p className="text-xs text-steel">{l}</p>
            <p className={`price text-lg font-black mt-0.5 ${c || 'text-ink'}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <label className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-steel" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر باسم المنتج أو الكود" className="pr-9" />
        </label>
        <button onClick={() => setLow(!low)} aria-pressed={low}
          className={`h-11 px-4 rounded-lg text-sm font-bold border flex items-center gap-2 ${low ? 'bg-sale text-white border-sale' : 'bg-white text-ink border-line'}`}>
          <AlertTriangle className="w-4 h-4" /> اللي قرب يخلص بس
        </button>
      </div>

      <Card>
        {rows.length === 0 ? <Empty title="مفيش منتجات هنا" /> : (
          <ul className="divide-y divide-line -my-2">
            {rows.map((p) => (
              <li key={p.id} className="py-3 flex flex-wrap sm:flex-nowrap items-center gap-3">
                {p.image ? <img src={thumb(p.image)} alt="" className="w-12 h-12 rounded-lg object-cover bg-shelf shrink-0" /> : <span className="w-12 h-12 rounded-lg bg-shelf shrink-0" />}
                <div className="flex-1 min-w-[140px]">
                  <p className="font-bold text-sm text-ink line-clamp-1">{p.name}</p>
                  <p className="text-xs text-steel price">{p.sku ? <span dir="ltr">{p.sku}</span> : 'بدون كود'} · تكلفة {money(Math.round(p.cost || 0))} · بيع {money(p.price)}</p>
                </div>
                <span className={`price text-lg font-black w-14 text-center shrink-0 ${p.stock <= 0 ? 'text-sale' : p.stock <= 5 ? 'text-gold-deep' : 'text-ink'}`}>{p.stock}</span>
                <div className="flex gap-1.5 shrink-0 w-full sm:w-auto">
                  <Button variant="ghost" className="flex-1 sm:flex-none h-9 px-3 text-xs" onClick={() => setAdj({ p, mode: 'restock' })}><PackagePlus className="w-4 h-4 text-save" /> استلام</Button>
                  <Button variant="ghost" className="flex-1 sm:flex-none h-9 px-3 text-xs" onClick={() => setAdj({ p, mode: 'damaged' })}><PackageMinus className="w-4 h-4 text-sale" /> خصم</Button>
                  <Button variant="ghost" className="flex-1 sm:flex-none h-9 px-3 text-xs" onClick={() => setAdj({ p, mode: 'count' })}><ClipboardList className="w-4 h-4" /> جرد</Button>
                  <button onClick={() => setHist(p)} className="p-2 text-steel hover:text-ink" aria-label="حركة المنتج" title="حركة المنتج"><History className="w-4 h-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {adj && <AdjustModal p={adj.p} initialMode={adj.mode} onClose={() => setAdj(null)} onDone={() => { setAdj(null); onChanged(); }} />}
      {hist && <MovesModal p={hist} onClose={() => setHist(null)} />}
    </>
  );
};

const AdjustModal: React.FC<{ p: Product; initialMode: string; onClose: () => void; onDone: () => void }> = ({ p, initialMode, onClose, onDone }) => {
  const toast = useToast();
  const [mode, setMode] = useState(initialMode);
  const [qty, setQty] = useState(initialMode === 'count' ? String(p.stock) : '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const n = parseInt(qty) || 0;
  const after = mode === 'restock' ? p.stock + n : mode === 'count' ? n : p.stock - n;

  const save = async () => {
    setBusy(true);
    try {
      await api.post('admin/stock-adjust', { productId: Number(p.id), mode, qty: n, note });
      toast(`المخزن بقى ${after}`);
      onDone();
    } catch (e: any) { toast(e.message, 'err'); }
    setBusy(false);
  };

  return (
    <Modal open onClose={onClose} title={p.name}
      footer={<div className="flex gap-2 justify-end"><Button variant="ghost" onClick={onClose}>إلغاء</Button><Button onClick={save} loading={busy} disabled={mode !== 'count' && n < 1}>حفظ</Button></div>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(MODES).map(([k, m]) => (
            <button key={k} onClick={() => { setMode(k); setQty(k === 'count' ? String(p.stock) : ''); }} aria-pressed={mode === k}
              className={`h-12 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 ${mode === k ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink'}`}>
              <m.Icon className={`w-4 h-4 ${mode === k ? '' : m.tone}`} /> {m.label}
            </button>
          ))}
        </div>
        <Field label={mode === 'count' ? 'العدد الفعلي' : 'الكمية'} hint={MODES[mode].hint}>
          <Input autoFocus inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} className="h-12 text-lg price" />
        </Field>
        <Field label="ملاحظة (اختياري)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={mode === 'restock' ? 'مثلاً: فاتورة المورد رقم 125' : 'السبب'} />
        </Field>
        <p className="bg-shelf rounded-xl p-3 text-sm text-center">
          المخزن دلوقتي <b className="price">{p.stock}</b> ← هيبقى <b className={`price ${after < 0 ? 'text-sale' : 'text-ink'}`}>{after}</b>
        </p>
      </div>
    </Modal>
  );
};

const MovesModal: React.FC<{ p: Product; onClose: () => void }> = ({ p, onClose }) => {
  const [d, setD] = useState<any>(null);
  useEffect(() => { api.get('admin/stock-moves', { product: p.id }).then(setD).catch(() => setD({ moves: [], reasons: {} })); }, [p.id]);
  return (
    <Modal open onClose={onClose} title={`حركة «${p.name}»`} wide>
      {!d ? <Spinner /> : d.moves.length === 0 ? <Empty title="مفيش حركات متسجلة لسه" text="أي بيع أو استلام أو جرد من دلوقتي هيظهر هنا." /> : (
        <ul className="divide-y divide-line text-sm">
          {d.moves.map((m: any) => (
            <li key={m.id} className="py-2.5 flex items-center gap-3">
              <span className={`price font-black w-14 text-center shrink-0 ${m.change > 0 ? 'text-save' : 'text-sale'}`} dir="ltr">{m.change > 0 ? '+' : ''}{m.change}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink">{d.reasons[m.reason] || m.reason}{m.ref ? <span dir="ltr" className="price text-steel font-normal"> · {m.ref}</span> : ''}</p>
                <p className="text-xs text-steel price">{m.created_at.slice(0, 16)} · {m.admin_name || '—'}{m.note ? ` · ${m.note}` : ''}</p>
              </div>
              <span className="text-xs text-steel shrink-0">الرصيد <b className="price text-ink">{m.stock_after}</b></span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};

/* ============================ Reprint invoices ============================ */

const InvoicePrintModal: React.FC<{ hasCart: boolean; onQuote: () => void; onClose: () => void }> = ({ hasCart, onQuote, onClose }) => {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    const t = setTimeout(() => api.get('admin/pos-search', { q }).then(setD).catch((e) => toast(e.message, 'err')), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q]);
  const print = async (code: string) => {
    try { printReceipt(await api.get('admin/pos-receipt', { code })); } catch (e: any) { toast(e.message, 'err'); }
  };
  return (
    <Modal open onClose={onClose} title="طباعة فاتورة" wide>
      <div className="space-y-3">
        {hasCart && (
          <button onClick={onQuote} className="w-full rounded-xl border-2 border-dashed border-gold bg-gold/5 p-3 text-right flex items-center gap-3">
            <FileText className="w-5 h-5 text-gold-deep shrink-0" />
            <span><b className="text-ink text-sm">اطبع الفاتورة اللي مفتوحة دلوقتي كـ«عرض سعر»</b><span className="block text-xs text-steel">من غير ما تتباع أو تتخصم من المخزن</span></span>
          </button>
        )}
        <label className="relative block">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-steel" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="رقم الفاتورة أو اسم العميل أو موبايله" className="pr-9" />
        </label>
        {!d ? <Spinner /> : d.sales.length === 0 ? <Empty title="مفيش فواتير بالبحث ده" /> : (
          <ul className="divide-y divide-line max-h-[55vh] overflow-y-auto">
            {d.sales.map((s: any) => {
              const back = s.status === 'returned' || s.status === 'cancelled';
              return (
                <li key={s.id} className="py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-ink"><span dir="ltr" className="price">{s.code}</span> · {s.customer_name}{back ? <span className="text-sale text-xs"> · اترجعت</span> : ''}</p>
                    <p className="text-xs text-steel price"><bdi dir="ltr">{s.created_at}</bdi> · {d.payments?.[s.payment_method]} · {s.created_by}</p>
                  </div>
                  <span className="price font-black text-ink shrink-0">{money(s.total)}</span>
                  <Button variant="ghost" className="h-9 px-3 shrink-0" onClick={() => print(s.code)}><Printer className="w-4 h-4" /> طباعة</Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
};

/* ============================ Barcode labels ============================ */

const LABEL_SIZES: Record<string, { label: string; w: number; h: number; sheet?: boolean }> = {
  '40x25': { label: 'استيكر 40×25 مم (طابعة استيكر)', w: 40, h: 25 },
  '50x30': { label: 'استيكر 50×30 مم (طابعة استيكر)', w: 50, h: 30 },
  'a4': { label: 'ورق A4 استيكر (24 في الصفحة)', w: 70, h: 37, sheet: true },
};

const isEan13 = (c: string) => {
  if (!/^\d{13}$/.test(c)) return false;
  const sum = c.slice(0, 12).split('').reduce((a, d, i) => a + Number(d) * (i % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(c[12]);
};

const barcodeSvg = (code: string, h: number) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    JsBarcode(svg, code, { format: isEan13(code) ? 'EAN13' : 'CODE128', height: h, width: 1.6, margin: 0, marginLeft: isEan13(code) ? 12 : 0, fontSize: 12, textMargin: 1, displayValue: true, font: 'Arial' });
  } catch {
    JsBarcode(svg, code, { format: 'CODE128', height: h, width: 1.4, margin: 0, fontSize: 11, displayValue: true });
  }
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  return svg.outerHTML;
};

const LabelsModal: React.FC<{ products: Product[]; onClose: () => void; onChanged: () => void }> = ({ products, onClose, onChanged }) => {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Record<string, number>>({});
  const [size, setSize] = useState(() => { try { return localStorage.getItem('homex_label_size') || '40x25'; } catch { return '40x25'; } });
  const [showPrice, setShowPrice] = useState(true);
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState(products);
  useEffect(() => setList(products), [products]);

  const rows = list.filter((p) => !q || p.name.includes(q) || (p.sku || '').includes(q));
  const chosen = list.filter((p) => sel[p.id] > 0);
  const missing = chosen.filter((p) => !p.sku);
  const total = chosen.reduce((a, p) => a + sel[p.id], 0);
  const setN = (id: string, n: number) => setSel((x) => ({ ...x, [id]: Math.max(0, Math.min(999, n)) }));

  const makeCodes = async () => {
    setBusy(true);
    try {
      const l = await api.post('admin/auto-skus', { ids: missing.map((p) => Number(p.id)) });
      setList(l); onChanged();
      toast('اتعمل كود لكل المنتجات اللي مكانش ليها');
    } catch (e: any) { toast(e.message, 'err'); }
    setBusy(false);
  };

  const print = () => {
    if (!chosen.length) return toast('اختار المنتجات اللي عايز تطبع لها أكواد', 'err');
    if (missing.length) return toast('في منتجات مالهاش كود — دوس «اعمل كود تلقائي» الأول', 'err');
    try { localStorage.setItem('homex_label_size', size); } catch { /* ignore */ }
    const S = LABEL_SIZES[size];
    const labels: string[] = [];
    chosen.forEach((p) => {
      const svg = barcodeSvg(p.sku!, S.sheet ? 48 : S.h >= 30 ? 40 : 30);
      for (let k = 0; k < sel[p.id]; k++) {
        labels.push(`<div class="lb"><div class="n">${esc(p.name)}</div><div class="b">${svg}</div>${showPrice ? `<div class="p">${fmt(p.price)}</div>` : ''}</div>`);
      }
    });
    const w = window.open('', '_blank', 'width=600,height=700');
    if (!w) return toast('المتصفح منع نافذة الطباعة — اسمح بالـ popups للموقع', 'err');
    const page = S.sheet
      ? `@page{size:A4;margin:8mm 5mm} body{display:grid;grid-template-columns:repeat(3,${S.w}mm);grid-auto-rows:${S.h}mm;justify-content:center}`
      : `@page{size:${S.w}mm ${S.h}mm;margin:0} .lb{page-break-after:always;break-after:page}`;
    w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>أكواد المنتجات</title><style>
      *{box-sizing:border-box} body{margin:0;font-family:Tahoma,Arial,sans-serif;color:#000} ${page}
      .lb{width:${S.w}mm;height:${S.h}mm;padding:1.2mm 1.5mm;display:flex;flex-direction:column;align-items:center;justify-content:space-between;overflow:hidden;text-align:center}
      .n{font-size:${S.w >= 50 ? 9.5 : 8}pt;font-weight:bold;line-height:1.15;max-height:2.3em;overflow:hidden;width:100%}
      .b{flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center} .b svg{max-width:100%;max-height:100%;height:auto}
      .p{font-size:${S.w >= 50 ? 11 : 9.5}pt;font-weight:bold;direction:rtl}
    </style></head><body>${labels.join('')}<script>window.onload=function(){setTimeout(function(){window.print()},200)}<\/script></body></html>`);
    w.document.close();
  };

  return (
    <Modal open onClose={onClose} title="طباعة أكواد (باركود)" wide
      footer={<div className="flex flex-wrap gap-2 items-center justify-between w-full">
        <span className="text-sm text-steel price">{total} استيكر</span>
        <div className="flex gap-2"><Button variant="ghost" onClick={onClose}>إلغاء</Button><Button onClick={print} disabled={!total}><Printer className="w-4 h-4" /> اطبع</Button></div>
      </div>}>
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="مقاس الاستيكر">
            <Select value={size} onChange={(e) => setSize(e.target.value)}>
              {Object.entries(LABEL_SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm font-bold text-ink sm:mt-7">
            <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="w-4 h-4 accent-[#f47a20]" /> اطبع السعر على الاستيكر
          </label>
        </div>
        <label className="relative block">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-steel" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر على منتج" className="pr-9" />
        </label>
        {missing.length > 0 && (
          <div className="rounded-xl bg-gold/10 border border-gold/40 p-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="flex-1 min-w-[180px]">{missing.length} من المنتجات اللي اخترتها مالهاش باركود. السيستم يقدر يعمل لها كود داخلي ويحفظه عليها.</span>
            <Button className="h-9" loading={busy} onClick={makeCodes}>اعمل كود تلقائي</Button>
          </div>
        )}
        <ul className="divide-y divide-line max-h-[48vh] overflow-y-auto">
          {rows.map((p) => {
            const n = sel[p.id] || 0;
            return (
              <li key={p.id} className="py-2 flex items-center gap-3">
                <input type="checkbox" checked={n > 0} onChange={(e) => setN(p.id, e.target.checked ? Math.max(1, p.stock) : 0)} className="w-4 h-4 accent-[#f47a20] shrink-0" aria-label={p.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink line-clamp-1">{p.name}</p>
                  <p className="text-xs text-steel price">{p.sku ? <span dir="ltr">{p.sku}</span> : <span className="text-sale">مالوش كود</span>} · {money(p.price)} · مخزن {p.stock}</p>
                </div>
                <div className="flex items-center border border-line rounded-lg h-9 shrink-0">
                  <button onClick={() => setN(p.id, n + 1)} className="w-8 h-full flex items-center justify-center" aria-label="زوّد"><Plus className="w-3.5 h-3.5" /></button>
                  <input value={n} onChange={(e) => setN(p.id, parseInt(e.target.value.replace(/\D/g, '')) || 0)} inputMode="numeric" className="w-10 text-center price font-bold bg-transparent outline-none" aria-label="عدد الاستيكرات" />
                  <button onClick={() => setN(p.id, n - 1)} disabled={n <= 0} className="w-8 h-full flex items-center justify-center disabled:opacity-30" aria-label="قلّل"><Minus className="w-3.5 h-3.5" /></button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-steel">بيتطبع لكل منتج عدد استيكرات زي ما تختار (أول ما تعلّم عليه بيحط عدد القطع اللي في المخزن). على طابعة الاستيكر اختار من نافذة الطباعة نفس المقاس ومن غير هوامش.</p>
      </div>
    </Modal>
  );
};
