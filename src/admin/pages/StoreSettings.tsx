import React, { useEffect, useRef, useState } from 'react';
import { api, StoreSettings } from '../../lib/api';
import { Card, Spinner, Input, Field, Button, Toggle, Textarea, Select, useToast } from '../ui';
import { ImagePlus, RotateCcw } from 'lucide-react';
import type { Admin } from '../AdminApp';

export const StoreSettingsPage: React.FC<{ admin: Admin }> = ({ admin }) => {
  const toast = useToast();
  const [s, setS] = useState<(StoreSettings & Record<string, string>) | null>(null);
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const owner = admin.role === 'owner';

  useEffect(() => {
    api.get('admin/settings').then(setS).catch((e) => toast(e.message, 'err'));
  }, []);
  if (!s) return <Spinner />;

  const set = (k: string, v: string) => setS({ ...s, [k]: v });

  const save = async () => {
    setBusy(true);
    try {
      setS(await api.post('admin/settings', s));
      toast('الإعدادات اتحفظت، وظهرت على الموقع');
    } catch (e: any) {
      toast(e.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const uploadLogo = async (f?: File) => {
    if (!f) return;
    setUp(true);
    try {
      const { url } = await api.upload(f);
      set('logo', url);
      toast('اللوجو اترفع. اضغط «حفظ» عشان يظهر على الموقع');
    } catch (e: any) {
      toast(e.message, 'err');
    } finally {
      setUp(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-24">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">إعدادات المتجر</h1>
        {!owner && <p className="text-sm text-sale font-bold mt-1">تقدر تشوف الإعدادات بس، التعديل للمالك.</p>}
      </div>

      <fieldset disabled={!owner} className="space-y-4 sm:space-y-6">
        <Card title="اللوجو والهيدر">
          <div className="grid sm:grid-cols-[260px_1fr] gap-5">
            <div>
              <p className="text-sm font-bold text-ink mb-2">اللوجو</p>
              <div className="bg-ink rounded-xl h-28 flex items-center justify-center p-4">
                <img src={s.logo || '/logo.png'} alt="اللوجو" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="flex gap-2 mt-2">
                <Button variant="ghost" type="button" loading={up} onClick={() => fileRef.current?.click()} className="flex-1">
                  <ImagePlus className="w-4 h-4" /> غيّر اللوجو
                </Button>
                {s.logo && (
                  <Button variant="ghost" type="button" onClick={() => set('logo', '')} aria-label="رجّع اللوجو الأصلي" title="رجّع اللوجو الأصلي">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-steel mt-1.5">يُفضّل PNG بخلفية شفافة ولون أبيض، لأن الهيدر غامق.</p>
              <input ref={fileRef} type="file" accept="image/png,image/webp,image/jpeg" hidden onChange={(e) => uploadLogo(e.target.files?.[0])} />
            </div>
            <div className="space-y-4">
              <Field label="اسم المتجر">
                <Input value={s.store_name} onChange={(e) => set('store_name', e.target.value)} />
              </Field>
              <Field label="الشريط اللي فوق الهيدر" hint="بيظهر في أعلى كل صفحة">
                <Input value={s.top_bar_text} onChange={(e) => set('top_bar_text', e.target.value)} />
              </Field>
            </div>
          </div>
        </Card>

        <Card title="بيانات التواصل">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="رقم التليفون" hint="بيظهر في الهيدر والفوتر">
              <Input value={s.phone} onChange={(e) => set('phone', e.target.value)} dir="ltr" inputMode="tel" placeholder="01xxxxxxxxx" />
            </Field>
            <Field label="رقم الواتساب" hint="بيظهر زرار واتساب عائم في الموقع">
              <Input value={s.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} dir="ltr" inputMode="tel" placeholder="2010xxxxxxxx" />
            </Field>
            <Field label="إيميل إشعارات الطلبات" hint="كل طلب جديد بيوصلك عليه إيميل فيه كل التفاصيل. مش بيظهر للعملاء">
              <Input value={s.notify_email || ''} onChange={(e) => set('notify_email', e.target.value)} dir="ltr" type="email" placeholder="you@gmail.com" />
            </Field>
            <Field label="الإيميل">
              <Input value={s.email} onChange={(e) => set('email', e.target.value)} dir="ltr" type="email" />
            </Field>
            <Field label="العنوان">
              <Input value={s.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <Field label="لينك فيسبوك"><Input value={s.facebook} onChange={(e) => set('facebook', e.target.value)} dir="ltr" placeholder="https://facebook.com/..." /></Field>
            <Field label="لينك إنستجرام"><Input value={s.instagram} onChange={(e) => set('instagram', e.target.value)} dir="ltr" placeholder="https://instagram.com/..." /></Field>
            <Field label="لينك تيك توك"><Input value={s.tiktok} onChange={(e) => set('tiktok', e.target.value)} dir="ltr" placeholder="https://tiktok.com/@..." /></Field>
          </div>
        </Card>

        <Card title="الشحن والدفع">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="مصاريف الشحن" hint="بتتضاف على كل طلب">
              <Input type="number" min="0" inputMode="decimal" value={s.shipping_fee} onChange={(e) => set('shipping_fee', e.target.value)} />
            </Field>
            <Field label="شحن مجاني للطلبات فوق" hint="سيبها 0 لو مفيش شحن مجاني">
              <Input type="number" min="0" inputMode="decimal" value={s.free_shipping_over} onChange={(e) => set('free_shipping_over', e.target.value)} />
            </Field>
          </div>
          <div className="mt-5 space-y-4">
            <Toggle checked={s.pay_cod === '1'} onChange={(v) => set('pay_cod', v ? '1' : '0')} label="الدفع عند الاستلام" />
            <Field label="رقم فودافون كاش" hint="لو كتبته، هيظهر كطريقة دفع للعميل">
              <Input value={s.pay_vodafone} onChange={(e) => set('pay_vodafone', e.target.value)} dir="ltr" inputMode="tel" />
            </Field>
            <Field label="حساب إنستاباي" hint="اسم الحساب أو الرقم">
              <Input value={s.pay_instapay} onChange={(e) => set('pay_instapay', e.target.value)} dir="ltr" />
            </Field>
          </div>
        </Card>

        <Card title="الدفع بالفيزا">
          <p className="text-sm text-steel -mt-1 mb-4">
            اختار شركة الدفع اللي هتشتغل بيها وحط مفاتيحها. خيار «فيزا / ماستركارد» بيظهر للعميل بس لما الشركة المختارة تبقى مفاتيحها كاملة.
          </p>
          <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-end">
            <Field label="الشركة الشغالة دلوقتي">
              <Select value={s.pay_card_provider || ''} onChange={(e) => set('pay_card_provider', e.target.value)}>
                <option value="">مقفول (من غير دفع بالفيزا)</option>
                <option value="paymob">Paymob{s.paymob_ready === '1' ? ' ✓' : ''}</option>
                <option value="kashier">Kashier{s.kashier_ready === '1' ? ' ✓' : ''}</option>
                <option value="fawry">Fawry{s.fawry_ready === '1' ? ' ✓' : ''}</option>
              </Select>
            </Field>
            <div className="pb-2.5">
              <Toggle checked={s.pay_card_test === '1'} onChange={(v) => set('pay_card_test', v ? '1' : '0')} label="وضع تجريبي (Kashier وFawry)" />
            </div>
          </div>
          {s.pay_card_provider && s[`${s.pay_card_provider}_ready`] !== '1' && (
            <p className="text-sm font-bold text-sale mt-3">مفاتيح الشركة دي لسه ناقصة، فالدفع بالفيزا مش هيظهر للعميل لحد ما تكملها وتحفظ.</p>
          )}

          <div className="mt-6 space-y-4">
            <Gateway name="Paymob" ready={s.paymob_ready === '1'} active={s.pay_card_provider === 'paymob'} where="من لوحة Paymob: Settings ← Account Info للمفاتيح، و Developers ← Payment Integrations لرقم الـ Integration الخاص بالكروت." hook={s.paymob_callback_url}>
              <Field label="Public Key"><Input dir="ltr" value={s.paymob_public_key || ''} onChange={(e) => set('paymob_public_key', e.target.value)} placeholder="egy_pk_..." /></Field>
              <Field label="Secret Key"><Input dir="ltr" type="password" autoComplete="off" value={s.paymob_secret_key || ''} onChange={(e) => set('paymob_secret_key', e.target.value)} placeholder="egy_sk_..." /></Field>
              <Field label="Integration ID (Card)"><Input dir="ltr" inputMode="numeric" value={s.paymob_integration_id || ''} onChange={(e) => set('paymob_integration_id', e.target.value)} placeholder="1234567" /></Field>
              <Field label="HMAC"><Input dir="ltr" type="password" autoComplete="off" value={s.paymob_hmac || ''} onChange={(e) => set('paymob_hmac', e.target.value)} /></Field>
            </Gateway>
            <Gateway name="Kashier" ready={s.kashier_ready === '1'} active={s.pay_card_provider === 'kashier'} where="من لوحة Kashier: Integrate Now ← Payment API Keys. الـ Merchant ID بيبدأ بـ MID." hook={s.kashier_webhook_url}>
              <Field label="Merchant ID"><Input dir="ltr" value={s.kashier_mid || ''} onChange={(e) => set('kashier_mid', e.target.value)} placeholder="MID-1234-567" /></Field>
              <Field label="Payment API Key"><Input dir="ltr" type="password" autoComplete="off" value={s.kashier_api_key || ''} onChange={(e) => set('kashier_api_key', e.target.value)} /></Field>
            </Gateway>
            <Gateway name="Fawry" ready={s.fawry_ready === '1'} active={s.pay_card_provider === 'fawry'} where="Fawry بتبعتلك الـ Merchant Code والـ Secure Key بالإيميل بعد ما الحساب يتفعّل." hook={s.fawry_callback_url}>
              <Field label="Merchant Code"><Input dir="ltr" value={s.fawry_merchant_code || ''} onChange={(e) => set('fawry_merchant_code', e.target.value)} /></Field>
              <Field label="Secure Key"><Input dir="ltr" type="password" autoComplete="off" value={s.fawry_secure_key || ''} onChange={(e) => set('fawry_secure_key', e.target.value)} /></Field>
            </Gateway>
          </div>
        </Card>

        <Card title="بيكسلات الإعلانات والتتبع">
          <p className="text-sm text-steel -mt-1 mb-4">
            حط الأرقام بس، والموقع بيبعت لوحده: زيارة الصفحة، مشاهدة منتج، الإضافة للسلة، بدء الطلب، والشراء بقيمته.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Meta (Facebook) Pixel ID" hint="من Events Manager، أرقام بس">
              <Input dir="ltr" inputMode="numeric" value={s.meta_pixel_id || ''} onChange={(e) => set('meta_pixel_id', e.target.value.trim())} placeholder="123456789012345" />
            </Field>
            <Field label="TikTok Pixel ID" hint="من TikTok Ads ← Events">
              <Input dir="ltr" value={s.tiktok_pixel_id || ''} onChange={(e) => set('tiktok_pixel_id', e.target.value.trim())} placeholder="C1A2B3C4D5E6F7G8H9" />
            </Field>
            <Field label="Google Analytics 4" hint="Measurement ID">
              <Input dir="ltr" value={s.ga4_id || ''} onChange={(e) => set('ga4_id', e.target.value.trim())} placeholder="G-XXXXXXXXXX" />
            </Field>
          </div>
        </Card>

        <Card title="صفحات المتجر (من نحن والسياسات)">
          <p className="text-sm text-steel -mt-1 mb-4">
            الصفحات دي بتظهر في آخر الموقع، وشركات الدفع بتطلبها قبل ما تفعّل الحساب. الكلام اللي فيها مبدئي، راجعه مع الشركة وعدّله. سيب سطر فاضي بين كل فقرة.
          </p>
          <div className="space-y-4">
            {[
              ['page_about', 'من نحن', 'about'],
              ['page_shipping', 'سياسة الشحن والتوصيل', 'shipping'],
              ['page_returns', 'سياسة الاسترجاع والاستبدال', 'returns'],
              ['page_privacy', 'سياسة الخصوصية', 'privacy'],
              ['page_terms', 'الشروط والأحكام', 'terms'],
            ].map(([k, label, slug]) => (
              <details key={k} className="rounded-xl border border-line">
                <summary className="cursor-pointer list-none px-4 h-12 flex items-center justify-between font-bold text-ink">
                  {label}
                  <a href={`/p/${slug}`} target="_blank" rel="noreferrer" className="text-xs text-gold-deep underline" onClick={(e) => e.stopPropagation()}>فتح الصفحة</a>
                </summary>
                <div className="px-4 pb-4">
                  <Textarea rows={8} value={s[k] || ''} onChange={(e) => set(k, e.target.value)} />
                </div>
              </details>
            ))}
          </div>
        </Card>

        <Card title="كلام الصفحة الرئيسية">
          <div className="space-y-4">
            <Field label="عنوان بانر HOMEX" hint="الجملة الكبيرة في البانر الأساسي">
              <Input value={s.brand_title || ''} onChange={(e) => set('brand_title', e.target.value)} placeholder="أجهزة بيتك بضمان حقيقي، وسعر يريحك" />
            </Field>
            <Field label="الجملة الصغيرة في بانر HOMEX">
              <Input value={s.brand_subtitle || ''} onChange={(e) => set('brand_subtitle', e.target.value)} placeholder="شحن لكل محافظات مصر، وضمان ومراكز صيانة معتمدة" />
            </Field>
            <Field label="عنوان قسم الأقسام" hint="اختياري، بيظهر فوق مربعات الأقسام">
              <Input value={s.hero_title} onChange={(e) => set('hero_title', e.target.value)} placeholder="كل أساسيات بيتك عندنا أسهل" />
            </Field>
            <Field label="جملة تحت العنوان" hint="اختياري">
              <Textarea rows={2} value={s.hero_subtitle} onChange={(e) => set('hero_subtitle', e.target.value)} />
            </Field>
          </div>
        </Card>
      </fieldset>

      {owner && (
        <div className="fixed bottom-0 inset-x-0 lg:right-64 bg-white/95 backdrop-blur border-t border-line p-3 flex justify-end z-20">
          <Button onClick={save} loading={busy} className="h-12 px-8 text-base w-full sm:w-auto">حفظ الإعدادات</Button>
        </div>
      )}
    </div>
  );
};

const Gateway: React.FC<{ name: string; ready: boolean; active: boolean; where: string; hook?: string; children: React.ReactNode }> = ({ name, ready, active, where, hook, children }) => (
  <details className={`rounded-xl border ${active ? 'border-gold' : 'border-line'}`} open={active}>
    <summary className="cursor-pointer list-none px-4 h-12 flex items-center justify-between gap-3">
      <span className="font-extrabold text-ink" dir="ltr">{name}</span>
      <span className="flex items-center gap-2">
        {active && <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">الشغالة</span>}
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${ready ? 'bg-emerald-100 text-emerald-800' : 'bg-shelf text-steel'}`}>{ready ? 'مفاتيحها كاملة' : 'مفاتيح ناقصة'}</span>
      </span>
    </summary>
    <div className="px-4 pb-4 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">{children}</div>
      <p className="text-xs text-steel leading-relaxed">{where} المفاتيح السرية بتظهر مخفية بعد الحفظ، ولو سبتها زي ما هي مش هتتغير.</p>
      {hook && (
        <p className="text-xs text-steel">
          لينك الإشعارات (لو الشركة طلبته): <span dir="ltr" className="font-mono select-all text-ink">{hook}</span>
        </p>
      )}
    </div>
  </details>
);
