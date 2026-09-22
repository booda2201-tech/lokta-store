export interface OrderData {
  customerName: string;
  phone: string;
  address: string;
  productTitle: string;
  productImage?: string;
  imageUrl?: string;
  size: string;
  color: string;
  price: number;
  notes?: string;
}
