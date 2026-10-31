import React from 'react';
import { useStore } from '../../context/StoreContext';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  AlertTriangle, 
  Layers, 
  Download, 
  CheckCircle2, 
  Package, 
  Zap,
  ArrowUpRight
} from 'lucide-react';

export const AdminAnalytics: React.FC = () => {
  const { products, orders, categories, showToast } = useStore();

  const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total : 0), 0);
  const totalOrdersCount = orders.length;
  const lowStockProducts = products.filter(p => p.stock <= 5);
  const outOfStockProducts = products.filter(p => p.stock <= 0);

  const averageOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;

  // Category counts
  const categoryStats = categories.map(cat => {
    const count = products.filter(p => p.category === cat.id).length;
    return {
      ...cat,
      count
    };
  });

  const handleExportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      products,
      orders,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `homex-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('تم تصدير نسخة احتياطية من بيانات المتجر والمنتجات بنجاح!', 'success');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner with Quick Export */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            <span>لوحة الإحصائيات ونشاط المتجر</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            مؤشرات أداء المبيعات، نمو الطلبات، ومستوى المخزون
          </p>
        </div>

        <button
          onClick={handleExportData}
          className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>تصدير نسخة احتياطية (JSON)</span>
        </button>
      </div>

      {/* 4 Main Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي المبيعات</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {totalRevenue.toLocaleString()} <span className="text-sm font-bold text-slate-500">ج.م</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>مبيعات موثقة ومحققة</span>
            </p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي الطلبات</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {totalOrdersCount} <span className="text-sm font-bold text-slate-500">طلب</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              متوسط قيمة الطلب: <strong className="font-mono text-slate-700">{averageOrderValue.toLocaleString()} ج.م</strong>
            </p>
          </div>
        </div>

        {/* Active Products */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">الأجهزة المسجلة</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {products.length} <span className="text-sm font-bold text-slate-500">جهاز</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              موزعة عبر {categories.length} أقسام رئيسية
            </p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">تنبيهات المخزون</span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600 font-mono">
              {lowStockProducts.length} <span className="text-sm font-bold text-slate-500">أجهزة</span>
            </div>
            <p className="text-[11px] text-rose-600 font-semibold mt-1">
              {outOfStockProducts.length} جهاز نفد بالكامل حالياً
            </p>
          </div>
        </div>

      </div>

      {/* Grid: Category distribution & Low Stock items */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Category distribution */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-600" />
            <span>توزيع الأجهزة حسب الفئات</span>
          </h3>

          <div className="space-y-3">
            {categoryStats.map((cat) => {
              const percentage = products.length > 0 ? Math.round((cat.count / products.length) * 100) : 0;
              return (
                <div key={cat.id} className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-700 font-medium">
                    <span>{cat.name}</span>
                    <span className="font-mono font-bold text-slate-900">{cat.count} أجهزة ({percentage}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low Stock Items List */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>أجهزة أوشكت على النفاد (تحتاج تزويد مخزون)</span>
          </h3>

          {lowStockProducts.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <span>جميع الأجهزة تتوفر بكميات آمنة في المخزن</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto space-y-2">
              {lowStockProducts.map(prod => (
                <div key={prod.id} className="pt-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <img src={prod.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                    <div>
                      <p className="font-bold text-slate-900 line-clamp-1">{prod.name}</p>
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        {prod.brand}
                      </span>
                    </div>
                  </div>
                  <div className="text-left font-mono">
                    <span className="font-black text-rose-600 text-sm block">
                      {prod.stock} قطع فقط
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {prod.price.toLocaleString()} ج.م
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
