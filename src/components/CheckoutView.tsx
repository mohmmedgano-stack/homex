import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { CustomerDetails, Order } from '../types';
import { EGYPT_GOVERNORATES, isEgyptMobile, isTripleName, normalizePhone } from '../data/governorates';
import confetti from 'canvas-confetti';
import { 
  ArrowRight, 
  ShoppingBag, 
  CheckCircle2, 
  Truck, 
  CreditCard, 
  Banknote, 
  ShieldCheck, 
  Printer, 
  Share2, 
  ArrowLeft,
  Home
} from 'lucide-react';



export const CheckoutView: React.FC = () => {
  const { 
    cart, 
    cartTotal, 
    submitOrder,
    settings,
    setCurrentView, 
    showToast 
  } = useStore();

  const [form, setForm] = useState<CustomerDetails>({
    name: '',
    phone: '',
    altPhone: '',
    city: '',
    address: '',
    notes: '',
    paymentMethod: 'cod'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  const freeOver = Number(settings.free_shipping_over) || 0;
  const shippingFee = freeOver > 0 && cartTotal >= freeOver ? 0 : Number(settings.shipping_fee) || 0;
  const payOptions = [
    settings.pay_cod !== '0' && { id: 'cod' as const, title: 'الدفع عند الاستلام', sub: 'كاش للمندوب وقت ما تستلم' },
    settings.pay_vodafone && { id: 'vodafone' as const, title: 'فودافون كاش', sub: `حوّل على ${settings.pay_vodafone}` },
    settings.pay_instapay && { id: 'instapay' as const, title: 'إنستاباي', sub: `حوّل على ${settings.pay_instapay}` },
  ].filter(Boolean) as { id: 'cod' | 'vodafone' | 'instapay'; title: string; sub: string }[];
  const finalTotal = cartTotal + shippingFee;

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isTripleName(form.name)) {
      showToast('اكتب اسمك ثلاثي (الاسم واسم الأب والجد)', 'error');
      return;
    }
    if (!isEgyptMobile(form.phone)) {
      showToast('اكتب رقم موبايل مصري صحيح من 11 رقم، يبدأ بـ 010 أو 011 أو 012 أو 015', 'error');
      return;
    }
    if (form.altPhone && !isEgyptMobile(form.altPhone)) {
      showToast('رقم الموبايل الإضافي مش صحيح، صحّحه أو سيبه فاضي', 'error');
      return;
    }
    if (form.address.trim().length < 10) {
      showToast('اكتب العنوان بالتفصيل: المنطقة والشارع ورقم العمارة والدور', 'error');
      return;
    }
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim() || !form.city) {
      showToast('اكتب الاسم والموبايل والمحافظة والعنوان', 'error');
      return;
    }

    if (form.phone.trim().length < 10) {
      showToast('يرجى كتابة رقم هاتف صحيح مكوّن من 11 رقماً', 'error');
      return;
    }

    setIsSubmitting(true);

    submitOrder({ ...form, name: form.name.trim().replace(/\s+/g, ' '), phone: normalizePhone(form.phone), altPhone: form.altPhone ? normalizePhone(form.altPhone) : '' }).then((order) => {
      setCompletedOrder(order);
      setIsSubmitting(false);

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore if canvas not supported
      }

      showToast(`تم تأكيد طلبك بنجاح! رقم الطلب: ${order.id}`, 'success');
    }).catch((err) => {
      setIsSubmitting(false);
      showToast(err.message || 'الطلب متسجلش، جرّب تاني', 'error');
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = (order: Order) => {
    const text = `مرحباً، أود تأكيد طلبي من HOMEX:\nرقم الطلب: ${order.id}\nالاسم: ${order.customer.name}\nالهاتف: ${order.customer.phone}\nالعنوان: ${order.customer.city} - ${order.customer.address}\nإجمالي الطلب: ${order.total.toLocaleString()} ج.م`;
    const num = (settings.whatsapp || settings.phone || '').replace(/\D/g, '').replace(/^0/, '20');
    const url = `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // SUCCESS SCREEN
  if (completedOrder) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 text-right">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-xl space-y-6">
          
          <div className="w-18 h-18 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="text-center space-y-2">
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
              تم استلام طلبك بنجاح
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              شكراً لتسوقك معنا، {completedOrder.customer.name}!
            </h1>
            <p className="text-sm text-slate-500">
              رقم تتبع طلبك: <strong className="font-mono text-amber-600 font-bold text-base">#{completedOrder.id}</strong>
            </p>
            <p className="text-xs text-slate-600">
              سيقوم أحد مسؤولي خدمة العملاء بالتواصل معك هاتفياً على الرقم ({completedOrder.customer.phone}) لتأكيد موعد التسليم.
            </p>
          </div>

          {/* Receipt details */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 text-xs">
            <h2 className="font-bold text-sm text-slate-800 border-b border-slate-200 pb-2">
              تفاصيل الفاتورة والمنتجات المطلوبة:
            </h2>
            <div className="space-y-2">
              {completedOrder.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={item.productImage} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    <span>{item.productName} × {item.quantity}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-800">
                    {(item.price * item.quantity).toLocaleString()} ج.م
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>المجموع الفرعي:</span>
                <span className="font-mono">{completedOrder.subtotal.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>الشحن:</span>
                <span className="font-mono">{completedOrder.shippingFee === 0 ? 'مجاناً' : `${completedOrder.shippingFee} ج.م`}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                <span>المبلغ المستحق:</span>
                <span className="font-mono text-amber-600">{completedOrder.total.toLocaleString()} ج.م</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
              <strong>عنوان التوصيل:</strong> {completedOrder.customer.city}، {completedOrder.customer.address}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => handleWhatsAppShare(completedOrder)}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md"
            >
              <Share2 className="w-4 h-4" />
              <span>متابعة الطلب عبر واتساب</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-5 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الفاتورة</span>
            </button>

            <button
              onClick={() => setCurrentView('store')}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>العودة للمتجر</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // CHECKOUT FORM
  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">لا توجد منتجات في السلة لإتمام الطلب</h2>
        <p className="text-xs text-slate-500">اختر من الأجهزة المنزلية المميزة وأضفها إلى السلة أولاً</p>
        <button
          onClick={() => setCurrentView('store')}
          className="px-6 py-3 bg-amber-500 text-slate-950 font-bold rounded-xl text-sm"
        >
          تصفح الأجهزة الآن
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-10 px-4 sm:px-6 text-right">
      
      {/* Top back button */}
      <button
        onClick={() => setCurrentView('store')}
        className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-amber-600 transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        <span>الرجوع لمتابعة التسوق</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Customer Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
            <h1 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-600" />
              <span>بيانات التوصيل والتسليم</span>
            </h1>
            <p className="text-xs text-slate-500 mb-6">يرجى كتابة عنوانك بدقة ليصلك الجهاز في أسرع وقت</p>

            <form onSubmit={handleSubmitOrder} className="space-y-4">
              
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الاسم ثلاثي <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد محمد علي"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 text-sm rounded-xl px-4 py-3 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white"
                />
              </div>

              {/* Phone & Alt Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    رقم الهاتف المحمول <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    required
                    placeholder="01012345678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 text-sm rounded-xl px-4 py-3 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    رقم هاتف إضافي / واتساب (اختياري)
                  </label>
                  <input
                    type="tel"
                    placeholder="01123456789"
                    value={form.altPhone}
                    onChange={(e) => setForm({ ...form, altPhone: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 text-sm rounded-xl px-4 py-3 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              {/* Governorate / City */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  المحافظة <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 text-sm rounded-xl px-4 py-3 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white"
                >
                  <option value="" disabled>اختار المحافظة</option>
                  {EGYPT_GOVERNORATES.map(gov => (
                    <option key={gov} value={gov}>{gov}</option>
                  ))}
                </select>
              </div>

              {/* Detailed Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  العنوان بالتفصيل (اسم الشارع، رقم العقار، الدور، الشقة) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="مثال: شارع النصر، عمارة 15، الدور الثالث، شقة 6 بجوار مسجد السلام"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 text-sm rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white resize-none"
                />
              </div>

              {/* Delivery notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ملاحظات أو مواعيد مفضلة للتوصيل (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="مثال: التوصيل بعد الساعة 3 عصراً، أو الاتصال مسبقاً"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 text-sm rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white"
                />
              </div>

              {/* Payment Method Selector */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-2">طريقة الدفع:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {payOptions.map((opt) => (
                    <label
                      key={opt.id}
                      className={`p-4 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                        form.paymentMethod === opt.id ? 'border-amber-500 bg-amber-50/50 text-amber-950 font-bold' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={form.paymentMethod === opt.id}
                        onChange={() => setForm({ ...form, paymentMethod: opt.id })}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        {opt.id === 'cod' ? <Banknote className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold block">{opt.title}</span>
                        <span className="text-[10px] text-slate-500" dir="auto">{opt.sub}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 text-base mt-4 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>جاري تأكيد وتسجيل الطلب...</span>
                ) : (
                  <>
                    <span>تأكيد الطلب الآن ({finalTotal.toLocaleString()} ج.م)</span>
                    <ArrowLeft className="w-5 h-5" />
                  </>
                )}
              </button>

            </form>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>ملخص السلة</span>
              <span className="text-xs text-slate-500 font-normal">({cart.length} أجهزة)</span>
            </h2>

            {/* Cart Items list */}
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto space-y-2">
              {cart.map((item) => (
                <div key={item.product.id} className="pt-2 flex items-center gap-3 text-xs">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 line-clamp-1">{item.product.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {item.product.price.toLocaleString()} ج.م × {item.quantity}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    {(item.product.price * item.quantity).toLocaleString()} ج.م
                  </span>
                </div>
              ))}
            </div>

            {/* Calculation details */}
            <div className="pt-4 border-t border-slate-200 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span className="font-mono font-bold">{cartTotal.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between">
                <span>تكلفة الشحن والتوصيل:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {shippingFee === 0 ? 'شحن مجاني' : `${shippingFee} ج.م`}
                </span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>الإجمالي النهائي:</span>
                <span className="font-mono text-amber-600">{finalTotal.toLocaleString()} ج.م</span>
              </div>
            </div>

            {/* Trust highlights */}
            <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 text-[11px] text-slate-600 border border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>ضمان الوكيل المعتمد ساري ومرفق مع الفاتورة</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-600" />
                <span>شحن لكل محافظات مصر مع شركات شحن موثوقة</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
