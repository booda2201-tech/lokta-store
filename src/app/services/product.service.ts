import { Injectable, computed, signal } from '@angular/core';
import { Product } from '../models/product.model';

const STORAGE_KEY = 'loqta-products';
const ARABIC_CATEGORIES = ['بناتي', 'أولادي', 'بيبي'];

const SEED_PRODUCTS: Product[] = [
  {
    id: 'fustan-wardy', title: 'فستان وردي بيلف', category: 'بناتي', price: 690,
    sizes: ['سنتين', '4 سنين', '6 سنين', '8 سنين'], colors: ['#f0785f', '#f6cf71'], colorNames: ['مرجاني', 'أصفر ليموني'],
    images: ['https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?auto=format&fit=crop&w=900&q=85', 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=900&q=85'],
    description: 'فستان قطن خفيف معمول للّف والضحك وكل خروجة حلوة مع العيلة.', inStock: true, featured: true
  },
  {
    id: 'taqm-sahab', title: 'طقم سحاب للبيبي', category: 'بيبي', price: 520,
    sizes: ['من 3 لـ 6 شهور', 'من 6 لـ 12 شهر', 'من سنة لسنتين'], colors: ['#cfe8e3', '#f8f5ef'], colorNames: ['أزرق سماوي', 'أوف وايت'],
    images: ['https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=900&q=85', 'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=900&q=85'],
    description: 'طبقات ناعمة ومريحة للمستكشف الصغير، لطيفة على الجلد وتستحمل اللعب.', inStock: true, featured: true
  },
  {
    id: 'qamis-moghamarat', title: 'قميص مغامرات', category: 'أولادي', price: 580,
    sizes: ['سنتين', '4 سنين', '6 سنين', '8 سنين', '10 سنين'], colors: ['#8e5264', '#25231f'], colorNames: ['نبيتي هادي', 'بني غامق'],
    images: ['https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=900&q=85', 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=900&q=85'],
    description: 'قميص قطن واسع شوية عشان يجري ويتنطط ويكبر معاه.', inStock: true
  },
  {
    id: 'overall-genena', title: 'أوفرول جنينة', category: 'بناتي', price: 760,
    sizes: ['سنتين', '4 سنين', '6 سنين', '8 سنين'], colors: ['#f0785f', '#8e5264'], colorNames: ['مرجاني', 'نبيتي هادي'],
    images: ['https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=900&q=85', 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=900&q=85'],
    description: 'أوفرول كوردروي مرح بجيوب صغيرة للكنوز ومقاس مريح طول الموسم.', inStock: true
  },
  {
    id: 'cardigan-dafy', title: 'كارديجان دافي', category: 'أولادي', price: 840,
    sizes: ['4 سنين', '6 سنين', '8 سنين', '10 سنين'], colors: ['#cfe8e3', '#f6cf71'], colorNames: ['أزرق سماوي', 'أصفر ليموني'],
    images: ['https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=900&q=85', 'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=900&q=85'],
    description: 'كارديجان تريكو مبهج للصباح البارد والويك إند والحكايات الطويلة.', inStock: true
  },
  {
    id: 'romper-soghayar', title: 'رومبر البرعم الصغير', category: 'بيبي', price: 460,
    sizes: ['من 0 لـ 3 شهور', 'من 3 لـ 6 شهور', 'من 6 لـ 12 شهر'], colors: ['#f6cf71', '#f0785f'], colorNames: ['أصفر ليموني', 'مرجاني'],
    images: ['https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=900&q=85', 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=900&q=85'],
    description: 'رومبر يومي بكباسين عملية ولمسة شمس صغيرة في كل تفصيلة.', inStock: true
  }
];

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly productsSignal = signal<Product[]>(this.loadProducts());
  private readonly cartItemsSignal = signal<string[]>([]);
  private readonly favoriteIdsSignal = signal<string[]>([]);
  readonly cartCount = computed(() => this.cartItemsSignal().length);
  readonly favoriteIds = this.favoriteIdsSignal.asReadonly();
  readonly favoritesOnly = signal(false);
  readonly products = this.productsSignal.asReadonly();
  readonly activeProducts = computed(() => this.products().filter(product => product.inStock));

  addToCart(id: string): void {
    if (!this.cartItemsSignal().includes(id)) this.cartItemsSignal.update(items => [...items, id]);
  }

  toggleFavorite(id: string): void {
    this.favoriteIdsSignal.update(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]);
  }

  toggleFavoritesView(): void { this.favoritesOnly.update(value => !value); }

  getById(id: string): Product | undefined { return this.products().find(product => product.id === id); }

  save(product: Product): void {
    const exists = this.products().some(item => item.id === product.id);
    const next = exists ? this.products().map(item => item.id === product.id ? product : item) : [...this.products(), product];
    this.persist(next);
  }

  remove(id: string): void { this.persist(this.products().map(product => product.id === id ? { ...product, inStock: false } : product)); }
  restoreSeedData(): void { this.persist(SEED_PRODUCTS); }

  private loadProducts(): Product[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return SEED_PRODUCTS;
      const products = JSON.parse(stored) as Product[];
      return products.length && products.every(product => ARABIC_CATEGORIES.includes(product.category)) ? products : SEED_PRODUCTS;
    } catch { return SEED_PRODUCTS; }
  }

  private persist(products: Product[]): void {
    this.productsSignal.set(products);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }
}
