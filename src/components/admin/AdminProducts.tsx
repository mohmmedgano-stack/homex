import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Product, ProductCategory } from '../../types';
import { PRESET_IMAGES } from '../../data/initialData';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Zap, 
  Image as ImageIcon, 
  Check, 
  X, 
  AlertCircle,
  Eye,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';

export const AdminProducts: React.FC = () => {
  const { 
    products, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    resetProducts,
    categories, 
    setSelectedProduct 
  } = useStore();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const initialForm = {
    name: '',
    nameEn: '',
    category: 'kettles' as ProductCategory,
    brand: 'فيليبس (Philips)',
    price: 1500,
    originalPrice: 1900,
    stock: 20,
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80',
    description: '',
    wattage: '2200 واط',
    capacity: '1.7 لتر',
    warranty: 'ضمان معتمد سنتين',
    features: ['موتور قوي وعالي الكفاءة', 'نظام حماية أوتوماتيكي ضد الحمل الزائد', 'خامات متينة ومقاومة للحرارة'],
    specs: [
      { label: 'القدرة الكهربائية', value: '2200 واط' },
      { label: 'السعة', value: '1.7 لتر' },
      { label: 'الخامة', value: 'زجاج مقوى وستانلس ستيل' }
    ],
    isFeatured: true,
  };

  const [form, setForm] = useState(initialForm);
  const [newFeatureText, setNewFeatureText] = useState('');
  const [showImagePicker, setShowImagePicker] = useState(false);

  const openAddModal = () => {
    setEditingProduct(null);
    setForm(initialForm);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      nameEn: product.nameEn || '',
      category: product.category,
      brand: product.brand,
      price: product.price,
      originalPrice: product.originalPrice || product.price,
      stock: product.stock,
      image: product.image,
      description: product.description,
      wattage: product.wattage || '',
      capacity: product.capacity || '',
      warranty: product.warranty,
      features: product.features || [],
      specs: product.specs || [],
      isFeatured: !!product.isFeatured,
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        ...form,
        originalPrice: form.originalPrice > form.price ? form.originalPrice : undefined,
      });
    } else {
      addProduct({
        ...form,
        originalPrice: form.originalPrice > form.price ? form.originalPrice : undefined,
        rating: 5.0,
        reviewsCount: 1,
        gallery: [form.image],
      });
    }
    setIsModalOpen(false);
  };

  const addFeature = () => {
    if (newFeatureText.trim()) {
      setForm(prev => ({
        ...prev,
        features: [...prev.features, newFeatureText.trim()]
      }));
      setNewFeatureText('');
    }
  };

  const removeFeature = (index: number) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.brand.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-['Cairo'] flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-amber-600" />
            <span>إدارة وتعديل الأجهزة والمنتجات</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            إجمالي {products.length} منتج مسجل في المتجر (شاشات، خلاطات، كاتيل، أجهزة طهي)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetProducts}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="إعادة تعيين المنتجات إلى الحالة الأصلية"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">استعادة الافتراضي</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة جهاز جديد</span>
          </button>
        </div>
      </div>

      {/* Filter and search toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="ابحث باسم الجهاز أو الماركة (مثال: كاتيل، سامسونج)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white text-slate-800 text-xs rounded-2xl pr-10 pl-4 py-3 border border-slate-200 focus:outline-hidden focus:border-amber-500 shadow-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-white text-slate-800 text-xs rounded-2xl px-4 py-3 border border-slate-200 focus:outline-hidden focus:border-amber-500 shadow-xs font-semibold"
        >
          <option value="all">جميع الأقسام</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">الجهاز</th>
                <th className="p-4">القسم</th>
                <th className="p-4">الماركة</th>
                <th className="p-4">السعر</th>
                <th className="p-4">المخزون</th>
                <th className="p-4">المواصفة السريعة</th>
                <th className="p-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const categoryObj = categories.find(c => c.id === p.category);
                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    {/* Product Media & Title */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-12 h-12 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200"
                        />
                        <div>
                          <p className="font-bold text-slate-900 line-clamp-1 max-w-xs">{p.name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {p.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-medium">
                        {categoryObj?.name || p.category}
                      </span>
                    </td>

                    {/* Brand */}
                    <td className="p-4 font-semibold text-slate-800">
                      {p.brand}
                    </td>

                    {/* Price */}
                    <td className="p-4">
                      <div className="font-mono">
                        <span className="font-bold text-slate-900 text-sm">
                          {p.price.toLocaleString()} ج.م
                        </span>
                        {p.originalPrice && p.originalPrice > p.price && (
                          <span className="text-[10px] text-slate-400 line-through block">
                            {p.originalPrice.toLocaleString()} ج.م
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Stock */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateProduct(p.id, { stock: Math.max(0, p.stock - 1) })}
                          className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700"
                          title="إنقاص المخزون"
                        >
                          -
                        </button>
                        <span className={`w-8 text-center font-mono font-bold ${
                          p.stock <= 5 ? 'text-rose-600' : 'text-slate-800'
                        }`}>
                          {p.stock}
                        </span>
                        <button
                          onClick={() => updateProduct(p.id, { stock: p.stock + 1 })}
                          className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700"
                          title="زيادة المخزون"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Wattage / Capacity */}
                    <td className="p-4">
                      <div className="flex flex-col gap-1 text-[11px]">
                        {p.wattage && (
                          <span className="text-amber-700 font-bold flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-500" />
                            {p.wattage}
                          </span>
                        )}
                        {p.capacity && (
                          <span className="text-slate-500">{p.capacity}</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedProduct(p)}
                          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                          title="معاينة كعميل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-2 rounded-xl text-blue-600 hover:bg-blue-50"
                          title="تعديل المنتج"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`هل أنت متأكد من حذف المنتج: "${p.name}"؟`)) {
                              deleteProduct(p.id);
                            }
                          }}
                          className="p-2 rounded-xl text-rose-600 hover:bg-rose-50"
                          title="حذف المنتج"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center">
          <div 
            className="relative bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 text-right p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <h3 className="text-lg font-bold text-slate-900 font-['Cairo'] flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-600" />
                <span>{editingProduct ? 'تعديل بيانات الجهاز' : 'إضافة جهاز منزلي جديد'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              
              {/* Product Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الجهاز بالعربي *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: غلاية مياه كهربائية فيليبس زجاجية 2200 واط"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 rounded-xl px-3.5 py-2.5 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white text-xs"
                />
              </div>

              {/* Category & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">القسم / التصنيف *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as ProductCategory })}
                    className="w-full bg-slate-50 text-slate-900 rounded-xl px-3.5 py-2.5 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white text-xs font-semibold"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الماركة التجارية *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: فيليبس، كينوود، سامسونج..."
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 rounded-xl px-3.5 py-2.5 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white text-xs"
                  />
                </div>
              </div>

              {/* Price, Original Price & Stock */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">السعر الحالي (ج.م) *</label>
                  <input
                    type="number"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-full bg-slate-50 text-slate-900 rounded-xl px-3 py-2.5 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">قبل الخصم (اختياري)</label>
                  <input
                    type="number"
                    value={form.originalPrice}
                    onChange={(e) => setForm({ ...form, originalPrice: Number(e.target.value) })}
                    className="w-full bg-slate-50 text-slate-900 rounded-xl px-3 py-2.5 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الكمية بالمخزن *</label>
                  <input
                    type="number"
                    required
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                    className="w-full bg-slate-50 text-slate-900 rounded-xl px-3 py-2.5 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Power, Capacity, Warranty */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">القدرة الكهربائية</label>
                  <input
                    type="text"
                    placeholder="مثال: 2200 واط"
                    value={form.wattage}
                    onChange={(e) => setForm({ ...form, wattage: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 rounded-xl px-3 py-2 border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">السعة / المقاس</label>
                  <input
                    type="text"
                    placeholder="مثال: 1.7 لتر أو 55 بوصة"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 rounded-xl px-3 py-2 border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">فترة الضمان</label>
                  <input
                    type="text"
                    placeholder="ضمان سنتين معتمد"
                    value={form.warranty}
                    onChange={(e) => setForm({ ...form, warranty: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 rounded-xl px-3 py-2 border border-slate-200 text-xs"
                  />
                </div>
              </div>

              {/* Image Input & Preset Picker */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">رابط صورة المنتج *</label>
                  <button
                    type="button"
                    onClick={() => setShowImagePicker(!showImagePicker)}
                    className="text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{showImagePicker ? 'إخفاء مكتبة الصور' : 'اختر من مكتبة الأجهزة الجاهزة'}</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    placeholder="https://..."
                    value={form.image}
                    onChange={(e) => setForm({ ...form, image: e.target.value })}
                    className="flex-1 bg-slate-50 text-slate-900 rounded-xl px-3 py-2 border border-slate-200 text-xs font-mono"
                  />
                  <img
                    src={form.image}
                    alt="Preview"
                    className="w-10 h-10 rounded-lg object-cover border border-slate-300 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                </div>

                {/* Preset image gallery */}
                {showImagePicker && (
                  <div className="mt-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <p className="text-[11px] font-bold text-slate-600">انقر على أي صورة جاهزة لاعتمادها للجهاز:</p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {PRESET_IMAGES.map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setForm({ ...form, image: img.url });
                            setShowImagePicker(false);
                          }}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all group ${
                            form.image === img.url ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-slate-200 hover:border-slate-400'
                          }`}
                          title={img.label}
                        >
                          <img src={img.url} alt={img.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[8px] text-white p-0.5 truncate text-center">
                            {img.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">وصف المنتج ومواصفاته التفصيلية</label>
                <textarea
                  rows={2}
                  placeholder="اكتب وصفاً جذاباً للجهاز ومميزاته ومواده..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 rounded-xl px-3 py-2 border border-slate-200 text-xs resize-none"
                />
              </div>

              {/* Features List */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">نقاط ومميزات رئيسية (Bullets):</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="مثال: غليان سريع في أقل من دقيقتين"
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    className="flex-1 bg-slate-50 text-slate-900 rounded-xl px-3 py-1.5 border border-slate-200 text-xs"
                  />
                  <button
                    type="button"
                    onClick={addFeature}
                    className="px-3 py-1.5 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-700"
                  >
                    + إضافة ميزة
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {form.features.map((feat, idx) => (
                    <span 
                      key={idx} 
                      className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1.5"
                    >
                      <span>{feat}</span>
                      <button 
                        type="button" 
                        onClick={() => removeFeature(idx)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Featured toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isFeatured"
                  checked={form.isFeatured}
                  onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
                <label htmlFor="isFeatured" className="font-bold text-slate-800 cursor-pointer">
                  تثبيت كمنتج مميز في الواجهة الرئيسية (Featured Appliance)
                </label>
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
                  {editingProduct ? 'حفظ التعديلات' : 'إضافة الجهاز الآن'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
