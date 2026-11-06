export type ProductCategory = string; // managed from the dashboard
export type LegacyCategory = 
  | 'kettles' // غلايات وماكينات المشروبات
  | 'screens' // شاشات وتلفزيونات
  | 'blenders' // خلاطات ومحضرات طعام
  | 'cooking' // أجهزة الطهي السريع والقلايات
  | 'cleaning' // المكانس والعناية بالمنزل
  | 'cooling'; // التبريد والتكييف

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  userName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
  isVerifiedPurchase?: boolean;
  helpfulCount?: number;
}

export interface PriceAlertSubscription {
  id: string;
  productId: string;
  productName: string;
  email: string;
  targetPrice?: number;
  currentPrice: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  nameEn?: string;
  category: ProductCategory;
  brand: string;
  price: number;
  originalPrice?: number;
  stock: number;
  rating: number;
  reviewsCount: number;
  reviews?: ProductReview[];
  image: string;
  gallery?: string[];
  description: string;
  features: string[];
  specs: ProductSpecification[];
  wattage?: string; // e.g., '2200 واط'
  capacity?: string; // e.g., '1.7 لتر' or '55 بوصة'
  warranty: string; // e.g., 'ضمان سنتين'
  isFeatured?: boolean;
  isNewArrival?: boolean;
  createdAt: string;
  slug?: string;
  sku?: string;
}

export type AdminRole = 'super_admin' | 'product_manager' | 'orders_manager';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatar: string;
  phone?: string;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
  password?: string; // Stored locally for simulation
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
}

export interface CustomerDetails {
  name: string;
  phone: string;
  altPhone?: string;
  email?: string;
  city: string;
  address: string;
  notes?: string;
  paymentMethod: 'cod' | 'vodafone' | 'instapay' | 'card';
}

export interface Order {
  id: string;
  customer: CustomerDetails;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
  assignedAdminId?: string;
}

export interface CategoryInfo {
  id: ProductCategory;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  itemCount?: number;
}
