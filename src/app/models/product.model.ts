export type ProductCategory = 'بناتي' | 'أولادي' | 'بيبي';

export interface CartSelection {
  id: string;
  size: string;
  color: string;
  quantity: number;
}

export interface CartLine extends CartSelection {
  product: Product;
  total: number;
}

export interface Product {
  id: string;
  title: string;
  category: ProductCategory;
  price: number;
  sizes: string[];
  colors: string[];
  colorNames?: string[];
  images: string[];
  description: string;
  inStock: boolean;
  featured?: boolean;
}
