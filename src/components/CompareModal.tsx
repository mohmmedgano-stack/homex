import React from 'react';
import { useStore } from '../context/StoreContext';
import { X, Scale, Trash2, ShoppingBag, Star, Zap, ShieldCheck } from 'lucide-react';

export const CompareModal: React.FC = () => {
  const { 
    compareOpen, 
    setCompareOpen, 
    compareList, 
    toggleCompare, 
    clearCompare, 
    addToCart,
    setSelectedProduct 
  } = useStore();

  if (!compareOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center">
      <div 
        className="relative bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 text-right p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-['Cairo']">
                مقارنة مواصفات الأجهزة المنزلية ({compareList.length}/4)
              </h2>
              <p className="text-xs text-slate-500">قارن بين الأسعار، القوة الكهربائية، السعة، والضمان جنباً إلى جنب</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {compareList.length > 0 && (
              <button
                onClick={clearCompare}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1 rounded-lg hover:bg-rose-50"
              >
                تفريغ المقارنة
              </button>
            )}
            <button
              onClick={() => setCompareOpen(false)}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {compareList.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Scale className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">لم تختر أي منتجات للمقارنة بعد</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              اضغط على أيقونة الميزان في بطاقة أي منتج لإضافته إلى جدول المقارنة الفنية.
            </p>
            <button
              onClick={() => setCompareOpen(false)}
              className="mt-2 px-5 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs"
            >
              العودة للمتجر
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr>
                  <th className="p-3 bg-slate-50 border border-slate-200 text-slate-600 font-bold w-40">
                    المواصفة
                  </th>
                  {compareList.map((prod) => (
                    <th key={prod.id} className="p-3 bg-slate-50 border border-slate-200 min-w-[200px] text-right align-top">
                      <div className="relative group">
                        <button
                          onClick={() => toggleCompare(prod)}
                          className="absolute top-0 left-0 text-slate-400 hover:text-rose-500 p-1"
                          title="إزالة من المقارنة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <img
                          src={prod.image}
                          alt={prod.name}
                          onClick={() => {
                            setSelectedProduct(prod);
                            setCompareOpen(false);
                          }}
                          className="w-24 h-24 object-cover rounded-xl mx-auto mb-2 bg-white border border-slate-200 cursor-pointer hover:scale-105 transition-transform"
                        />
                        <h4 
                          onClick={() => {
                            setSelectedProduct(prod);
                            setCompareOpen(false);
                          }}
                          className="font-bold text-slate-900 text-xs line-clamp-2 cursor-pointer hover:text-amber-600"
                        >
                          {prod.name}
                        </h4>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* Price */}
                <tr>
                  <td className="p-3 font-bold bg-slate-50 border border-slate-200 text-slate-700">السعر</td>
                  {compareList.map(p => (
                    <td key={p.id} className="p-3 border border-slate-200 font-mono text-sm font-black text-amber-700">
                      {p.price.toLocaleString()} ج.م
                    </td>
                  ))}
                </tr>

                {/* Brand */}
                <tr>
                  <td className="p-3 font-bold bg-slate-50 border border-slate-200 text-slate-700">الماركة</td>
                  {compareList.map(p => (
                    <td key={p.id} className="p-3 border border-slate-200 font-semibold text-slate-800">
                      {p.brand}
                    </td>
                  ))}
                </tr>

                {/* Wattage */}
                <tr>
                  <td className="p-3 font-bold bg-slate-50 border border-slate-200 text-slate-700">القدرة الكهربائية</td>
                  {compareList.map(p => (
                    <td key={p.id} className="p-3 border border-slate-200">
                      {p.wattage ? (
                        <span className="font-bold text-slate-900 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          {p.wattage}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Capacity */}
                <tr>
                  <td className="p-3 font-bold bg-slate-50 border border-slate-200 text-slate-700">السعة / المقاس</td>
                  {compareList.map(p => (
                    <td key={p.id} className="p-3 border border-slate-200 font-medium text-slate-800">
                      {p.capacity || '-'}
                    </td>
                  ))}
                </tr>

                {/* Warranty */}
                <tr>
                  <td className="p-3 font-bold bg-slate-50 border border-slate-200 text-slate-700">الضمان المعتمد</td>
                  {compareList.map(p => (
                    <td key={p.id} className="p-3 border border-slate-200">
                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {p.warranty}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Rating */}
                <tr>
                  <td className="p-3 font-bold bg-slate-50 border border-slate-200 text-slate-700">تقييم العملاء</td>
                  {compareList.map(p => (
                    <td key={p.id} className="p-3 border border-slate-200">
                      <div className="flex items-center gap-1 font-mono font-bold text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{p.rating.toFixed(1)}</span>
                        <span className="text-slate-400 text-[10px]">({p.reviewsCount})</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Actions */}
                <tr>
                  <td className="p-3 font-bold bg-slate-50 border border-slate-200 text-slate-700">طلب المنتج</td>
                  {compareList.map(p => (
                    <td key={p.id} className="p-3 border border-slate-200">
                      <button
                        onClick={() => {
                          addToCart(p, 1);
                          setCompareOpen(false);
                        }}
                        disabled={p.stock <= 0}
                        className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>إضافة للسلة</span>
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
