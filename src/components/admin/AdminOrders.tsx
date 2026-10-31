import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Order, OrderStatus } from '../../types';
import { 
  Package, 
  Search, 
  Eye, 
  Phone, 
  MapPin, 
  Printer, 
  Clock, 
  Truck, 
  CheckCircle2, 
  XCircle,
  X 
} from 'lucide-react';

export const AdminOrders: React.FC = () => {
  const { orders, updateOrderStatus, adminUsers } = useStore();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const statusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return { label: 'قيد المراجعة', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'processing':
        return { label: 'جاري التجهيز', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'shipped':
        return { label: 'قيد التوصيل', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'delivered':
        return { label: 'تم التسليم', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'cancelled':
        return { label: 'ملغي', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    const matchesSearch = o.id.toLowerCase().includes(search.toLowerCase()) ||
                          o.customer.name.toLowerCase().includes(search.toLowerCase()) ||
                          o.customer.phone.includes(search);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            <span>إدارة وتتبع طلبات العملاء</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            إجمالي {orders.length} طلب مسجل في النظام
          </p>
        </div>

        {/* Status filters */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'pending', label: 'قيد المراجعة' },
            { id: 'processing', label: 'جاري التجهيز' },
            { id: 'shipped', label: 'قيد الشحن' },
            { id: 'delivered', label: 'تم التسليم' },
          ].map(st => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                filterStatus === st.id 
                  ? 'bg-slate-900 text-white font-bold' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="ابحث برقم الطلب (ORD-...)، اسم العميل، أو رقم الهاتف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white text-slate-800 text-xs rounded-2xl pr-10 pl-4 py-3 border border-slate-200 focus:outline-hidden focus:border-amber-500 shadow-xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">رقم الطلب</th>
                <th className="p-4">العميل</th>
                <th className="p-4">المنتجات المطلوبة</th>
                <th className="p-4">المبلغ الإجمالي</th>
                <th className="p-4">حالة الطلب</th>
                <th className="p-4">التاريخ</th>
                <th className="p-4 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    لا توجد طلبات تطابق بحثك حالياً
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const badge = statusBadge(order.status);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      
                      {/* Order ID */}
                      <td className="p-4 font-mono font-bold text-amber-700">
                        #{order.id}
                      </td>

                      {/* Customer */}
                      <td className="p-4">
                        <div>
                          <p className="font-bold text-slate-900">{order.customer.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{order.customer.phone}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 truncate max-w-xs">
                            {order.customer.city}
                          </p>
                        </div>
                      </td>

                      {/* Products */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          {order.items.slice(0, 3).map((item, idx) => (
                            <img
                              key={idx}
                              src={item.productImage}
                              alt=""
                              title={item.productName}
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200"
                            />
                          ))}
                          {order.items.length > 3 && (
                            <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                              +{order.items.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="p-4 font-mono font-black text-slate-900 text-sm">
                        {order.total.toLocaleString()} ج.م
                      </td>

                      {/* Status Dropdown */}
                      <td className="p-4">
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                          className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border focus:outline-hidden ${badge.bg}`}
                        >
                          <option value="pending">قيد المراجعة</option>
                          <option value="processing">جاري التجهيز</option>
                          <option value="shipped">قيد الشحن</option>
                          <option value="delivered">تم التسليم</option>
                          <option value="cancelled">ملغي</option>
                        </select>
                      </td>

                      {/* Date */}
                      <td className="p-4 text-slate-500 font-mono text-[11px]">
                        {new Date(order.createdAt).toLocaleDateString('ar-EG', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      {/* Action */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>عرض الفاتورة</span>
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details & Invoice Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center">
          <div 
            className="relative bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 text-right p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  فاتورة الطلب #{selectedOrder.id}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border inline-block mt-1 ${statusBadge(selectedOrder.status).bg}`}>
                  {statusBadge(selectedOrder.status).label}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Customer Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                <p><strong>اسم العميل:</strong> {selectedOrder.customer.name}</p>
                <p><strong>رقم الهاتف:</strong> {selectedOrder.customer.phone}</p>
                <p><strong>المحافظة والمدينة:</strong> {selectedOrder.customer.city}</p>
                <p><strong>العنوان:</strong> {selectedOrder.customer.address}</p>
                {selectedOrder.customer.notes && (
                  <p><strong>ملاحظات العميل:</strong> {selectedOrder.customer.notes}</p>
                )}
                <p>
                  <strong>طريقة الدفع:</strong> {selectedOrder.customer.paymentMethod === 'cash_on_delivery' ? 'دفع عند الاستلام (كاش)' : 'بطاقة بنكية'}
                </p>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800">الأجهزة المطلوبة:</h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="p-3 bg-white flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img src={item.productImage} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <p className="font-bold text-slate-900">{item.productName}</p>
                          <span className="text-slate-400 font-mono">الكمية: {item.quantity}</span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-slate-900">
                        {(item.price * item.quantity).toLocaleString()} ج.م
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total calculations */}
              <div className="space-y-1 pt-2 border-t border-slate-200 text-slate-600">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span className="font-mono">{selectedOrder.subtotal.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span>الشحن:</span>
                  <span className="font-mono">{selectedOrder.shippingFee === 0 ? 'مجاناً' : `${selectedOrder.shippingFee} ج.م`}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-200">
                  <span>المجموع الكلي:</span>
                  <span className="font-mono text-amber-600">{selectedOrder.total.toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الفاتورة</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  إغلاق
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
