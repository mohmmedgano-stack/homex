import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { AdminProducts } from './AdminProducts';
import { AdminUsers } from './AdminUsers';
import { AdminOrders } from './AdminOrders';
import { AdminAnalytics } from './AdminAnalytics';
import { 
  Package, 
  Users, 
  ShoppingBag, 
  BarChart3, 
  ArrowLeft, 
  ShieldCheck, 
  ChevronDown,
  Sparkles,
  Store,
  Layers,
  LogOut,
  Bell,
  Mail,
  Clock
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    currentAdmin, 
    adminUsers, 
    setCurrentAdmin, 
    showToast,
    orders,
    logoutAdmin,
    priceAlerts 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'products' | 'users' | 'orders' | 'analytics' | 'alerts'>('products');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-16">
      
      {/* Top Admin Topbar */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18">
            
            {/* Title & Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight font-['Cairo']">
                    لوحة تحكم إدارة المتجر
                  </h1>
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/30">
                    منطقة المشرفين
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  HOMEX — home-x.online
                </p>
              </div>
            </div>

            {/* Right side: User Switcher Dropdown, View Store, and Logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* User Switcher Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition-colors"
                >
                  <img
                    src={currentAdmin?.avatar}
                    alt={currentAdmin?.name}
                    className="w-8 h-8 rounded-lg object-cover border border-amber-500/50"
                  />
                  <div className="text-right hidden sm:block leading-tight">
                    <span className="text-xs font-bold block text-white">{currentAdmin?.name}</span>
                    <span className="text-[10px] text-amber-400 block font-semibold">
                      {currentAdmin?.role === 'super_admin' ? 'مدير عام' : currentAdmin?.role === 'product_manager' ? 'مدير منتجات' : 'مسؤول طلبات'}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-64 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">التبديل بين مستخدمي الأدمن:</p>
                    </div>

                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {adminUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            setCurrentAdmin(u);
                            setUserDropdownOpen(false);
                            showToast(`تم التبديل إلى حساب: ${u.name}`, 'success');
                          }}
                          className={`w-full text-right px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                            currentAdmin?.id === u.id ? 'bg-amber-50/70' : ''
                          }`}
                        >
                          <img src={u.avatar} alt="" className="w-8 h-8 rounded-lg object-cover" />
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-900">{u.name}</p>
                            <p className="text-[10px] text-slate-500">{u.email}</p>
                          </div>
                          {currentAdmin?.id === u.id && (
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="p-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setActiveTab('users');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-center py-1.5 text-xs text-amber-700 font-bold hover:bg-amber-50 rounded-lg"
                      >
                        + إضافة مستخدم جديد
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* View Store Button */}
              <button
                onClick={() => setCurrentView('store')}
                className="px-3 sm:px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all border border-slate-700"
                title="معاينة المتجر كعميل"
              >
                <Store className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">واجهة المتجر</span>
              </button>

              {/* Safe Log Out Button */}
              <button
                onClick={logoutAdmin}
                className="px-3 sm:px-3.5 py-2 bg-rose-600/90 hover:bg-rose-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs"
                title="تسجيل الخروج وإغلاق لوحة الأدمن"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">تسجيل خروج</span>
              </button>

            </div>

          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="bg-slate-950/60 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center overflow-x-auto no-scrollbar gap-2 py-2">
            
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'products'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>إدارة الأجهزة والمنتجات</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'users'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>مستخدمو الأدمن ({adminUsers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`relative px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'orders'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>طلبات العملاء ({orders.length})</span>
              {pendingOrdersCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {pendingOrdersCount} جديد
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('alerts')}
              className={`relative px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'alerts'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>تنبيهات الأسعار ({priceAlerts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>الإحصائيات والتقارير</span>
            </button>

          </div>
        </div>
      </header>

      {/* Main Admin Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {activeTab === 'products' && <AdminProducts />}
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'orders' && <AdminOrders />}
        {activeTab === 'analytics' && <AdminAnalytics />}
        {activeTab === 'alerts' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-['Cairo'] flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-600" />
                  <span>اشتراكات العملاء في تنبيهات انخفاض الأسعار</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  قائمة العملاء الذين ينتظرون خصومات وعروض على أجهزة معينة لإرسال إشعارات لهم
                </p>
              </div>
              <span className="bg-amber-100 text-amber-800 font-bold text-xs px-3 py-1 rounded-xl">
                {priceAlerts.length} مشترك
              </span>
            </div>

            {priceAlerts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                <Bell className="w-8 h-8 mx-auto text-slate-300" />
                <p>لا توجد اشتراكات في تنبيهات انخفاض الأسعار حالياً</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">اسم الجهاز</th>
                      <th className="p-3">البريد الإلكتروني للعميل</th>
                      <th className="p-3">السعر الحالي</th>
                      <th className="p-3">تاريخ الاشتراك</th>
                      <th className="p-3 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {priceAlerts.map((alert) => (
                      <tr key={alert.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{alert.productName}</td>
                        <td className="p-3 font-mono text-slate-700">{alert.email}</td>
                        <td className="p-3 font-mono font-bold text-amber-700">{alert.currentPrice.toLocaleString()} ج.م</td>
                        <td className="p-3 text-slate-400 font-mono">
                          {new Date(alert.createdAt).toLocaleDateString('ar-EG', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-3 text-center">
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-lg text-[10px]">
                            بانتظار الخصم ✓
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

    </div>
  );
};
