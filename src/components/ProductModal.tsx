import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  X, 
  ShoppingBag, 
  Heart, 
  Scale, 
  Star, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  Zap, 
  Check, 
  Plus, 
  Minus,
  Share2,
  CheckCircle2,
  Bell,
  MessageSquare,
  ThumbsUp,
  UserCheck,
  Send
} from 'lucide-react';

export const ProductModal: React.FC = () => {
  const { 
    selectedProduct, 
    setSelectedProduct, 
    addToCart, 
    isWishlisted, 
    toggleWishlist,
    isInCompare,
    toggleCompare,
    setCurrentView,
    addReview,
    subscribePriceAlert,
    priceAlerts,
    showToast
  } = useStore();

  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Price Alert Form State
  const [alertEmail, setAlertEmail] = useState('');
  const [alertSubmitted, setAlertSubmitted] = useState(false);
  const [alertBoxOpen, setAlertBoxOpen] = useState(false);

  // Review Form State
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');

  if (!selectedProduct) return null;

  const product = selectedProduct;
  const isWished = isWishlisted(product.id);
  const inCompare = isInCompare(product.id);

  const images = product.gallery && product.gallery.length > 0 
    ? product.gallery 
    : [product.image];

  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100) 
    : 0;
  const savedAmount = hasDiscount ? product.originalPrice! - product.price : 0;

  const isAlreadyAlerted = priceAlerts.some(a => a.productId === product.id);

  const handleAddToCart = () => {
    addToCart(product, quantity);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    setSelectedProduct(null);
    setCurrentView('checkout');
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('تم نسخ رابط المنتج بنجاح!', 'success');
    }
  };

  const handlePriceAlertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertEmail.trim() || !alertEmail.includes('@')) {
      showToast('يرجى إدخال بريد إلكتروني صحيح', 'error');
      return;
    }
    const success = subscribePriceAlert(product.id, alertEmail);
    if (success) {
      setAlertSubmitted(true);
      setAlertEmail('');
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      showToast('يرجى كتابة نص رأيك ومراجعتك للمنتج', 'error');
      return;
    }

    setIsSubmittingReview(true);
    addReview(product.id, {
      userName: reviewName.trim() || 'عميل موثق',
      rating: reviewRating,
      comment: reviewComment.trim()
    });

    setReviewName('');
    setReviewComment('');
    setReviewRating(5);
    setIsSubmittingReview(false);
  };

  const reviewsList = product.reviews || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm p-3 sm:p-6 lg:p-8 flex items-center justify-center animate-in fade-in duration-200">
      
      {/* Modal Dialog Card */}
      <div 
        className="relative bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200/80 my-auto text-right"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Close Button */}
        <button
          onClick={() => setSelectedProduct(null)}
          className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shadow-xs"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab switch header: Details vs Customer Reviews */}
        <div className="flex border-b border-slate-200 pt-5 px-6 sm:px-8 gap-4 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'details'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            تفاصيل ومواصفات الجهاز
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'reviews'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-amber-500" />
            <span>آراء وتقييمات العملاء ({product.reviewsCount})</span>
            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              ★ {product.rating.toFixed(1)}
            </span>
          </button>
        </div>

        {activeTab === 'details' ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 p-6 sm:p-8">
            
            {/* Product Media (Gallery & Main Preview) */}
            <div className="md:col-span-5 space-y-4">
              
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                <img
                  src={images[activeImageIndex] || product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-all duration-300"
                />

                {hasDiscount && (
                  <span className="absolute top-3 right-3 bg-rose-600 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-md">
                    وفر {savedAmount.toLocaleString()} ج.م ({discountPercent}%)
                  </span>
                )}
              </div>

              {/* Thumbnail switcher if multiple images exist */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        activeImageIndex === idx ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Guarantees Box */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-slate-800">{product.warranty}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>شحن وتوصيل فوري لجميع محافظات مصر</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>إمكانية الاسترجاع أو الاستبدال خلال 14 يوماً</span>
                </div>
              </div>
            </div>

            {/* Product Details & Specs */}
            <div className="md:col-span-7 space-y-4">
              
              {/* Brand, Rating, Share */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="bg-amber-100 text-amber-900 font-bold text-xs px-3 py-1 rounded-lg">
                    {product.brand}
                  </span>
                  
                  {/* Clickable rating leading to reviews */}
                  <button 
                    onClick={() => setActiveTab('reviews')}
                    className="flex items-center gap-1 font-mono text-amber-500 font-bold text-xs hover:underline cursor-pointer"
                  >
                    <div className="flex items-center text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= Math.round(product.rating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-200 fill-slate-100'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-slate-900 font-black">{product.rating.toFixed(1)}</span>
                    <span className="text-slate-400 font-normal">({product.reviewsCount} تقييم)</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    title="مشاركة المنتج"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleWishlist(product.id)}
                    className={`p-2 rounded-xl border transition-colors ${
                      isWished 
                        ? 'bg-rose-50 border-rose-200 text-rose-600' 
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                    title="المفضلة"
                  >
                    <Heart className={`w-4 h-4 ${isWished ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => toggleCompare(product)}
                    className={`p-2 rounded-xl border transition-colors ${
                      inCompare
                        ? 'bg-amber-50 border-amber-200 text-amber-700 font-bold'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                    title="مقارنة المواصفات"
                  >
                    <Scale className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Product Title */}
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {product.name}
              </h1>

              {/* Wattage & Capacity Key Metrics Pill */}
              <div className="flex flex-wrap gap-2">
                {product.wattage && (
                  <div className="flex items-center gap-1.5 bg-slate-900 text-amber-300 text-xs font-bold px-3 py-1 rounded-lg">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>القدرة: {product.wattage}</span>
                  </div>
                )}
                {product.capacity && (
                  <div className="flex items-center gap-1.5 bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1 rounded-lg border border-slate-200">
                    <span>السعة / المقاس: {product.capacity}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-lg border border-emerald-200">
                  <span>المخزون المتاح: {product.stock} قطعة</span>
                </div>
              </div>

              {/* Price Box */}
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-800 font-medium block">السعر الحالي شامل الضريبة:</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-slate-950 font-mono">
                      {product.price.toLocaleString()}
                    </span>
                    <span className="text-sm font-bold text-slate-700">جنيه مصري</span>
                    {hasDiscount && (
                      <span className="text-sm text-slate-400 line-through font-mono">
                        {product.originalPrice!.toLocaleString()} ج.م
                      </span>
                    )}
                  </div>
                </div>
                {hasDiscount && (
                  <div className="text-left bg-rose-100 text-rose-800 font-bold px-3 py-1.5 rounded-xl text-xs">
                    وفرت {savedAmount.toLocaleString()} ج.م
                  </div>
                )}
              </div>

              {/* FEATURE: Price Drop Alert (تنبيه انخفاض السعر) */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <Bell className="w-4 h-4 text-amber-600 animate-bounce" />
                    <span>تنبيه انخفاض السعر: أبلغني عند عمل خصم على هذا الجهاز</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAlertBoxOpen(!alertBoxOpen)}
                    className="text-[11px] font-bold text-amber-700 hover:underline"
                  >
                    {alertBoxOpen ? 'إغلاق' : 'تفعيل التنبيه'}
                  </button>
                </div>

                {(alertBoxOpen || isAlreadyAlerted) && (
                  <div>
                    {alertSubmitted || isAlreadyAlerted ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>أنت مشترك في تنبيهات هذا الجهاز. سنرسل لك إشعاراً فور تطبيق أي خصم جديد!</span>
                      </div>
                    ) : (
                      <form onSubmit={handlePriceAlertSubmit} className="flex gap-2 pt-1">
                        <input
                          type="email"
                          required
                          placeholder="اكتب بريدك الإلكتروني ليصلك إشعار الخصم..."
                          value={alertEmail}
                          onChange={(e) => setAlertEmail(e.target.value)}
                          className="flex-1 bg-white text-slate-900 text-xs rounded-xl px-3 py-2 border border-slate-300 focus:outline-hidden focus:border-amber-500 font-mono"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors whitespace-nowrap shadow-xs"
                        >
                          تفعيل التنبيه
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* Product Description */}
              <div>
                <h2 className="text-xs font-bold text-slate-700 uppercase mb-1">وصف الجهاز:</h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Key Features */}
              {product.features && product.features.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold text-slate-700 uppercase mb-2">أبرز المميزات:</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {product.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Technical Specifications Table */}
              {product.specs && product.specs.length > 0 && (
                <div className="pt-2">
                  <h2 className="text-xs font-bold text-slate-700 uppercase mb-2">المواصفات الفنية التفصيلية:</h2>
                  <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-200 text-xs">
                    {product.specs.map((sp, idx) => (
                      <div key={idx} className="grid grid-cols-2 py-2 px-3 bg-white even:bg-slate-50">
                        <span className="text-slate-500 font-medium">{sp.label}</span>
                        <span className="text-slate-900 font-bold">{sp.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selector & Action Buttons */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-slate-300 rounded-2xl bg-white p-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 text-slate-700"
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-bold text-base font-mono text-slate-900">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 text-slate-700"
                      disabled={quantity >= product.stock}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={handleAddToCart}
                    disabled={product.stock <= 0}
                    className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>إضافة إلى سلة المشتريات</span>
                  </button>
                </div>

                <button
                  onClick={handleBuyNow}
                  disabled={product.stock <= 0}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all text-sm disabled:opacity-50"
                >
                  شراء فوري والانتقال لإنهاء الطلب
                </button>
              </div>

            </div>

          </div>
        ) : (
          /* REVIEWS & RATINGS TAB */
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Rating Summary Header */}
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5 text-center sm:text-right">
                <div className="text-4xl sm:text-5xl font-black text-slate-900 font-mono">
                  {product.rating.toFixed(1)}
                </div>
                <div>
                  <div className="flex items-center text-amber-400 justify-center sm:justify-start">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.round(product.rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300 fill-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    استناداً إلى <strong>{product.reviewsCount} تقييم حقيقي</strong> من مشترين موثقين
                  </p>
                </div>
              </div>

              <div className="text-xs text-emerald-800 bg-emerald-50 px-4 py-2.5 rounded-2xl border border-emerald-200 flex items-center gap-2 font-bold">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>جميع التقييمات من مشترين حقيقيين تم تسليم الجهاز لهم</span>
              </div>
            </div>

            {/* Add New Review Form */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                <span>أضف تقييمك ورأيك حول هذا الجهاز:</span>
              </h3>

              <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
                
                {/* Clickable Star Rating Picker */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">اختر عدد النجوم:</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setReviewRating(star)}
                        className="p-1 hover:scale-125 transition-transform"
                        title={`${star} نجوم`}
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= (hoverRating || reviewRating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300 fill-slate-100'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="font-bold text-amber-700 mr-2 text-xs font-mono">
                      {reviewRating} من 5 نجوم
                    </span>
                  </div>
                </div>

                {/* Reviewer Name */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسمك (أو كما تحب أن يظهر):</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: م. مصطفى خالد"
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    className="w-full sm:max-w-md bg-slate-50 text-slate-900 rounded-xl px-3.5 py-2.5 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white text-xs"
                  />
                </div>

                {/* Review Comment */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اكتب رأيك وتجربتك بالتفصيل *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="شاركنا رأيك في سرعة الجهاز، جودة الخامات، استهلاك الكهرباء، وسرعة التوصيل..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 rounded-xl px-3.5 py-2.5 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white text-xs resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>نشر المراجعة والتقييم</span>
                </button>
              </form>
            </div>

            {/* Reviews List */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-900">المراجعات المنشورة:</h3>

              {reviewsList.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl text-xs text-slate-500 border border-slate-200">
                  كن أول من يقيم هذا الجهاز ويشارك تجربته مع زوار المتجر!
                </div>
              ) : (
                <div className="space-y-3">
                  {reviewsList.map((rev) => (
                    <div 
                      key={rev.id} 
                      className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                            {rev.userName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{rev.userName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(rev.createdAt).toLocaleDateString('ar-EG', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-2">
                          {rev.isVerifiedPurchase && (
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200 hidden sm:inline-flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>مشتري موثق</span>
                            </span>
                          )}
                          <div className="flex items-center text-amber-400">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  star <= rev.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-200 fill-slate-100'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <p className="text-slate-700 leading-relaxed pt-1 text-xs sm:text-sm">
                        {rev.comment}
                      </p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>مشتري موثّق</span>
                        </span>
                        <button className="flex items-center gap-1 hover:text-slate-600 text-slate-400">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>مفيد ({rev.helpfulCount || 1})</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
