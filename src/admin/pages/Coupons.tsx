import React, { useEffect, useState } from 'react';
import { api, money } from '../../lib/api';
import { Card, Spinner, Empty, Input, Select, Field, Modal, Button, Toggle, useToast } from '../ui';
import { Plus, Pencil, Trash2, Link2, TicketPercent } from 'lucide-react';

type Coupon = {
  id?: number; code: string; type: string; value: number | string; maxDiscount: number | string; minTotal: number | string; maxUses: number | string; perPhone: number | string;
  startsAt: string; endsAt: string; owner: string; commission: number | string; active: boolean; note: string;
  orders?: number; delivered?: number; revenue?: number; discountGiven?: number; cancelled?: number; commissionDue?: number;
};
const blank: Coupon = { code: '', type: 'percent', value: 10, maxDiscount: '', minTotal: '', maxUses: '', perPhone: 1, startsAt: '', endsAt: '', owner: '', commission: '', active: true, note: '' };
const TYPE: Record<string, string> = { percent: 'نسبة %', fixed: 'مبلغ ثابت', free_shipping: 'شحن مجاني' };

/** Discount codes — one per influencer/campaign, with the sales each one brought. */
export const Coupons: React.FC<{ isOwner: boolean }> = ({ isOwner }) => {
  const toast = useToast();
  const [list, setList] = useState<Coupon[] | null>(null);
  const [edit, setEdit] = useState<Coupon | null>(null);
  useEffect(() => { api.get('admin/coupons').then(setList).catch((e) => toast(e.message, 'err')); }, []);

  const link = (c: Coupon) => `${location.origin}/?coupon=${c.code}`;
  const del = async (c: Coupon) => {
    if (!confirm(`تمسح الكوبون ${c.code}؟`)) return;
    try { setList(await api.post('admin/coupon-delete', { id: c.id })); toast('الكوبون اتمسح'); } catch (e: any) { toast(e.message, 'err'); }
  };
  const totals = (list || []).reduce((a, c) => ({ orders: a.orders + (c.delivered || 0), rev: a.rev + (c.revenue || 0), comm: a.comm + (c.commissionDue || 0) }), { orders: 0, rev: 0, comm: 0 });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-ink">كوبونات الخصم</h1>
          <p className="text-sm text-steel mt-1">اعمل كود لكل إنفلونسر أو حملة، واعرف كل كود جاب كام طلب وكام فلوس وعمولته كام.</p>
        </div>
        {isOwner && <Button onClick={() => setEdit({ ...blank })}><Plus className="w-4 h-4" /> كوبون جديد</Button>}
      </div>

      {list && list.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white rounded-xl border border-line p-3"><p className="text-xs text-steel">طلبات اتسلّمت بكوبونات</p><p className="price text-xl font-black text-ink">{totals.orders}</p></div>
          <div className="bg-white rounded-xl border border-line p-3"><p className="text-xs text-steel">مبيعاتها</p><p className="price text-xl font-black text-ink">{money(totals.rev)}</p></div>
          <div className="bg-white rounded-xl border border-line p-3"><p className="text-xs text-steel">عمولات مستحقة</p><p className="price text-xl font-black text-gold-deep">{money(totals.comm)}</p></div>
        </div>
      )}

      {!list ? <Spinner /> : list.length === 0 ? (
        <Card><Empty title="مفيش كوبونات لسه" text="مثال: كود SARA10 للإنفلونسر سارة، خصم 10% للعميل وعمولة 5% ليها على كل طلب يتسلّم." /></Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-3">
          {list.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2">
                    <TicketPercent className="w-5 h-5 text-gold-deep shrink-0" />
                    <span dir="ltr" className="font-black text-lg text-ink font-mono">{c.code}</span>
                    {!c.active && <span className="text-xs font-bold text-steel bg-shelf px-1.5 py-0.5 rounded">موقوف</span>}
                  </p>
                  <p className="text-sm text-steel mt-0.5">
                    {c.type === 'percent' ? `خصم ${c.value}%` : c.type === 'fixed' ? `خصم ${money(Number(c.value))}` : 'شحن مجاني'}
                    {c.owner ? ` · ${c.owner}` : ''}{Number(c.commission) > 0 ? ` · عمولة ${c.commission}%` : ''}
                  </p>
                  <p className="text-xs text-steel mt-0.5">
                    {Number(c.minTotal) > 0 ? `أقل طلب ${money(Number(c.minTotal))} · ` : ''}{Number(c.maxUses) > 0 ? `أقصى ${c.maxUses} مرة · ` : ''}{c.endsAt ? `لحد ${c.endsAt}` : 'مفتوح'}
                  </p>
                </div>
                {isOwner && (
                  <div className="flex shrink-0">
                    <button onClick={() => setEdit({ ...c, maxDiscount: c.maxDiscount || '', minTotal: c.minTotal || '', maxUses: c.maxUses || '', commission: c.commission || '' })} className="p-2 text-steel hover:text-ink" aria-label="تعديل"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => del(c)} className="p-2 text-steel hover:text-sale" aria-label="مسح"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                {[['طلبات', String(c.orders || 0)], ['اتسلّمت', String(c.delivered || 0)], ['مبيعات', money(c.revenue || 0)], ['عمولة', money(c.commissionDue || 0)]].map(([l, v]) => (
                  <div key={l} className="bg-shelf rounded-lg py-2 px-1"><p className="text-[11px] text-steel">{l}</p><p className="price font-black text-ink text-sm">{v}</p></div>
                ))}
              </div>
              <button onClick={() => navigator.clipboard?.writeText(link(c)).then(() => toast('اتنسخ لينك الإنفلونسر — الكود بيتطبق لوحده'))}
                className="mt-3 w-full h-9 rounded-lg border border-dashed border-line text-xs font-bold text-steel hover:text-ink flex items-center justify-center gap-1.5">
                <Link2 className="w-4 h-4" /> <span dir="ltr" className="truncate">{link(c)}</span>
              </button>
            </Card>
          ))}
        </div>
      )}

      {edit && <CouponEditor initial={edit} onClose={() => setEdit(null)} onSaved={(l) => { setList(l); setEdit(null); }} />}
    </div>
  );
};

const CouponEditor: React.FC<{ initial: Coupon; onClose: () => void; onSaved: (l: Coupon[]) => void }> = ({ initial, onClose, onSaved }) => {
  const toast = useToast();
  const [c, setC] = useState<Coupon>(initial);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Coupon, v: any) => setC((x) => ({ ...x, [k]: v }));
  const save = async () => {
    setBusy(true);
    try { onSaved(await api.post('admin/coupon', c)); toast('الكوبون اتحفظ'); } catch (e: any) { toast(e.message, 'err'); }
    setBusy(false);
  };
  return (
    <Modal open onClose={onClose} title={c.id ? `تعديل ${initial.code}` : 'كوبون جديد'} wide
      footer={<div className="flex gap-2 justify-end"><Button variant="ghost" onClick={onClose}>إلغاء</Button><Button onClick={save} loading={busy}>حفظ</Button></div>}>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="الكود" hint="حروف إنجليزي وأرقام">
            <Input dir="ltr" value={c.code} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} placeholder="SARA10" className="font-mono" />
          </Field>
          <Field label="نوع الخصم">
            <Select value={c.type} onChange={(e) => set('type', e.target.value)}>
              {Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          {c.type !== 'free_shipping' && (
            <Field label={c.type === 'percent' ? 'النسبة %' : 'المبلغ (ج.م)'}>
              <Input inputMode="decimal" value={c.value} onChange={(e) => set('value', e.target.value.replace(/[^\d.]/g, ''))} />
            </Field>
          )}
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {c.type === 'percent' && (
            <Field label="أقصى خصم (ج.م)" hint="اختياري">
              <Input inputMode="decimal" value={c.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value.replace(/[^\d.]/g, ''))} placeholder="مفتوح" />
            </Field>
          )}
          <Field label="أقل قيمة طلب" hint="اختياري">
            <Input inputMode="decimal" value={c.minTotal} onChange={(e) => set('minTotal', e.target.value.replace(/[^\d.]/g, ''))} placeholder="أي مبلغ" />
          </Field>
          <Field label="عدد مرات الاستخدام" hint="فاضي = مفتوح">
            <Input inputMode="numeric" value={c.maxUses} onChange={(e) => set('maxUses', e.target.value.replace(/\D/g, ''))} placeholder="مفتوح" />
          </Field>
          <Field label="لكل رقم موبايل" hint="كام مرة العميل الواحد يستخدمه">
            <Input inputMode="numeric" value={c.perPhone} onChange={(e) => set('perPhone', e.target.value.replace(/\D/g, ''))} />
          </Field>
          <Field label="يبدأ من" hint="اختياري"><Input type="date" value={c.startsAt} onChange={(e) => set('startsAt', e.target.value)} /></Field>
          <Field label="ينتهي في" hint="اختياري"><Input type="date" value={c.endsAt} onChange={(e) => set('endsAt', e.target.value)} /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="صاحب الكود (إنفلونسر / حملة)">
            <Input value={c.owner} onChange={(e) => set('owner', e.target.value)} placeholder="سارة — إنستجرام" />
          </Field>
          <Field label="عمولته % من مبيعات الطلبات اللي اتسلّمت" hint="اختياري">
            <Input inputMode="decimal" value={c.commission} onChange={(e) => set('commission', e.target.value.replace(/[^\d.]/g, ''))} placeholder="0" />
          </Field>
        </div>
        <Field label="ملاحظة"><Input value={c.note} onChange={(e) => set('note', e.target.value)} /></Field>
        <Toggle checked={c.active} onChange={(v) => set('active', v)} label="الكوبون شغال" />
      </div>
    </Modal>
  );
};
