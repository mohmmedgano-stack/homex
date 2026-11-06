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
            <WhatsAppAlerts s={s} set={set} />
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
          <MetaServerSide s={s} set={set} />
        </Card>

        <Card title="صفحات الموقع (من نحن والسياسات)">
          <p className="text-sm text-steel">الصفحات دي بقت ليها مكان لوحدها: من التاب اللي فوق «صفحات الموقع» عشان تعدّل كلامها أو تضيف صفحة جديدة أو تخفيها من الفوتر.</p>
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
        <CustomerMessages s={s} set={set} />
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

/** New-order alerts on the owner's WhatsApp through CallMeBot (free, one-time activation from the owner's phone). */
const WhatsAppAlerts: React.FC<{ s: any; set: (k: string, v: string) => void }> = ({ s, set }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  const test = async () => {
    setBusy(true);
    try {
      await api.post('admin/settings', { wa_notify_phone: s.wa_notify_phone || '', wa_notify_apikey: s.wa_notify_apikey || '' });
      await api.post('admin/wa-test', {});
      toast('اتبعتت رسالة تجربة على الواتساب، شوف موبايلك');
    } catch (e: any) { toast(e.message, 'err'); }
    setBusy(false);
  };
  return (
    <div className="sm:col-span-2 rounded-xl border border-[#25D366]/40 bg-[#25D366]/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-extrabold text-ink">إشعار الطلبات الجديدة على الواتساب</p>
          <p className="text-xs text-steel mt-0.5">كل طلب جديد بيوصلك رسالة واتساب فيها اسم العميل والموبايل والعنوان والمنتجات والإجمالي.</p>
        </div>
        <button type="button" onClick={() => setHelp(!help)} className="text-xs font-bold text-gold-deep underline shrink-0">{help ? 'إخفاء الخطوات' : 'إزاي أفعّله؟'}</button>
      </div>
      {help && (
        <ol className="text-sm text-ink bg-white rounded-lg border border-line p-3 space-y-1.5 list-decimal pr-5">
          <li>افتح صفحة الخدمة من <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noreferrer" className="text-gold-deep font-bold underline">هنا</a> وسجّل رقم CallMeBot المكتوب فيها في الأسماء على الموبايل اللي عايز الإشعارات توصله.</li>
          <li>ابعتله على الواتساب الرسالة دي بالظبط: <b dir="ltr">I allow callmebot to send me messages</b></li>
          <li>هيرد عليك في خلال دقيقتين برسالة فيها <b>APIKey</b> (رقم).</li>
          <li>اكتب رقمك والـ APIKey هنا، واضغط «ابعت رسالة تجربة»، وبعدها «حفظ الإعدادات».</li>
        </ol>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="رقم الواتساب اللي هتوصله الإشعارات">
          <Input dir="ltr" inputMode="tel" value={s.wa_notify_phone || ''} onChange={(e) => set('wa_notify_phone', e.target.value)} placeholder="01012345678" />
        </Field>
        <Field label="كود التفعيل (APIKey)">
          <Input dir="ltr" value={s.wa_notify_apikey || ''} onChange={(e) => set('wa_notify_apikey', e.target.value.trim())} placeholder="123456" autoComplete="off" />
        </Field>
      </div>
      <Button type="button" variant="ghost" loading={busy} onClick={test} disabled={!s.wa_notify_phone || !s.wa_notify_apikey}>ابعت رسالة تجربة</Button>
      <p className="text-[11px] text-steel">الخدمة دي مجانية (CallMeBot) ومناسبة لرقمك الشخصي. الرسالة ممكن تتأخر دقيقة. وكمان لوحة التحكم نفسها بتعمل صوت وإشعار أول ما الطلب يوصل وهي مفتوحة.</p>
    </div>
  );
};

/** What the customer receives right after ordering: confirmation email + WhatsApp (Business Cloud API). */
const CustomerMessages: React.FC<{ s: any; set: (k: string, v: string) => void }> = ({ s, set }) => {
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [waHelp, setWaHelp] = useState(false);
  const persist = (keys: string[]) => api.post('admin/settings', Object.fromEntries(keys.map((k) => [k, s[k] ?? ''])));

  const sendEmail = async () => {
    setBusy('email');
    try {
      await persist(['customer_email_on', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass']);
      await api.post('admin/email-test', { to: testEmail });
      toast('اتبعت إيميل تجربة، شوف صندوق الوارد (أو الـ Spam)');
    } catch (e: any) { toast(e.message, 'err'); }
    setBusy('');
  };
  const sendWa = async () => {
    setBusy('wa');
    try {
      await persist(['wa_cloud_on', 'wa_cloud_phone_id', 'wa_cloud_token', 'wa_cloud_template', 'wa_cloud_lang']);
      await api.post('admin/wa-cloud-test', { to: testPhone });
      toast('اتبعتت رسالة واتساب تجربة');
    } catch (e: any) { toast(e.message, 'err'); }
    setBusy('');
  };

  return (
    <Card title="رسائل تأكيد الطلب للعميل">
      <p className="text-sm text-steel -mt-1 mb-4">أول ما العميل يطلب، بيوصله إيميل وواتساب فيهم رقم الطلب والمنتجات والإجمالي ولينك «عرض الطلب» يتابع منه حالة طلبه.</p>

      {/* Email */}
      <div className="rounded-xl border border-line p-4 space-y-3">
        <Toggle checked={s.customer_email_on !== '0'} onChange={(v) => set('customer_email_on', v ? '1' : '0')} label="ابعت إيميل تأكيد للعميل (لو كتب إيميله)" />
        <p className="text-xs text-steel leading-relaxed">
          عشان الإيميل يوصل الـ Inbox مش الـ Spam: من Hostinger اعمل صندوق بريد زي <b dir="ltr">orders@home-x.online</b> (Emails ← Email Accounts)، واكتب بياناته هنا.
          لو سبتها فاضية بيتبعت من السيرفر مباشرة، بس ممكن يروح Spam.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="الإيميل اللي هيتبعت منه">
            <Input dir="ltr" value={s.smtp_user || ''} onChange={(e) => set('smtp_user', e.target.value.trim())} placeholder="orders@home-x.online" autoComplete="off" />
          </Field>
          <Field label="باسورد صندوق البريد">
            <Input dir="ltr" type="password" value={s.smtp_pass || ''} onChange={(e) => set('smtp_pass', e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="سيرفر البريد (SMTP)">
            <Input dir="ltr" value={s.smtp_host || ''} onChange={(e) => set('smtp_host', e.target.value.trim())} placeholder="smtp.hostinger.com" />
          </Field>
          <Field label="البورت">
            <Input dir="ltr" inputMode="numeric" value={s.smtp_port || '465'} onChange={(e) => set('smtp_port', e.target.value.replace(/\D/g, ''))} placeholder="465" />
          </Field>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input dir="ltr" type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value.trim())} placeholder="ابعت تجربة على: you@gmail.com" />
          <Button type="button" variant="ghost" className="shrink-0" loading={busy === 'email'} disabled={!testEmail} onClick={sendEmail}>ابعت إيميل تجربة</Button>
        </div>
      </div>

      {/* WhatsApp Cloud API */}
      <div className="rounded-xl border border-[#25D366]/40 bg-[#25D366]/5 p-4 space-y-3 mt-4">
        <div className="flex items-start justify-between gap-3">
          <Toggle checked={s.wa_cloud_on === '1'} onChange={(v) => set('wa_cloud_on', v ? '1' : '0')} label="ابعت رسالة واتساب تأكيد للعميل" />
          <button type="button" onClick={() => setWaHelp(!waHelp)} className="text-xs font-bold text-gold-deep underline shrink-0">{waHelp ? 'إخفاء الخطوات' : 'إزاي أجهّزه؟'}</button>
        </div>
        <p className="text-xs text-steel">بيستخدم واتساب بيزنس الرسمي من Meta (WhatsApp Cloud API) عشان يبعت لأي رقم عميل تلقائي. أول 1000 محادثة خدمة في الشهر مجانية، وبعدها Meta بتحاسب على الرسالة.</p>
        {waHelp && (
          <ol className="text-sm text-ink bg-white rounded-lg border border-line p-3 space-y-1.5 list-decimal pr-5 leading-relaxed">
            <li>من <a className="text-gold-deep font-bold underline" href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">developers.facebook.com</a> اعمل App نوعه Business وضيف له منتج WhatsApp، واربطه ببيزنس مانجر HOMEX.</li>
            <li>ضيف رقم واتساب البيزنس (رقم مش متسجل على واتساب عادي) وخد الـ <b>Phone number ID</b>.</li>
            <li>من Business Settings ← System users اعمل يوزر وطلّع له <b>Access token دائم</b> بصلاحية whatsapp_business_messaging.</li>
            <li>
              من WhatsApp Manager ← Message templates اعمل تمبلت اسمه <b dir="ltr">order_confirmation</b>، النوع Utility، اللغة Arabic، والنص:
              <span className="block bg-shelf rounded p-2 mt-1 text-[13px]">أهلاً {'{{1}}'} 👋 طلبك رقم {'{{2}}'} وصلنا بإجمالي {'{{3}}'}. هنكلمك قريب نأكد معاك ميعاد التوصيل. تقدر تتابع طلبك من هنا: {'{{4}}'}</span>
            </li>
            <li>بعد ما Meta توافق على التمبلت، اكتب البيانات هنا وابعت رسالة تجربة لرقمك.</li>
          </ol>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Phone number ID">
            <Input dir="ltr" value={s.wa_cloud_phone_id || ''} onChange={(e) => set('wa_cloud_phone_id', e.target.value.trim())} placeholder="1234567890" autoComplete="off" />
          </Field>
          <Field label="Access token">
            <Input dir="ltr" type="password" value={s.wa_cloud_token || ''} onChange={(e) => set('wa_cloud_token', e.target.value.trim())} autoComplete="new-password" />
          </Field>
          <Field label="اسم التمبلت">
            <Input dir="ltr" value={s.wa_cloud_template || ''} onChange={(e) => set('wa_cloud_template', e.target.value.trim())} placeholder="order_confirmation" />
          </Field>
          <Field label="لغة التمبلت">
            <Input dir="ltr" value={s.wa_cloud_lang || ''} onChange={(e) => set('wa_cloud_lang', e.target.value.trim())} placeholder="ar" />
          </Field>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input dir="ltr" inputMode="tel" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="ابعت تجربة على: 010xxxxxxxx" />
          <Button type="button" variant="ghost" className="shrink-0" loading={busy === 'wa'} disabled={!testPhone || !s.wa_cloud_phone_id} onClick={sendWa}>ابعت واتساب تجربة</Button>
        </div>
      </div>
    </Card>
  );
};

/** Conversions API (server-side Purchase) + catalog feed link for Meta Commerce Manager. */
const MetaServerSide: React.FC<{ s: any; set: (k: string, v: string) => void }> = ({ s, set }) => {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const feed = `${location.origin}/feeds/catalog.csv`;
  const test = async () => {
    setBusy(true);
    try {
      await api.post('admin/settings', { meta_pixel_id: s.meta_pixel_id || '', meta_capi_token: s.meta_capi_token || '' });
      await api.post('admin/capi-test', { testCode: code });
      toast('اتبعت حدث Purchase تجريبي — هتلاقيه في Events Manager ← Test events');
    } catch (e: any) { toast(e.message, 'err'); }
    setBusy(false);
  };
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-xl border border-line p-4 space-y-3">
        <p className="font-extrabold text-ink">Meta Conversions API (تتبع الشراء من السيرفر)</p>
        <p className="text-xs text-steel leading-relaxed">
          بيبعت كل طلب لفيسبوك من السيرفر مباشرة، فالشراء بيتحسب حتى لو العميل على آيفون أو عنده مانع إعلانات، وفيسبوك بيشيل المكرر لوحده.
          الـ token من: Events Manager ← البيكسل ← Settings ← Conversions API ← Generate access token.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Access token">
            <Input dir="ltr" type="password" value={s.meta_capi_token || ''} onChange={(e) => set('meta_capi_token', e.target.value.trim())} autoComplete="new-password" />
          </Field>
          <Field label="Test event code (للتجربة بس)">
            <div className="flex gap-2">
              <Input dir="ltr" value={code} onChange={(e) => setCode(e.target.value.trim())} placeholder="TEST12345" />
              <Button type="button" variant="ghost" className="shrink-0" loading={busy} disabled={!code} onClick={test}>جرّب</Button>
            </div>
          </Field>
        </div>
      </div>
      <div className="rounded-xl border border-line p-4 space-y-2">
        <p className="font-extrabold text-ink">كتالوج المنتجات (Meta Catalog / Google Merchant)</p>
        <p className="text-xs text-steel leading-relaxed">
          في Commerce Manager ← Catalog ← Data sources ← Data feed ← Scheduled feed، حط اللينك ده وخليه يتحدث كل ساعة.
          الأسعار والمخزن والصور بيتحدثوا لوحدهم، وأرقام المنتجات هي نفس اللي البيكسل بيبعتها، فإعلانات الكتالوج (Advantage+ Catalog) هتشتغل على طول.
        </p>
        <div className="flex gap-2">
          <Input dir="ltr" readOnly value={feed} className="bg-shelf text-steel" onFocus={(e) => e.currentTarget.select()} />
          <Button type="button" variant="ghost" className="shrink-0" onClick={() => navigator.clipboard?.writeText(feed).then(() => toast('اتنسخ لينك الكتالوج'))}>نسخ</Button>
        </div>
      </div>
    </div>
  );
};
