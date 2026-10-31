import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { AdminUser, AdminRole } from '../../types';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Key, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  LogIn, 
  Mail, 
  Phone,
  Sparkles,
  Lock
} from 'lucide-react';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=300&q=80',
];

export const AdminUsers: React.FC = () => {
  const { 
    adminUsers, 
    currentAdmin, 
    setCurrentAdmin, 
    addAdminUser, 
    updateAdminUser, 
    deleteAdminUser,
    showToast 
  } = useStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Form
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'product_manager' as AdminRole,
    phone: '',
    password: '',
    avatar: AVATAR_PRESETS[0],
    active: true,
  });

  const openAddModal = () => {
    setEditingUser(null);
    setForm({
      name: '',
      email: '',
      role: 'product_manager',
      phone: '',
      password: '',
      avatar: AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)],
      active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      password: user.password || '',
      avatar: user.avatar,
      active: user.active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      showToast('يرجى ملء اسم المستخدم والبريد الإلكتروني', 'error');
      return;
    }

    if (editingUser) {
      updateAdminUser(editingUser.id, form);
    } else {
      addAdminUser({
        ...form,
        lastLogin: new Date().toISOString(),
      });
    }
    setIsModalOpen(false);
  };

  const roleLabel = (role: AdminRole) => {
    switch (role) {
      case 'super_admin':
        return { title: 'مدير عام للنظام (Super Admin)', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'product_manager':
        return { title: 'مدير المنتجات والمخزون', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'orders_manager':
        return { title: 'مسؤول المبيعات والطلبات', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            <span>إدارة حسابات الأدمن وصلاحيات الوصول</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            يمكنك إنشاء أكثر من مستخدم للأدمن لتوزيع مهام إضافة المنتجات ومتابعة المبيعات
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة مستخدم أدمن جديد</span>
        </button>
      </div>

      {/* Currently logged in notification banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <img
            src={currentAdmin?.avatar}
            alt={currentAdmin?.name}
            className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-500 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{currentAdmin?.name}</span>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-500/30">
                الحساب النشط حالياً
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 font-mono">{currentAdmin?.email}</p>
          </div>
        </div>

        <div className="text-xs text-slate-300">
          <span>الرتبة: </span>
          <strong className="text-amber-400">{roleLabel(currentAdmin?.role || 'super_admin').title}</strong>
        </div>
      </div>

      {/* Admin Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminUsers.map((user) => {
          const roleInfo = roleLabel(user.role);
          const isCurrent = currentAdmin?.id === user.id;

          return (
            <div
              key={user.id}
              className={`bg-white rounded-3xl border p-5 space-y-4 shadow-xs transition-all relative ${
                isCurrent 
                  ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-md' 
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              {/* Header with Avatar & Role */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-13 h-13 rounded-2xl object-cover bg-slate-100 border border-slate-200"
                    />
                    {user.active ? (
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" title="نشط" />
                    ) : (
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white" title="معطل" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{user.name}</h3>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border mt-1 ${roleInfo.color}`}>
                      {roleInfo.title}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(user)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="تعديل"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {adminUsers.length > 1 && (
                    <button
                      onClick={() => {
                        if (window.confirm(`هل أنت متأكد من حذف حساب الأدمن: "${user.name}"؟`)) {
                          deleteAdminUser(user.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Contact info & Login details */}
              <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100 font-mono">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-200">
                  <Lock className="w-3.5 h-3.5" />
                  <span>كلمة المرور: ••••••••</span>
                </div>
              </div>

              {/* Switch button */}
              <div className="pt-1">
                {isCurrent ? (
                  <div className="w-full py-2 px-3 rounded-xl bg-amber-50 text-amber-800 font-bold text-xs text-center border border-amber-200 flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4" />
                    <span>أنت مسجل الدخول بهذا الحساب حالياً</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setCurrentAdmin(user);
                      showToast(`تم التبديل بنجاح إلى حساب: "${user.name}"`, 'success');
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs text-center transition-colors flex items-center justify-center gap-1.5"
                  >
                    <LogIn className="w-4 h-4 text-slate-500" />
                    <span>تسجيل الدخول / التبديل لهذا الحساب</span>
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Add / Edit Admin Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center">
          <div 
            className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 text-right p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-600" />
                <span>{editingUser ? 'تعديل بيانات المستخدم' : 'إنشاء حساب أدمن جديد'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {/* Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: م. مصطفى خالد"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 rounded-xl px-3.5 py-2.5 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white text-xs"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@albayt.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 rounded-xl px-3.5 py-2.5 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white text-xs font-mono"
                />
              </div>

              {/* Phone & Password */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم الهاتف</label>
                  <input
                    type="tel"
                    placeholder="01012345678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 rounded-xl px-3 py-2 border border-slate-200 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">كلمة المرور *</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 rounded-xl px-3 py-2 border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Role selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">الصلاحية والرتبة (Role) *</label>
                <div className="space-y-2">
                  <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                    form.role === 'super_admin' ? 'border-purple-400 bg-purple-50 text-purple-950 font-bold' : 'border-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      checked={form.role === 'super_admin'}
                      onChange={() => setForm({ ...form, role: 'super_admin' })}
                    />
                    <div>
                      <span className="block text-xs">مدير عام للنظام (Super Admin)</span>
                      <span className="text-[10px] text-slate-500">صلاحيات كاملة على المنتجات والطلبات والمستخدمين</span>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                    form.role === 'product_manager' ? 'border-amber-400 bg-amber-50 text-amber-950 font-bold' : 'border-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      checked={form.role === 'product_manager'}
                      onChange={() => setForm({ ...form, role: 'product_manager' })}
                    />
                    <div>
                      <span className="block text-xs">مدير المنتجات والمخزون (Product Manager)</span>
                      <span className="text-[10px] text-slate-500">إضافة وتعديل الأجهزة والأسعار والمواصفات والمخزون</span>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                    form.role === 'orders_manager' ? 'border-blue-400 bg-blue-50 text-blue-950 font-bold' : 'border-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      checked={form.role === 'orders_manager'}
                      onChange={() => setForm({ ...form, role: 'orders_manager' })}
                    />
                    <div>
                      <span className="block text-xs">مسؤول المبيعات والطلبات (Orders Manager)</span>
                      <span className="text-[10px] text-slate-500">متابعة وتحديث حالات طلبات العملاء وطباعة الفواتير</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Avatar Preset Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">اختر صورة الحساب:</label>
                <div className="flex items-center gap-2">
                  {AVATAR_PRESETS.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setForm({ ...form, avatar: av })}
                      className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all ${
                        form.avatar === av ? 'border-amber-500 ring-2 ring-amber-500/30 scale-105' : 'border-slate-200 opacity-70'
                      }`}
                    >
                      <img src={av} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-xl shadow-md transition-all"
                >
                  {editingUser ? 'حفظ التعديلات' : 'إنشاء حساب الأدمن'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
