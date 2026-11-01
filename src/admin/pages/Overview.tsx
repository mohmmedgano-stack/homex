import React, { useEffect, useState } from 'react';
import { api, money } from '../../lib/api';
import { Card, Stat, Spinner, StatusBadge, Empty, Button } from '../ui';
import { AlertTriangle } from 'lucide-react';

export const Overview: React.FC<{ go: (p: any) => void }> = ({ go }) => {
  const [sum, setSum] = useState<any>(null);
  const [orders, setOrders] = useState<any[] | null>(null);

  useEffect(() => {
    api.get('admin/summary').then(setSum).catch(() => setSum(false));
    api.get('admin/orders').then((d) => setOrders(d.orders.slice(0, 8))).catch(() => setOrders([]));
  }, []);

  if (!sum) return <Spinner />;
  const pending = sum.orders.byStatus.pending || 0;
  const maxRev = Math.max(1, ...sum.days.map((d: any) => Number(d.rev)));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">أهلاً بيك</h1>
        <p className="text-sm text-steel mt-1">ملخص الشهر ده، من أول الشهر لحد النهارده.</p>
      </div>

      {(pending > 0 || sum.stock.low > 0) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {pending > 0 && (
            <button onClick={() => go('orders')} className="text-right bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
              <span>
                <span className="block font-extrabold text-ink">عندك {pending} طلب جديد</span>
                <span className="block text-sm text-steel">محتاجين تأكيد مع العميل</span>
              </span>
              <span className="text-sm font-bold text-gold-deep">افتح الطلبات</span>
            </button>
          )}
          {sum.stock.low > 0 && (
            <button onClick={() => go('products')} className="text-right bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-sale shrink-0" />
              <span>
                <span className="block font-extrabold text-ink">{sum.stock.low} منتج قرب يخلص</span>
                <span className="block text-sm text-steel">باقي 5 قطع أو أقل</span>
              </span>
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="المبيعات (اتسلّمت)" value={money(sum.revenue)} sub={`${sum.deliveredCount} طلب`} />
        <Stat label="صافي الربح" value={money(sum.netProfit)} tone={sum.netProfit >= 0 ? 'good' : 'bad'} sub="بعد التكلفة والمصاريف" />
        <Stat label="طلبات لسه ماتسلمتش" value={money(sum.orders.pipelineValue)} sub={`${sum.orders.pipelineCount} طلب`} tone="brand" />
        <Stat label="قيمة المخزن بالتكلفة" value={money(sum.stock.cost)} sub={`بسعر البيع ${money(sum.stock.value)}`} />
      </div>

      <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">
        <Card title="المبيعات اليومية" className="lg:col-span-3">
          {sum.days.length === 0 ? (
            <Empty title="مفيش طلبات الشهر ده لسه" />
          ) : (
            <div className="flex items-end gap-1.5 h-48 overflow-x-auto no-scrollbar" role="img" aria-label="رسم المبيعات اليومية">
              {sum.days.map((d: any) => (
                <div key={d.d} className="flex-1 min-w-[18px] flex flex-col items-center justify-end h-full group">
                  <span className="text-[10px] text-steel opacity-0 group-hover:opacity-100 price">{Number(d.rev).toLocaleString('en-US')}</span>
                  <div className="w-full max-w-10 bg-gold rounded-t" style={{ height: `${Math.max(2, (Number(d.rev) / maxRev) * 85)}%` }} title={`${d.d}: ${money(d.rev)}`} />
                  <span className="text-[10px] text-steel mt-1 price">{d.d.slice(8)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="الأكثر مبيعاً" className="lg:col-span-2">
          {sum.topProducts.length === 0 ? (
            <Empty title="لسه مفيش مبيعات" />
          ) : (
            <ul className="divide-y divide-line">
              {sum.topProducts.map((p: any) => (
                <li key={p.name} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-ink line-clamp-1">{p.name}</span>
                  <span className="text-steel shrink-0 price">{p.qty} قطعة</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="آخر الطلبات" action={<Button variant="ghost" onClick={() => go('orders')}>كل الطلبات</Button>}>
        {!orders ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <Empty title="مفيش طلبات لسه" text="أول ما عميل يطلب من الموقع هيظهر هنا." />
        ) : (
          <ul className="divide-y divide-line -my-2">
            {orders.map((o) => (
              <li key={o.id} className="py-3 flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-bold text-ink truncate">{o.customer_name}</span>
                  <span className="block text-xs text-steel price">{o.code} · {o.created_at.slice(0, 16)}</span>
                </span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="price font-bold text-sm">{money(o.total)}</span>
                  <StatusBadge s={o.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
