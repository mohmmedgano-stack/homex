import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Spinner, Empty, Input, Select, Button, useToast } from '../ui';
import { Search, Package, ShoppingBag, FolderCog, Store, Calculator, Settings, Users, Images, FileText, LogIn } from 'lucide-react';

type Item = { id: number; admin_id: number; admin_name: string; action: string; summary: string; entity: string; entity_id: string; created_at: string };

const ICONS: Record<string, [React.FC<any>, string]> = {
  product: [Package, 'bg-gold/15 text-gold-deep'],
  order: [ShoppingBag, 'bg-save/10 text-save'],
  category: [FolderCog, 'bg-gold/15 text-gold-deep'],
  dealer: [Store, 'bg-ink/5 text-ink'],
  expense: [Calculator, 'bg-sale/10 text-sale'],
  settings: [Settings, 'bg-ink/5 text-ink'],
  user: [Users, 'bg-ink/5 text-ink'],
  banner: [Images, 'bg-gold/15 text-gold-deep'],
  page: [FileText, 'bg-ink/5 text-ink'],
  auth: [LogIn, 'bg-shelf text-steel'],
};

const ENTITY_FILTERS = [
  ['', 'كل الأنواع'], ['order', 'الطلبات'], ['product', 'المنتجات'], ['category', 'الأقسام'], ['expense', 'المصاريف'],
  ['dealer', 'التجار'], ['banner', 'البانرات'], ['page', 'الصفحات'], ['settings', 'الإعدادات'], ['user', 'المستخدمين'], ['auth', 'الدخول والخروج'],
];

const dayLabel = (d: string) => {
  const today = new Date();
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const y = new Date(today); y.setDate(today.getDate() - 1);
  if (d === iso(today)) return 'النهارده';
  if (d === iso(y)) return 'امبارح';
  return new Date(d + 'T00:00:00').toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

/** Owner-only: everything each dashboard user did, newest first. */
export const ActivityLog: React.FC<{ initialAdmin?: number | null }> = ({ initialAdmin }) => {
  const toast = useToast();
  const [admins, setAdmins] = useState<any[]>([]);
  const [who, setWho] = useState(initialAdmin ? String(initialAdmin) : '');
  const [entity, setEntity] = useState('');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Item[] | null>(null);
  const [more, setMore] = useState(false);
  const [per, setPer] = useState<Record<string, { n: number; last: string }>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('admin/admins').then(setAdmins).catch(() => {}); }, []);

  const load = async (append = false) => {
    setBusy(true);
    try {
      const before = append && items?.length ? items[items.length - 1].id : '';
      const d = await api.get('admin/activity', { admin: who, entity, q, before: String(before) });
      setItems(append ? [...(items || []), ...d.items] : d.items);
      setMore(d.more);
      setPer(Object.fromEntries(d.perAdmin.map((x: any) => [String(x.admin_id), { n: x.n, last: x.last }])));
    } catch (e: any) { toast(e.message, 'err'); }
    setBusy(false);
  };
  useEffect(() => {
    const t = setTimeout(() => load(false), q ? 350 : 0);
    return () => clearTimeout(t);
  }, [who, entity, q]);

  // group by day
  const groups: [string, Item[]][] = [];
  (items || []).forEach((it) => {
    const d = it.created_at.slice(0, 10);
    const g = groups[groups.length - 1];
    if (g && g[0] === d) g[1].push(it); else groups.push([d, [it]]);
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">سجل النشاطات</h1>
        <p className="text-sm text-steel mt-1">كل حاجة اتعملت في لوحة التحكم ومين عملها. السجل ده بيظهر للمالك بس.</p>
      </div>

      {admins.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
          <button onClick={() => setWho('')} className={`shrink-0 h-auto py-2 px-3.5 rounded-xl text-sm font-bold border text-right ${who === '' ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-line'}`}>
            كل المستخدمين
          </button>
          {admins.map((a) => {
            const st = per[String(a.id)];
            const on = who === String(a.id);
            return (
              <button key={a.id} onClick={() => setWho(String(a.id))} className={`shrink-0 py-2 px-3.5 rounded-xl text-sm border text-right ${on ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-line'}`}>
                <span className="block font-bold">{a.name}</span>
                <span className={`block text-[11px] price ${on ? 'text-white/70' : 'text-steel'}`}>
                  {st ? `${st.n} نشاط · آخر مرة ${st.last.slice(5, 16)}` : 'لسه معملش حاجة'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid sm:grid-cols-[1fr_200px] gap-2">
        <label className="relative block">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-steel" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث: اسم منتج، رقم طلب، ..." className="pr-9" />
        </label>
        <Select value={entity} onChange={(e) => setEntity(e.target.value)}>
          {ENTITY_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </div>

      <Card>
        {!items ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty title="مفيش نشاطات هنا" text="أي حاجة هتتعمل من دلوقتي (إضافة منتج، تعديل سعر، تغيير حالة طلب...) هتتسجل هنا باسم اللي عملها." />
        ) : (
          <div className="space-y-6">
            {groups.map(([day, list]) => (
              <section key={day}>
                <h2 className="text-xs font-extrabold text-steel mb-2">{dayLabel(day)}</h2>
                <ul className="space-y-1">
                  {list.map((it) => {
                    const [Icon, cls] = ICONS[it.entity] || ICONS[it.action.split('.')[0]] || [Settings, 'bg-shelf text-steel'];
                    return (
                      <li key={it.id} className="flex items-start gap-3 py-2">
                        <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cls}`}><Icon className="w-4 h-4" /></span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ink leading-relaxed">
                            <span className="font-extrabold">{it.admin_name}</span> {it.summary}
                          </p>
                          <p className="text-xs text-steel price mt-0.5">{it.created_at.slice(11, 16)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {more && (
              <Button variant="ghost" className="w-full" loading={busy} onClick={() => load(true)}>اعرض أقدم</Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
