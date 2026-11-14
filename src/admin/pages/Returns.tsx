import React, { useEffect, useState } from 'react';
import { api, thumb } from '../../lib/api';
import { Card, Spinner, Empty, Button, Textarea, useToast } from '../ui';
import { Check, X, RotateCcw, Repeat, MessageCircle, CheckCheck, Undo2 } from 'lucide-react';

type Item = { name: string; qty: number; image: string };
type Req = {
  id: number; ref: string; orderCode: string; name: string; phone: string; type: 'return' | 'exchange';
  items: Item[]; reason: string; note: string; images: string[]; status: string; adminNote: string;
  createdAt: string; updatedAt: string; decidedBy: string;
};
const TABS: [string, string][] = [['pending', 'جديدة'], ['approved', 'موافق عليها'], ['rejected', 'مرفوضة'], ['done', 'اتقفلت']];

const waLink = (phone: string, text: string) => {
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('0')) d = '2' + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
};

/** Return / exchange requests customers send from the returns policy page. */
export const Returns: React.FC = () => {
  const toast = useToast();
  const [tab, setTab] = useState('pending');
  const [d, setD] = useState<{ requests: Req[]; counts: Record<string, number> } | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [zoom, setZoom] = useState('');
  useEffect(() => { setD(null); api.get('admin/returns', { status: tab }).then(setD).catch((e) => toast(e.message, 'err')); }, [tab]);

  const act = async (r: Req, status: string) => {
    const note = (notes[r.id] ?? r.adminNote ?? '').trim();
    if (status === 'rejected' && !note && !confirm('ترفض الطلب من غير ما تكتب السبب للعميل؟')) return;
    try {
      setD(await api.post('admin/return', { id: r.id, status, note, view: tab }));
      toast(status === 'approved' ? 'اتوافق على الطلب — كلّم العميل واتساب يعرف الخطوة الجاية' : status === 'rejected' ? 'الطلب اترفض' : status === 'done' ? 'الطلب اتقفل' : 'رجع للطلبات الجديدة');
    } catch (e: any) { toast(e.message, 'err'); }
  };

  const message = (r: Req) => {
    const what = r.type === 'exchange' ? 'الاستبدال' : 'الاسترجاع';
    const note = (notes[r.id] ?? r.adminNote ?? '').trim();
    const head = `أهلاً ${r.name}، بخصوص طلب ${what} رقم ${r.ref} على الأوردر ${r.orderCode} من HOMEX:`;
    const body = r.status === 'approved' ? `تمت الموافقة على طلبك ✅` : r.status === 'rejected' ? `للأسف مقدرناش نوافق على الطلب.` : r.status === 'done' ? `طلبك اتقفل، شكراً لتعاملك معانا.` : `استلمنا طلبك وبنراجعه.`;
    return `${head}\n${body}${note ? `\n${note}` : ''}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">الاسترجاع والاستبدال</h1>
        <p className="text-sm text-steel mt-1">الطلبات اللي العملاء بيقدموها من صفحة «سياسة الاسترجاع والاستبدال». وافق أو ارفض واكتب ملاحظة، وبعدين ابعتلهم الرد على الواتساب. لما ترجع المنتج فعلاً للمخزن، غيّر حالة الأوردر لـ «مرتجع» من صفحة الطلبات.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {TABS.map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id}
            className={`h-10 px-4 rounded-lg text-sm font-bold border ${tab === id ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-line'}`}>
            {l} {d?.counts[id] ? <span className="opacity-60 price">({d.counts[id]})</span> : null}
          </button>
        ))}
      </div>
      {!d ? <Spinner /> : d.requests.length === 0 ? <Card><Empty title={tab === 'pending' ? 'مفيش طلبات جديدة' : 'مفيش طلبات هنا'} /></Card> : (
        <div className="grid xl:grid-cols-2 gap-3">
          {d.requests.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-sm font-extrabold ${r.type === 'exchange' ? 'bg-ink/5 text-ink' : 'bg-gold/15 text-gold-deep'}`}>
                  {r.type === 'exchange' ? <Repeat className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />} {r.type === 'exchange' ? 'استبدال' : 'استرجاع'}
                </span>
                <span dir="ltr" className="price text-sm font-bold text-ink">{r.ref}</span>
                <span className="text-xs text-steel mr-auto">{r.createdAt}</span>
              </div>
              <p className="text-sm text-ink mt-3"><b>{r.name}</b> · <span dir="ltr" className="price">{r.phone}</span> · أوردر <span dir="ltr" className="price font-bold">{r.orderCode}</span></p>
              <div className="mt-3 space-y-2">
                {r.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {it.image ? <img src={thumb(it.image)} alt="" className="w-11 h-11 rounded-lg object-cover bg-shelf shrink-0" /> : <span className="w-11 h-11 rounded-lg bg-shelf shrink-0" />}
                    <span className="text-sm font-bold text-ink">{it.name}{it.qty > 1 ? ` × ${it.qty}` : ''}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-xl bg-shelf p-3 text-sm">
                <p><span className="text-steel">السبب:</span> <b className="text-ink">{r.reason}</b></p>
                <p className="text-ink mt-1 whitespace-pre-line leading-relaxed">{r.note}</p>
              </div>
              {r.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {r.images.map((u, i) => (
                    <button key={u} type="button" onClick={() => setZoom(u)} className="w-20 h-20 rounded-xl overflow-hidden border border-line" aria-label={`صورة ${i + 1}`}>
                      <img src={thumb(u)} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3">
                <Textarea rows={2} value={notes[r.id] ?? r.adminNote} onChange={(e) => setNotes((x) => ({ ...x, [r.id]: e.target.value }))}
                  placeholder="ملاحظة للعميل (بتظهرله لما يفتح طلبه، وبتتبعت في رسالة الواتساب)" />
              </div>
              {r.decidedBy && r.status !== 'pending' && <p className="text-xs text-steel mt-2">آخر تعديل: {r.decidedBy} · {r.updatedAt}</p>}
              <div className="flex flex-wrap gap-2 mt-3">
                {r.status === 'pending' && <Button className="h-10" onClick={() => act(r, 'approved')}><Check className="w-4 h-4" /> موافقة</Button>}
                {r.status === 'pending' && <Button variant="ghost" className="h-10 text-sale" onClick={() => act(r, 'rejected')}><X className="w-4 h-4" /> رفض</Button>}
                {r.status === 'approved' && <Button className="h-10" onClick={() => act(r, 'done')}><CheckCheck className="w-4 h-4" /> اتنفّذ — اقفل الطلب</Button>}
                {r.status !== 'pending' && <Button variant="ghost" className="h-10" onClick={() => act(r, 'pending')}><Undo2 className="w-4 h-4" /> رجّعه جديد</Button>}
                {r.status !== 'pending' && (notes[r.id] ?? r.adminNote) !== r.adminNote && <Button variant="ghost" className="h-10" onClick={() => act(r, r.status)}>احفظ الملاحظة</Button>}
                <a href={waLink(r.phone, message(r))} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#25D366] text-white text-sm font-bold">
                  <MessageCircle className="w-4 h-4" /> رد على الواتساب
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
      {zoom && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setZoom('')} role="dialog" aria-label="الصورة">
          <img src={zoom} alt="" className="max-w-full max-h-full rounded-xl" />
          <button className="absolute top-4 left-4 w-11 h-11 rounded-full bg-white/90 flex items-center justify-center" aria-label="إغلاق"><X className="w-5 h-5" /></button>
        </div>
      )}
    </div>
  );
};
