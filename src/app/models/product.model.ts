export type ProductCategory = 'بناتي' | 'أولادي' | 'بيبي';

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
