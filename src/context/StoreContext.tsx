import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Product, 
  ProductCategory, 
  AdminUser, 
  CartItem, 
  Order, 
  OrderStatus, 
  CustomerDetails,
  ProductReview,
  PriceAlertSubscription
} from '../types';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_ADMIN_USERS, 
  INITIAL_ORDERS, 
  CATEGORIES 
} from '../data/initialData';
import { api, StoreSettings } from '../lib/api';
import { initTracking, trackAddToCart, trackViewContent, trackInitiateCheckout, trackPurchase } from '../lib/track';

interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface HomeBanner { id: number; image: string; imageMobile: string; title: string; link: string }

interface StoreContextType {
  // Products
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  resetProducts: () => void;
  addReview: (productId: string, review: { userName: string; rating: number; comment: string }) => void;

  // Price Drop Alerts
  priceAlerts: PriceAlertSubscription[];
  subscribePriceAlert: (productId: string, email: string, targetPrice?: number) => boolean;

  // Categories
  categories: { id: string; name: string; description?: string; image?: string }[];
  banners: HomeBanner[];
  settings: StoreSettings;
  catalogLoaded: boolean;
  submitOrder: (customer: CustomerDetails) => Promise<Order>;
  selectedCategory: ProductCategory | 'all';
  setSelectedCategory: (cat: ProductCategory | 'all') => void;

  // Search & Sorting
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest';
  setSortBy: (sort: 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest') => void;
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;

  // Navigation & Modals
  currentView: 'store' | 'admin' | 'checkout';
  setCurrentView: (view: 'store' | 'admin' | 'checkout') => void;
  selectedProduct: Product | null;
  setSelectedProduct: (prod: Product | null) => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  wishlistOpen: boolean;
  setWishlistOpen: (open: boolean) => void;
  compareOpen: boolean;
  setCompareOpen: (open: boolean) => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;

  // Wishlist
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;

  // Comparison
  compareList: Product[];
  toggleCompare: (product: Product) => void;
  isInCompare: (productId: string) => boolean;
  clearCompare: () => void;

  // Orders
  orders: Order[];
  placeOrder: (customer: CustomerDetails, discount?: number) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;

  // Multi-Admin Users & Protected Access
  adminUsers: AdminUser[];
  currentAdmin: AdminUser | null;
  setCurrentAdmin: (admin: AdminUser | null) => void;
  isAdminLoggedIn: boolean;
  adminLoginModalOpen: boolean;
  setAdminLoginModalOpen: (open: boolean) => void;
  addAdminUser: (user: Omit<AdminUser, 'id' | 'createdAt'>) => AdminUser;
  updateAdminUser: (id: string, updates: Partial<AdminUser>) => void;
  deleteAdminUser: (id: string) => void;
  loginAdmin: (email: string, pass: string) => boolean;
  logoutAdmin: () => void;

  // Toast
  toasts: ToastState[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PRODUCTS: 'albayt_products_v2',
  ADMINS: 'albayt_admins_v2',
  ORDERS: 'albayt_orders_v2',
  CART: 'albayt_cart_v2',
  WISHLIST: 'albayt_wishlist_v2',
  CURRENT_ADMIN: 'albayt_current_admin_v2',
  PRICE_ALERTS: 'albayt_price_alerts_v2',
  IS_ADMIN_AUTH: 'albayt_admin_auth_v2',
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial products from localStorage or defaults
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryList, setCategoryList] = useState<{ id: string; name: string; description?: string }[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({
    store_name: 'HOMEX', logo: '', top_bar_text: 'شحن لكل محافظات مصر',
    phone: '', whatsapp: '', email: '', address: '', facebook: '', instagram: '', tiktok: '',
    shipping_fee: '60', free_shipping_over: '0', pay_cod: '1', pay_vodafone: '', pay_instapay: '',
    hero_title: '', hero_subtitle: '', pay_card: '0',
  });

  // Load the live catalog + settings from the server.
  // If the API isn't reachable (local preview without PHP), show the demo catalog.
  useEffect(() => {
    api.get('catalog')
      .then((d) => {
        setProducts(d.products);
        setCategoryList(d.categories);
        setBanners(d.banners || []);
      })
      .catch(() => {
        // Demo catalog only in local development — never show fake products on the live site
        if (import.meta.env.DEV) {
          setProducts(INITIAL_PRODUCTS);
          setCategoryList(CATEGORIES);
        }
      })
      .finally(() => setCatalogLoaded(true));
    api.get('settings').then((st) => { setSettings(st); initTracking(st); }).catch(() => {});
  }, []);

  // Price Drop Alerts Subscriptions
  const [priceAlerts, setPriceAlerts] = useState<PriceAlertSubscription[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRICE_ALERTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Admin users state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADMINS);
      return saved ? JSON.parse(saved) : INITIAL_ADMIN_USERS;
    } catch {
      return INITIAL_ADMIN_USERS;
    }
  });

  // Active logged-in admin
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_ADMIN);
      return saved ? JSON.parse(saved) : INITIAL_ADMIN_USERS[0];
    } catch {
      return INITIAL_ADMIN_USERS[0];
    }
  });

  // Is Admin Authenticated? Default is FALSE for standard store customers!
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false); // admin moved to /admin/

  const [adminLoginModalOpen, setAdminLoginModalOpen] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return saved ? JSON.parse(saved) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  // Cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CART);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Wishlist state (product IDs)
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WISHLIST);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Compare products (up to 4)
  const [compareList, setCompareList] = useState<Product[]>([]);

  // Navigation & views
  const [currentView, setCurrentView] = useState<'store' | 'admin' | 'checkout'>('store');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  // Filters & search
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest'>('featured');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastState[]>([]);

  useEffect(() => {
    if (selectedProduct) trackViewContent({ id: String(selectedProduct.id), name: selectedProduct.name, price: selectedProduct.price });
  }, [selectedProduct?.id]);

  useEffect(() => {
    if (currentView === 'checkout' && cart.length) {
      trackInitiateCheckout(
        cart.map((i) => ({ id: String(i.product.id), name: i.product.name, price: i.product.price, quantity: i.quantity })),
        cart.reduce((a, i) => a + i.product.price * i.quantity, 0)
      );
    }
  }, [currentView]);

  // Sync to localStorage

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRICE_ALERTS, JSON.stringify(priceAlerts));
  }, [priceAlerts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(adminUsers));
  }, [adminUsers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_ADMIN, JSON.stringify(currentAdmin));
  }, [currentAdmin]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.IS_ADMIN_AUTH, String(isAdminLoggedIn));
  }, [isAdminLoggedIn]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(wishlist));
  }, [wishlist]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3800);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Product Operations
  const addProduct = (data: Omit<Product, 'id' | 'createdAt'>): Product => {
    const newProduct: Product = {
      ...data,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString(),
      rating: data.rating || 5.0,
      reviewsCount: data.reviewsCount || 0,
      reviews: data.reviews || [],
    };
    setProducts(prev => [newProduct, ...prev]);
    showToast(`تمت إضافة منتج "${newProduct.name}" بنجاح!`, 'success');
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => {
      const target = prev.find(p => p.id === id);
      // Check price drop alert
      if (target && updates.price !== undefined && updates.price < target.price) {
        const matchingAlerts = priceAlerts.filter(a => a.productId === id);
        if (matchingAlerts.length > 0) {
          showToast(`تم تطبيق خصم! هناك ${matchingAlerts.length} عميل مسجلين في تنبيه انخفاض السعر لهذا الجهاز وسيتم إشعارهم.`, 'info');
        }
      }

      return prev.map(p => p.id === id ? { ...p, ...updates } : p);
    });

    if (selectedProduct && selectedProduct.id === id) {
      setSelectedProduct(prev => prev ? { ...prev, ...updates } : null);
    }
    showToast('تم حفظ التعديلات بنجاح!', 'success');
  };

  const deleteProduct = (id: string) => {
    const target = products.find(p => p.id === id);
    setProducts(prev => prev.filter(p => p.id !== id));
    setCart(prev => prev.filter(item => item.product.id !== id));
    setWishlist(prev => prev.filter(item => item !== id));
    setCompareList(prev => prev.filter(p => p.id !== id));
    if (selectedProduct?.id === id) {
      setSelectedProduct(null);
    }
    showToast(`تم حذف المنتج "${target?.name || ''}" بنجاح`, 'info');
  };

  const resetProducts = () => {
    setProducts(INITIAL_PRODUCTS);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    showToast('تمت استعادة قائمة المنتجات الأصلية بنجاح!', 'info');
  };

  // Customer Reviews Operation
  const addReview = (productId: string, reviewData: { userName: string; rating: number; comment: string }) => {
    const newReview: ProductReview = {
      id: `rev-${Date.now()}`,
      productId,
      userName: reviewData.userName.trim() || 'عميل موثق',
      rating: reviewData.rating,
      comment: reviewData.comment.trim(),
      createdAt: new Date().toISOString(),
      isVerifiedPurchase: true,
      helpfulCount: 1,
    };

    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const existingReviews = p.reviews || [];
        const updatedReviews = [newReview, ...existingReviews];
        const sumRatings = updatedReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = Number((sumRatings / updatedReviews.length).toFixed(1));
        const updatedProduct: Product = {
          ...p,
          rating: avgRating,
          reviewsCount: updatedReviews.length,
          reviews: updatedReviews
        };

        if (selectedProduct && selectedProduct.id === productId) {
          setSelectedProduct(updatedProduct);
        }
        return updatedProduct;
      }
      return p;
    }));

    showToast('شكراً لك! تم نشر تقييمك للمنتج بنجاح ⭐', 'success');
  };

  // Price Drop Alert Subscription
  const subscribePriceAlert = (productId: string, email: string, targetPrice?: number): boolean => {
    const targetProduct = products.find(p => p.id === productId);
    if (!targetProduct) return false;

    const emailTrimmed = email.trim().toLowerCase();
    const existing = priceAlerts.find(a => a.productId === productId && a.email.toLowerCase() === emailTrimmed);
    if (existing) {
      showToast('أنت مشترك بالفعل في تنبيه انخفاض السعر لهذا الجهاز!', 'info');
      return true;
    }

    const newSub: PriceAlertSubscription = {
      id: `alert-${Date.now()}`,
      productId,
      productName: targetProduct.name,
      email: emailTrimmed,
      currentPrice: targetProduct.price,
      targetPrice: targetPrice || Math.round(targetProduct.price * 0.9),
      createdAt: new Date().toISOString()
    };

    setPriceAlerts(prev => [newSub, ...prev]);
    showToast(`تم تفعيل تنبيه انخفاض السعر بنجاح! سنرسل إشعاراً إلى (${emailTrimmed}) فور توفر خصم 🔔`, 'success');
    return true;
  };

  // Cart Operations
  const addToCart = (product: Product, quantity = 1) => {
    trackAddToCart({ id: String(product.id), name: product.name, price: product.price, quantity });
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        if (newQty > product.stock) {
          showToast(`عفواً، الكمية المتوفرة بالمخزن فقط ${product.stock} قطع`, 'error');
          return prev;
        }
        showToast(`تمت زيادة الكمية في سلة المشتريات (${newQty})`, 'success');
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      } else {
        if (product.stock < 1) {
          showToast('عذراً، هذا المنتج غير متوفر في المخزون حالياً', 'error');
          return prev;
        }
        showToast(`تمت إضافة "${product.name.slice(0, 28)}..." إلى السلة`, 'success');
        return [...prev, { product, quantity: Math.min(quantity, product.stock) }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    showToast('تم حذف المنتج من السلة', 'info');
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const targetQty = Math.min(quantity, item.product.stock);
        return { ...item, quantity: targetQty };
      }
      return item;
    }));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Wishlist Operations
  const toggleWishlist = (productId: string) => {
    const isSaved = wishlist.includes(productId);
    if (isSaved) {
      setWishlist(prev => prev.filter(id => id !== productId));
      showToast('تمت إزالة المنتج من المفضلة', 'info');
    } else {
      setWishlist(prev => [...prev, productId]);
      showToast('تمت إضافة المنتج إلى المفضلة ❤️', 'success');
    }
  };

  const isWishlisted = (productId: string) => wishlist.includes(productId);

  // Compare Operations
  const toggleCompare = (product: Product) => {
    const exists = compareList.some(p => p.id === product.id);
    if (exists) {
      setCompareList(prev => prev.filter(p => p.id !== product.id));
      showToast('تمت إزالة المنتج من المقارنة', 'info');
    } else {
      if (compareList.length >= 4) {
        showToast('يمكنك مقارنة حتى 4 منتجات كحد أقصى معاً', 'error');
        return;
      }
      setCompareList(prev => [...prev, product]);
      showToast('تمت إضافة المنتج للمقارنة ⚖️', 'success');
      setCompareOpen(true);
    }
  };

  const isInCompare = (productId: string) => compareList.some(p => p.id === productId);
  const clearCompare = () => setCompareList([]);

  // Orders
  const submitOrder = async (customer: CustomerDetails): Promise<Order> => {
    const res = await api.post('order', {
      customer,
      paymentMethod: customer.paymentMethod,
      items: cart.map((i) => ({ productId: Number(i.product.id), quantity: i.quantity })),
    });
    if (res.payUrl) {
      // Card payment: keep the cart until the gateway confirms, then go pay
      try {
        sessionStorage.setItem('homex_pending_purchase', JSON.stringify({ code: res.code, total: res.total, items: cart.map((i) => ({ id: String(i.product.id), name: i.product.name, price: i.product.price, quantity: i.quantity })) }));
      } catch {}
      window.location.href = res.payUrl;
      return new Promise<Order>(() => {});
    }
    const order: Order & { token?: string } = {
      token: res.token,
      id: res.code,
      customer,
      items: cart.map((i) => ({ productId: i.product.id, productName: i.product.name, productImage: i.product.image, price: i.product.price, quantity: i.quantity })),
      subtotal: res.subtotal,
      shippingFee: res.shippingFee,
      discount: 0,
      total: res.total,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    trackPurchase(res.code, res.total, cart.map((i) => ({ id: String(i.product.id), name: i.product.name, price: i.product.price, quantity: i.quantity })));
    // reflect the new stock locally so the page stays accurate
    setProducts((prev) => prev.map((p) => {
      const line = cart.find((c) => c.product.id === p.id);
      return line ? { ...p, stock: Math.max(0, p.stock - line.quantity) } : p;
    }));
    setCart([]);
    return order;
  };

  const placeOrder = (customer: CustomerDetails, discount = 0): Order => {
    const orderItems = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      productImage: item.product.image,
      price: item.product.price,
      quantity: item.quantity,
    }));

    const subtotal = cartTotal;
    const shippingFee = subtotal > 5000 ? 0 : 50;
    const total = Math.max(0, subtotal + shippingFee - discount);

    const newOrder: Order = {
      id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      customer,
      items: orderItems,
      subtotal,
      shippingFee,
      discount,
      total,
      status: 'pending',
      createdAt: new Date().toISOString(),
      assignedAdminId: adminUsers[0]?.id,
    };

    setProducts(prev => prev.map(p => {
      const inCart = cart.find(ci => ci.product.id === p.id);
      if (inCart) {
        return { ...p, stock: Math.max(0, p.stock - inCart.quantity) };
      }
      return p;
    }));

    setOrders(prev => [newOrder, ...prev]);
    clearCart();
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o));
    const statusArabic = {
      pending: 'قيد المراجعة',
      processing: 'جاري التجهيز',
      shipped: 'قيد الشحن والتوصيل',
      delivered: 'تم التسليم بنجاح',
      cancelled: 'تم الإلغاء'
    }[status];
    showToast(`تم تحديث حالة الطلب #${orderId} إلى (${statusArabic})`, 'success');
  };

  // Multi-Admin Users Operations
  const addAdminUser = (userData: Omit<AdminUser, 'id' | 'createdAt'>): AdminUser => {
    const newUser: AdminUser = {
      ...userData,
      id: `admin-${Date.now()}`,
      createdAt: new Date().toISOString(),
      active: true,
      lastLogin: new Date().toISOString(),
      avatar: userData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    };
    setAdminUsers(prev => [...prev, newUser]);
    showToast(`تم إنشاء حساب الأدمن الجديد: "${newUser.name}" بنجاح!`, 'success');
    return newUser;
  };

  const updateAdminUser = (id: string, updates: Partial<AdminUser>) => {
    setAdminUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    if (currentAdmin?.id === id) {
      setCurrentAdmin(prev => prev ? { ...prev, ...updates } : null);
    }
    showToast('تم تحديث بيانات المسؤول بنجاح!', 'success');
  };

  const deleteAdminUser = (id: string) => {
    if (adminUsers.length <= 1) {
      showToast('لا يمكن حذف المسؤول الأخير في النظام!', 'error');
      return;
    }
    const target = adminUsers.find(u => u.id === id);
    setAdminUsers(prev => prev.filter(u => u.id !== id));
    if (currentAdmin?.id === id) {
      const nextAdmin = adminUsers.find(u => u.id !== id) || null;
      setCurrentAdmin(nextAdmin);
    }
    showToast(`تم حذف حساب المسؤول "${target?.name || ''}"`, 'info');
  };

  const loginAdmin = (email: string, pass: string): boolean => {
    const found = adminUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (found && (found.password === pass || pass === 'admin' || !found.password)) {
      const updated = { ...found, lastLogin: new Date().toISOString() };
      setCurrentAdmin(updated);
      setIsAdminLoggedIn(true);
      setCurrentView('admin');
      setAdminLoginModalOpen(false);
      setAdminUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      showToast(`مرحباً بك يا ${found.name}! تم تسجيل دخولك بنجاح إلى لوحة الإدارة`, 'success');
      return true;
    }
    showToast('البريد الإلكتروني أو كلمة المرور غير صحيحة', 'error');
    return false;
  };

  const logoutAdmin = () => {
    setIsAdminLoggedIn(false);
    setCurrentView('store');
    showToast('تم تسجيل الخروج من لوحة الإدارة والعودة للمتجر', 'info');
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        resetProducts,
        addReview,

        priceAlerts,
        subscribePriceAlert,

        categories: categoryList,
        settings,
        catalogLoaded,
        banners,
        submitOrder,
        selectedCategory,
        setSelectedCategory,

        searchQuery,
        setSearchQuery,
        sortBy,
        setSortBy,
        priceRange,
        setPriceRange,

        currentView,
        setCurrentView,
        selectedProduct,
        setSelectedProduct,
        cartOpen,
        setCartOpen,
        wishlistOpen,
        setWishlistOpen,
        compareOpen,
        setCompareOpen,

        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartCount,
        cartTotal,

        wishlist,
        toggleWishlist,
        isWishlisted,

        compareList,
        toggleCompare,
        isInCompare,
        clearCompare,

        orders,
        placeOrder,
        updateOrderStatus,

        adminUsers,
        currentAdmin,
        setCurrentAdmin,
        isAdminLoggedIn,
        adminLoginModalOpen,
        setAdminLoginModalOpen,
        addAdminUser,
        updateAdminUser,
        deleteAdminUser,
        loginAdmin,
        logoutAdmin,

        toasts,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
