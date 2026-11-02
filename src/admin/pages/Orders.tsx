import React, { useEffect, useState } from 'react';
import { api, money } from '../../lib/api';
import { Card, Spinner, StatusBadge, STATUS, Empty, Input, Modal, Button, useToast } from '../ui';
import { Phone, MessageCircle, Search, Download } from 'lucide-react';

const PAY: Record<string, string> = { cod: 'الدفع عند الاستلام', vodafone: 'فودافون كاش', instapay: 'إنستاباي', card: 'فيزا / ماستركارد' };
const FLOW = ['pending', 'confirmed', 'shipped', 'delivered'];

export const Orders: React.FC = () => {
  const toast = useToast();
  const [data, setData] = useState<{ orders: any[]; counts: Record<string, number> } | null>(null);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get('admin/orders', { status, q }).then(setData).catch((e) => toast(e.message, 'err'));
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [status, q]);

  const setOrderStatus = async (o: any, s: string) => {
    setBusy(true);
    try {
      await api.post('admin/order-status', { id: o.id, status: s });
      toast(`الطلب ${o.code} بقى «${STATUS[s].label}»`);
      setOpen((cur: any) => (cur && cur.id === o.id ? { ...cur, status: s } : cur));
      load();
    } catch (e: any) {
      toast(e.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const total = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;
  const wa = (phone: string) => `https://wa.me/2${phone.replace(/^\+?2?/, '')}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">الطلبات</h1>
        <a
          href={`/api/?r=admin/orders-export${status ? `&status=${status}` : ''}`}
          className="h-10 px-4 rounded-lg text-sm font-bold inline-flex items-center gap-2 bg-white text-ink border border-line hover:border-ink"
        >
          <Download className="w-4 h-4" /> تصدير Excel لشركة الشحن
        </a>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
        {[['', 'الكل', total], ...Object.keys(STATUS).map((s) => [s, STATUS[s].label, data?.counts[s] || 0])].map(([id, label, n]) => (
          <button
            key={id as string}
            onClick={() => setStatus(id as string)}
            className={`shrink-0 h-9 px-3.5 rounded-lg text-sm font-bold border ${status === id ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-line'}`}
          >
            {label} <span className="opacity-60 price">({n})</span>
          </button>
        ))}
      </div>

      <label className="relative block">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-steel" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث برقم الطلب أو اسم العميل أو الموبايل" className="pr-9" />
      </label>

      <Card>
        {!data ? (
          <Spinner />
        ) : data.orders.length === 0 ? (
          <Empty title="مفيش طلبات هنا" />
        ) : (
          <ul className="divide-y divide-line -my-2">
            {data.orders.map((o) => (
              <li key={o.id}>
                <button onClick={() => setOpen(o)} className="w-full text-right py-3 flex items-center justify-between gap-3 hover:bg-shelf -mx-2 px-2 rounded-lg">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-bold text-ink truncate">{o.customer_name}</span>
                      <StatusBadge s={o.status} />
                      {o.payment_method === 'card' && o.payment_status === 'paid' && <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">مدفوع</span>}
                    </span>
                    <span className="block text-xs text-steel mt-0.5 price">
                      {o.code} · {o.city || 'بدون مدينة'} · {o.items.reduce((a: number, i: any) => a + Number(i.qty), 0)} قطعة
                    </span>
                  </span>
                  <span className="text-left shrink-0">
                    <span className="block price font-black text-ink">{money(o.total)}</span>
                    <span className="block text-xs text-steel price">{o.created_at.slice(5, 16)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `طلب ${open.code}` : ''} wide>
        {open && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge s={open.status} />
              <span className="text-sm text-steel price">{open.created_at}</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-shelf rounded-xl p-4 space-y-1.5 text-sm">
                <p className="font-extrabold text-ink text-base">{open.customer_name}</p>
                <p className="price" dir="ltr" style={{ textAlign: 'right' }}>{open.phone}{open.alt_phone ? ` / ${open.alt_phone}` : ''}</p>
                <p>{[open.city, open.address].filter(Boolean).join('، ')}</p>
                {open.notes && <p className="text-steel">ملاحظات: {open.notes}</p>}
                <p className="text-steel">
                  الدفع: {PAY[open.payment_method] || open.payment_method}
                  {open.payment_method === 'card' && (
                    <span className={`mr-2 text-xs font-bold px-1.5 py-0.5 rounded ${open.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {open.payment_status === 'paid' ? 'مدفوع' : open.payment_status === 'failed' ? 'فشل الدفع' : 'لسه مدفعش'}
                    </span>
                  )}
                </p>
                <div className="flex gap-2 pt-2">
                  <a href={`tel:${open.phone}`} className="h-9 px-3 rounded-lg bg-ink text-white text-sm font-bold flex items-center gap-1.5">
                    <Phone className="w-4 h-4" /> اتصال
                  </a>
                  <a href={wa(open.phone)} target="_blank" rel="noreferrer" className="h-9 px-3 rounded-lg bg-[#25D366] text-white text-sm font-bold flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4" /> واتساب
                  </a>
                </div>
              </div>

              <div className="rounded-xl border border-line p-4 text-sm space-y-1.5">
                <Row k="المنتجات" v={money(open.subtotal)} />
                <Row k="الشحن" v={money(open.shipping_fee)} />
                <Row k="الإجمالي" v={money(open.total)} strong />
                <div className="border-t border-line my-2" />
                <Row k="التكلفة" v={money(open.cost_total)} muted />
                <Row k="ربح المنتجات" v={money(open.subtotal - open.cost_total)} good />
              </div>
            </div>

            <div>
              <p className="font-extrabold text-ink mb-2">المنتجات</p>
              <ul className="divide-y divide-line border border-line rounded-xl">
                {open.items.map((i: any) => (
                  <li key={i.id} className="flex items-center gap-3 p-3">
                    {i.image ? <img src={i.image} alt="" className="w-12 h-12 rounded-lg object-cover bg-shelf" /> : <span className="w-12 h-12 rounded-lg bg-shelf" />}
                    <span className="flex-1 min-w-0">
                      <span className="block font-bold text-sm text-ink line-clamp-1">{i.name}</span>
                      <span className="block text-xs text-steel price">
                        {i.qty} × {money(i.price)} · التكلفة {money(i.cost)}
                      </span>
                    </span>
                    <span className="price font-bold text-sm">{money(i.price * i.qty)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-extrabold text-ink mb-2">غيّر حالة الطلب</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.keys(STATUS).map((s) => (
                  <Button
                    key={s}
                    variant={open.status === s ? 'dark' : s === 'cancelled' || s === 'returned' ? 'danger' : 'ghost'}
                    disabled={busy || open.status === s}
                    onClick={() => setOrderStatus(open, s)}
                  >
                    {STATUS[s].label}
                  </Button>
                ))}
              </div>
              {FLOW.includes(open.status) && open.status !== 'delivered' && (
                <Button className="w-full mt-3 h-12" loading={busy} onClick={() => setOrderStatus(open, FLOW[FLOW.indexOf(open.status) + 1])}>
                  الخطوة الجاية: {STATUS[FLOW[FLOW.indexOf(open.status) + 1]].label}
                </Button>
              )}
              <p className="text-xs text-steel mt-2">الإلغاء أو المرتجع بيرجّع الكمية للمخزن تلقائياً. الطلب بيتحسب في المبيعات لما يبقى «اتسلّم».</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const Row: React.FC<{ k: string; v: string; strong?: boolean; muted?: boolean; good?: boolean }> = ({ k, v, strong, muted, good }) => (
  <div className={`flex justify-between ${strong ? 'font-black text-base' : ''} ${muted ? 'text-steel' : ''} ${good ? 'text-save font-bold' : ''}`}>
    <span>{k}</span>
    <span className="price">{v}</span>
  </div>
);
