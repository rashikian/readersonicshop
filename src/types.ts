export interface Product {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  price: number;
  rating: number;
  reviewsCount: number;
  images: string[]; // At least 2 images for interactivity or secondary views
  features: string[];
  specs: Record<string, string>;
  colors: { name: string; hex: string }[];
  stock: number;
  popular?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor: string;
}

export interface ShippingDetails {
  fullName: string;
  email?: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  paymentMethod: 'cod';
  cardNumber?: string;
  cardExpiry?: string;
  cardCvc?: string;
  bkashNumber?: string;
  bkashOtp?: string;
}

export interface Coupon {
  code: string;
  discountPercent: number;
  description: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  shipping: ShippingDetails;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  status: 'ordered' | 'auditing' | 'dispatched' | 'delivered' | 'pending' | 'processing' | 'shipped' | 'completed';
  createdAt: string;
  payment_method?: string;
  payment_status?: string;
  order_status?: string;
  user_id?: string | null;
}
