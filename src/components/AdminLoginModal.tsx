import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  X, 
  LogIn, 
  Key, 
  Users,
  CheckCircle2
} from 'lucide-react';

export const AdminLoginModal: React.FC = () => {
  const { 
    adminLoginModalOpen, 
    setAdminLoginModalOpen, 
    loginAdmin, 
    adminUsers 
  } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!adminLoginModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginAdmin(email, password);
  };

  const handleQuickLogin = (adminEmail: string) => {
    loginAdmin(adminEmail, 'admin');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center animate-in fade-in duration-200">
      <div 
        className="relative bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 text-right p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={() => setAdminLoginModalOpen(false)}
          className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900 font-['Cairo']">
            بوابة دخول المشرفين والإدارة
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            منطقة محمية خاصة بمسؤولي المتجر لإدارة الأجهزة والمخزون ومتابعة الطلبات
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني للأدمن</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="admin@albayt.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 text-slate-900 rounded-xl pr-10 pl-3 py-2.5 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white text-xs font-mono"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">كلمة المرور</label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 text-slate-900 rounded-xl pr-10 pl-3 py-2.5 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white text-xs font-mono"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-bold rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 text-xs"
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول إلى لوحة التحكم</span>
          </button>
        </form>

        {/* Quick test accounts for demo convenience */}
        <div className="mt-6 pt-5 border-t border-slate-100 space-y-2">
          <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-600" />
            <span>تسجيل دخول سريع بحسابات الأدمن التجريبية:</span>
          </p>

          <div className="space-y-1.5">
            {adminUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleQuickLogin(u.email)}
                className="w-full p-2 rounded-xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-300 transition-colors flex items-center justify-between text-right text-xs group"
              >
                <div className="flex items-center gap-2">
                  <img src={u.avatar} alt="" className="w-6 h-6 rounded-md object-cover" />
                  <span className="font-bold text-slate-800 group-hover:text-amber-900">{u.name}</span>
                  <span className="text-[10px] text-slate-400">
                    ({u.role === 'super_admin' ? 'مدير عام' : u.role === 'product_manager' ? 'مدير منتجات' : 'مبيعات'})
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded">
                  دخول فوري
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
