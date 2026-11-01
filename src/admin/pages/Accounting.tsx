import React, { useEffect, useState } from 'react';
import { api, money } from '../../lib/api';
import { Card, Stat, Spinner, Empty, Input, Select, Field, Button, Modal, useToast } from '../ui';
import { Plus, Trash2 } from 'lucide-react';

const EXP_CATS = ['إعلانات', 'شحن', 'إيجار', 'مرتبات', 'تغليف', 'كهرباء ونت', 'مرتجعات', 'أخرى'];

const today = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = () => today().slice(0, 8) + '01';
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

export const Accounting: React.FC = () => {
  const toast = useToast();
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [sum, setSum] = useState<any>(null);
  const [exp, setExp] = useState<any[] | null>(null);
  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setSum(null);
    api.get('admin/summary', { from, to }).then(setSum).catch((e) => toast(e.message, 'err'));
    api.get('admin/expenses', { from, to }).then(setExp).catch(() => setExp([]));
  };
  useEffect(load, [from, to]);

  const saveExp = async () => {
    setBusy(true);
    try {
      await api.post('admin/expense', form);
      toast(form.id ? 'المصروف اتعدل' : 'المصروف اتسجل');
      setForm(null);
      load();
    } catch (e: any) {
      toast(e.message, 'err');
    } finally {
      setBusy(false);
    }
  };
  const delExp = async (e: any) => {
    if (!confirm(`تمسح مصروف ${money(e.amount)}؟`)) return;
    await api.post('admin/expense-delete', { id: e.id }).catch((x) => toast(x.message, 'err'));
    load();
  };

  const presets: [string, string, string][] = [
    ['الشهر ده', firstOfMonth(), today()],
    ['آخر 7 أيام', daysAgo(6), today()],
    ['آخر 30 يوم', daysAgo(29), today()],
    ['النهارده', today(), today()],
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-ink">الحسابات</h1>
          <p className="text-sm text-steel mt-1">الأرباح محسوبة على الطلبات اللي اتسلّمت بس.</p>
        </div>
        <Button onClick={() => setForm({ date: today(), category: 'إعلانات', amount: '', note: '' })}>
          <Plus className="w-4 h-4" /> سجّل مصروف
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {presets.map(([l, f, t]) => (
              <button key={l} onClick={() => { setFrom(f); setTo(t); }} className={`shrink-0 h-10 px-3 rounded-lg text-sm font-bold border ${from === f && to === t ? 'bg-ink text-white border-ink' : 'border-line'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-end">
            <Field label="من"><Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-40" /></Field>
            <Field label="لحد"><Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="w-40" /></Field>
          </div>
        </div>
      </Card>

      {!sum ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="المبيعات" value={money(sum.revenue)} sub={`${sum.deliveredCount} طلب اتسلّم`} />
            <Stat label="تكلفة البضاعة" value={money(sum.cogs)} />
            <Stat label="المصاريف" value={money(sum.expenses)} tone={sum.expenses > 0 ? 'bad' : 'default'} />
            <Stat label="صافي الربح" value={money(sum.netProfit)} tone={sum.netProfit >= 0 ? 'good' : 'bad'} sub={`هامش ربح البضاعة ${sum.margin}%`} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            <Card title="قايمة الأرباح والخسائر">
              <dl className="text-sm space-y-2.5">
                <PL k="مبيعات المنتجات" v={sum.revenue} />
                <PL k="ناقص: تكلفة البضاعة" v={-sum.cogs} />
                <PL k="مجمل الربح" v={sum.grossProfit} strong />
                <PL k="زائد: الشحن المحصّل من العملاء" v={sum.shipping} />
                {sum.expensesByCategory.map((e: any) => (
                  <PL key={e.category} k={`ناقص: ${e.category}`} v={-e.amount} />
                ))}
                <div className="border-t-2 border-ink pt-2.5">
                  <PL k="صافي الربح" v={sum.netProfit} strong big />
                </div>
              </dl>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="bg-shelf rounded-xl p-3">
                  <p className="text-steel">متوسط الطلب</p>
                  <p className="font-black price mt-1">{money(sum.avgOrder)}</p>
                </div>
                <div className="bg-shelf rounded-xl p-3">
                  <p className="text-steel">لسه ماتسلمش</p>
                  <p className="font-black price mt-1">{money(sum.orders.pipelineValue)}</p>
                </div>
              </div>
            </Card>

            <Card title="ربح كل منتج">
              {sum.topProducts.length === 0 ? (
                <Empty title="مفيش مبيعات في الفترة دي" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-steel text-xs">
                      <th className="text-right font-bold pb-2">المنتج</th>
                      <th className="font-bold pb-2">الكمية</th>
                      <th className="text-left font-bold pb-2">الربح</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {sum.topProducts.map((p: any) => (
                      <tr key={p.name}>
                        <td className="py-2.5 font-bold text-ink"><span className="line-clamp-1">{p.name}</span></td>
                        <td className="py-2.5 text-center price">{p.qty}</td>
                        <td className={`py-2.5 text-left price font-bold ${p.profit >= 0 ? 'text-save' : 'text-sale'}`}>{money(p.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </>
      )}

      <Card title="المصاريف" action={exp && exp.length > 0 ? <span className="text-sm font-bold price">{money(exp.reduce((a, e) => a + Number(e.amount), 0))}</span> : null}>
        {!exp ? (
          <Spinner />
        ) : exp.length === 0 ? (
          <Empty title="مفيش مصاريف مسجلة في الفترة دي" text="سجّل الإعلانات والشحن والإيجار عشان صافي الربح يطلع مظبوط." />
        ) : (
          <ul className="divide-y divide-line -my-2">
            {exp.map((e) => (
              <li key={e.id} className="py-3 flex items-center gap-3">
                <button onClick={() => setForm({ ...e })} className="flex-1 text-right min-w-0">
                  <span className="block font-bold text-ink">{e.category}</span>
                  <span className="block text-xs text-steel truncate price">{e.date}{e.note ? ` · ${e.note}` : ''}</span>
                </button>
                <span className="price font-bold text-sale">{money(e.amount)}</span>
                <button onClick={() => delExp(e)} className="p-2 text-steel hover:text-sale" aria-label="مسح"><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? 'تعديل مصروف' : 'مصروف جديد'}
        footer={<><Button variant="ghost" onClick={() => setForm(null)}>إلغاء</Button><Button onClick={saveExp} loading={busy}>حفظ</Button></>}
      >
        {form && (
          <div className="space-y-4">
            <Field label="نوع المصروف">
              <Select value={EXP_CATS.includes(form.category) ? form.category : 'أخرى'} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {EXP_CATS.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="المبلغ"><Input type="number" inputMode="decimal" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus /></Field>
              <Field label="التاريخ"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            </div>
            <Field label="ملاحظة" hint="اختياري، مثلاً: حملة فيسبوك الكاتيل">
              <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
};

const PL: React.FC<{ k: string; v: number; strong?: boolean; big?: boolean }> = ({ k, v, strong, big }) => (
  <div className={`flex justify-between gap-3 ${strong ? 'font-extrabold text-ink' : 'text-steel'} ${big ? 'text-lg' : ''}`}>
    <dt>{k}</dt>
    <dd className={`price ${strong ? (v >= 0 ? 'text-save' : 'text-sale') : ''}`}>{v < 0 ? `(${money(-v)})` : money(v)}</dd>
  </div>
);
