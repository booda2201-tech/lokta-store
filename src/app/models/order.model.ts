export interface OrderItem {
  productTitle: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
  image?: string;
}

export type OrderStatus = 'جديد' | 'تم التأكيد' | 'تم التسليم' | 'ملغي';

export interface StoredOrder {
  id: string;
  placedAt: string;
  status: OrderStatus;
  details: OrderData;
}

export interface OrderData {
  customerName: string;
  phone: string;
  address: string;
  productTitle?: string;
  productImage?: string;
  imageUrl?: string;
  size?: string;
  color?: string;
  price?: number;
  notes?: string;
  items?: OrderItem[];
}
