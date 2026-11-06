import React, { useEffect, useState } from 'react';
import { api, thumb } from '../../lib/api';
import { Card, Spinner, Empty, Button, Toggle, useToast } from '../ui';
import { Star, Check, EyeOff, Trash2, RotateCcw } from 'lucide-react';

type Review = { id: number; productId: number; product: string; image: string; orderCode: string; name: string; city: string; rating: number; comment: string; status: string; createdAt: string };
const TABS: [string, string][] = [['pending', 'محتاجة مراجعة'], ['approved', 'منشورة'], ['hidden', 'مخفية']];

/** Approve buyers' reviews before they show on the product page. */
export const Reviews: React.FC<{ isOwner: boolean }> = ({ isOwner }) => {
  const toast = useToast();
  const [tab, setTab] = useState('pending');
  const [d, setD] = useState<{ reviews: Review[]; counts: Record<string, number>; avg: number; auto: boolean } | null>(null);
  useEffect(() => { setD(null); api.get('admin/reviews', { status: tab }).then(setD).catch((e) => toast(e.message, 'err')); }, [tab]);

  const act = async (r: Review, status: string) => {
    if (status === 'delete' && !confirm('تمسح التقييم ده نهائياً؟')) return;
    try { setD(await api.post('admin/review', { id: r.id, status, view: tab })); toast(status === 'approved' ? 'التقييم اتنشر على صفحة المنتج' : status === 'hidden' ? 'التقييم اتخفى' : 'تم'); } catch (e: any) { toast(e.message, 'err'); }
  };
  const setAuto = async (v: boolean) => {
    try { await api.post('admin/settings', { reviews_auto: v ? '1' : '0' }); setD((x) => (x ? { ...x, auto: v } : x)); toast(v ? 'تقييمات 4 و5 نجوم هتتنشر لوحدها' : 'كل التقييمات هتستنى مراجعتك'); } catch (e: any) { toast(e.message, 'err'); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">تقييمات العملاء</h1>
        <p className="text-sm text-steel mt-1">بعد ما الطلب يتسلّم، ابعت للعميل لينك التقييم من صفحة الطلب (زرار واتساب). التقييم بيظهر على صفحة المنتج بعلامة «اشترى المنتج فعلاً».</p>
      </div>
      {d && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-steel">متوسط التقييم المنشور: <b className="text-ink price">{d.avg || '—'}</b> ★ · {d.counts.approved || 0} تقييم</p>
            {isOwner && <Toggle checked={d.auto} onChange={setAuto} label="انشر تقييمات 4 و5 نجوم لوحدها" />}
          </div>
        </Card>
      )}
      <div className="flex gap-2">
        {TABS.map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id}
            className={`h-9 px-3.5 rounded-lg text-sm font-bold border ${tab === id ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-line'}`}>
            {l} {d?.counts[id] ? <span className="opacity-60 price">({d.counts[id]})</span> : null}
          </button>
        ))}
      </div>
      {!d ? <Spinner /> : d.reviews.length === 0 ? <Card><Empty title="مفيش تقييمات هنا" /></Card> : (
        <div className="grid lg:grid-cols-2 gap-3">
          {d.reviews.map((r) => (
            <Card key={r.id}>
              <div className="flex items-center gap-3">
                {r.image ? <img src={thumb(r.image)} alt="" className="w-12 h-12 rounded-lg object-cover bg-shelf shrink-0" /> : <span className="w-12 h-12 rounded-lg bg-shelf shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink line-clamp-1">{r.product}</p>
                  <p className="text-xs text-steel">{r.name}{r.city ? ` · ${r.city}` : ''} · <span dir="ltr" className="price">{r.orderCode}</span></p>
                </div>
                <span className="flex shrink-0" dir="ltr">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`w-4 h-4 ${i <= r.rating ? 'fill-gold text-gold' : 'text-line'}`} />)}</span>
              </div>
              {r.comment ? <p className="text-sm text-ink mt-3 leading-relaxed">{r.comment}</p> : <p className="text-xs text-steel mt-3">من غير تعليق</p>}
              <div className="flex flex-wrap gap-2 mt-3">
                {r.status !== 'approved' && <Button className="h-9" onClick={() => act(r, 'approved')}><Check className="w-4 h-4" /> انشره</Button>}
                {r.status !== 'hidden' && <Button variant="ghost" className="h-9" onClick={() => act(r, 'hidden')}><EyeOff className="w-4 h-4" /> اخفيه</Button>}
                {r.status === 'hidden' && <Button variant="ghost" className="h-9" onClick={() => act(r, 'pending')}><RotateCcw className="w-4 h-4" /> رجّعه للمراجعة</Button>}
                {isOwner && <button onClick={() => act(r, 'delete')} className="p-2 text-steel hover:text-sale" aria-label="مسح"><Trash2 className="w-4 h-4" /></button>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
