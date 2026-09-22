import { Injectable, computed, inject, signal } from '@angular/core';
import { DocumentData, Firestore, collection, doc, onSnapshot, setDoc, writeBatch } from '@angular/fire/firestore';
import { CartLine, CartSelection, Product, ProductCategory } from '../models/product.model';

const STORAGE_KEY = 'loqta-products';
const CART_KEY = 'lokta-cart';
const MAX_QUANTITY = 10;
const ARABIC_CATEGORIES = ['بناتي', 'أولادي', 'بيبي'];

const SEED_PRODUCTS: Product[] = [
  {
    id: 'cardigan-dafy',
    title: 'طقم كارديجان تريكو دافئ',
    category: 'أولادي',
    price: 840,
    sizes: ['سنتين', '4 سنين', '6 سنين'],
    colors: ['#cfe8e3', '#f6cf71'],
    colorNames: ['أزرق سماوي', 'أصفر ليموني'],
    images: [
      'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=900&q=85',
      'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=900&q=85'
    ],
    description: 'كارديجان تريكو مبهج للصباح البارد والويك إند والحكايات الطويلة مع بنطال مريح.',
    inStock: true,
    featured: true
  },
  {
    id: 'fustan-wardy',
    title: 'فستان ربيعي بالزهور مع كارديجان',
    category: 'بناتي',
    price: 750,
    sizes: ['4 سنين', '6 سنين', '8 سنين', '10 سنين'],
    colors: ['#f8b195', '#f8f8f8'],
    colorNames: ['وردي مبهج', 'أبيض عاجي'],
    images: [
      'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&w=900&q=85',
      'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=900&q=85'
    ],
    description: 'فستان أنيق مطبوع بزهور الربيع الرقيقة مع كارديجان قطني خفيف ومريح للخروجات.',
    inStock: true,
    featured: true
  },
  {
    id: 'overall-genena',
    title: 'سالوبيت كاجوال للجنينة',
    category: 'بيبي',
    price: 620,
    sizes: ['سنة', 'سنتين', '4 سنين'],
    colors: ['#2b3a4a', '#f4e8c1'],
    colorNames: ['كحلي جينز', 'بيج فاتح'],
    images: [
      'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=900&q=85',
      'https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=900&q=85'
    ],
    description: 'سالوبيت جينز قطني مريح وأنيق للاكتشاف واللعب في الهواء الطلق مع تيشرت أبيض.',
    inStock: true,
    featured: false
  },
  {
    id: 'qamis-moghamarat',
    title: 'طقم قميص كروهات وبنطال تشينو',
    category: 'أولادي',
    price: 690,
    sizes: ['4 سنين', '6 سنين', '8 سنين', '10 سنين'],
    colors: ['#990000', '#355c3a'],
    colorNames: ['أحمر كلاسيك', 'زيتي هادئ'],
    images: [
      'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?auto=format&fit=crop&w=900&q=85',
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=900&q=85'
    ],
    description: 'قميص قطني بنقشة كروهات مميزة مع بنطال تشينو كاجوال مناسب للمناسبات والأعياد.',
    inStock: true,
    featured: true
  },
  {
    id: 'romper-soghayar',
    title: 'طقم رومبر قطني ناعم قطعة واحدة',
    category: 'بيبي',
    price: 450,
    sizes: ['من 0 لـ 3 شهور', 'من 3 لـ 6 شهور', 'من 6 لـ 12 شهر'],
    colors: ['#faf0e6', '#d3d3d3'],
    colorNames: ['أوف وايت', 'رمادي فاتح'],
    images: [
      'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=900&q=85',
      'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=900&q=85'
    ],
    description: 'رومبر قطني فائق النعومة بملمس لطيف على بشرة الأطفال الرضع مع كباسين سهلة الفتح.',
    inStock: true,
    featured: false
  },
  {
    id: 'taqm-sahab',
    title: 'طقم رياضى ترنج السحاب',
    category: 'أولادي',
    price: 780,
    sizes: ['6 سنين', '8 سنين', '10 سنين', '12 سنة'],
    colors: ['#808080', '#000080'],
    colorNames: ['رمادي ميلانژ', 'كحلي رياضى'],
    images: [
      'https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=900&q=85',
      'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=900&q=85'
    ],
    description: 'ترنج قطني ميلتون مريح بتصميم سحاب عصري ومناسب للتمارين والأنشطة اليومية.',
    inStock: true,
    featured: true
  },
  {
    id: 'fustan-amira',
    title: 'فستان الأميرة الصغيرة للمناسبات',
    category: 'بناتي',
    price: 950,
    sizes: ['سنتين', '4 سنين', '6 سنين', '8 سنين'],
    colors: ['#f1e2be', '#fce4ec'],
    colorNames: ['ذهبي فاتح', 'بينك لؤلؤي'],
    images: [
      'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=900&q=85',
      'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&w=900&q=85'
    ],
    description: 'فستان مطرز بطبقات التل الناعم بتصميم ساحر للمناسبات والأفراح.',
    inStock: true,
    featured: true
  },
  {
    id: 'shorts-seefy',
    title: 'طقم تيشيرت وشورت صيفي كاجوال',
    category: 'أولادي',
    price: 580,
    sizes: ['4 سنين', '6 سنين', '8 سنين'],
    colors: ['#ffeb3b', '#0288d1'],
    colorNames: ['أصفر شمس', 'أزرق بحري'],
    images: [
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=900&q=85',
      'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?auto=format&fit=crop&w=900&q=85'
    ],
    description: 'تيشيرت قطني مطبوع برسومات مبهجة مع شورت جينز خفيف ومريح لأيام الصيف.',
    inStock: true,
    featured: false
  },
  {
    id: 'skirt-set-farasha',
    title: 'طقم بلوزة وجيبة جينز الفراشة',
    category: 'بناتي',
    price: 720,
    sizes: ['4 سنين', '6 سنين', '8 سنين'],
    colors: ['#ffffff', '#4682b4'],
    colorNames: ['أبيض مطبوع', 'أزرق جينز'],
    images: [
      'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?auto=format&fit=crop&w=900&q=85',
      'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&w=900&q=85'
    ],
    description: 'بلوزة قطنية بطبعة الفراشة مع تنورة جينز قصيرة بكسرات أنيقة.',
    inStock: true,
    featured: false
  },
  {
    id: 'pajama-ahlam',
    title: 'بيجامة نوم قطنية مطبوعة بالنجوم',
    category: 'أولادي',
    price: 490,
    sizes: ['سنتين', '4 سنين', '6 سنين', '8 سنين', '10 سنين'],
    colors: ['#1a237e', '#b0bec5'],
    colorNames: ['كحلي نجوم', 'رمادي هادئ'],
    images: [
      'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=900&q=85',
      'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=900&q=85'
    ],
    description: 'بيجامة قطنية مريحة جداً للنوم بأكمام طويلة وطبعة نجوم مبهجة.',
    inStock: true,
    featured: false
  }
];

@Injectable({ providedIn: 'root' })
export class ProductService {
  // Optional so the shop still runs on the cached catalogue where no Firebase app is provided, such as the unit tests.
  private readonly firestore = inject(Firestore, { optional: true });
  private readonly productsSignal = signal<Product[]>(this.loadProducts());
  private readonly cartSignal = signal<CartSelection[]>(this.loadCart());
  private readonly favoriteIdsSignal = signal<string[]>(this.loadIds('lokta-favorites'));
  readonly cloudError = signal('');
  readonly maxQuantity = MAX_QUANTITY;
  private seeding = false;
  readonly favoriteIds = this.favoriteIdsSignal.asReadonly();
  readonly favoritesOnly = signal(false);
  readonly products = this.productsSignal.asReadonly();
  readonly activeProducts = computed(() => this.products().filter(product => product.inStock));
  readonly cartLines = computed<CartLine[]>(() => this.cartSignal().flatMap(selection => {
    const product = this.activeProducts().find(item => item.id === selection.id);
    return product ? [{ ...selection, product, total: product.price * selection.quantity }] : [];
  }));
  readonly cartTotal = computed(() => this.cartLines().reduce((sum, line) => sum + line.total, 0));
  readonly cartCount = computed(() => this.cartLines().reduce((sum, line) => sum + line.quantity, 0));

  constructor() { this.listenToCatalogue(); }

  colorOptions(product: Product): string[] { return product.colors.map((color, index) => product.colorNames?.[index] ?? color); }

  addToCart(id: string, selection: Partial<CartSelection> = {}): void {
    const existing = this.cartSignal().find(line => line.id === id);
    if (existing) { this.setQuantity(id, existing.quantity + 1); return; }
    const line = this.buildSelection({ ...selection, id });
    if (line) this.persistCart([...this.cartSignal(), line]);
  }

  removeFromCart(id: string): void { this.persistCart(this.cartSignal().filter(line => line.id !== id)); }
  clearCart(): void { this.persistCart([]); }
  setSize(id: string, size: string): void { this.updateSelection(id, { size }); }
  setColor(id: string, color: string): void { this.updateSelection(id, { color }); }
  setQuantity(id: string, quantity: number): void { this.updateSelection(id, { quantity }); }

  private updateSelection(id: string, change: Partial<CartSelection>): void {
    this.persistCart(this.cartSignal().flatMap(line => {
      if (line.id !== id) return [line];
      const updated = this.buildSelection({ ...line, ...change });
      return updated ? [updated] : [];
    }));
  }

  private buildSelection(selection: Partial<CartSelection> & { id: string }): CartSelection | undefined {
    const product = this.getById(selection.id);
    if (!product) return undefined;
    const colors = this.colorOptions(product);
    const quantity = Math.floor(Number(selection.quantity ?? 1));
    return {
      id: product.id,
      size: selection.size && product.sizes.includes(selection.size) ? selection.size : product.sizes[0] ?? '',
      color: selection.color && colors.includes(selection.color) ? selection.color : colors[0] ?? '',
      quantity: Number.isFinite(quantity) ? Math.min(Math.max(quantity, 1), MAX_QUANTITY) : 1
    };
  }

  private loadCart(): CartSelection[] {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      if (!Array.isArray(stored)) return [];
      return stored.flatMap(entry => {
        // Carts saved before per-item selections held product ids only.
        const selection: Partial<CartSelection> = typeof entry === 'string' ? { id: entry } : entry as Partial<CartSelection>;
        const line = typeof selection?.id === 'string' ? this.buildSelection({ ...selection, id: selection.id }) : undefined;
        return line ? [line] : [];
      });
    } catch { return []; }
  }

  private persistCart(lines: CartSelection[]): void {
    this.cartSignal.set(lines);
    try { localStorage.setItem(CART_KEY, JSON.stringify(lines)); } catch { /* In-memory state remains usable if storage is unavailable. */ }
  }

  toggleFavorite(id: string): void {
    this.favoriteIdsSignal.update(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]);
    this.saveIds('lokta-favorites', this.favoriteIdsSignal());
  }

  private loadIds(key: string): string[] {
    try { const ids: unknown = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []; }
    catch { return []; }
  }
  private saveIds(key: string, ids: string[]): void { try { localStorage.setItem(key, JSON.stringify(ids)); } catch { /* In-memory state remains usable if storage is unavailable. */ } }

  toggleFavoritesView(): void { this.favoritesOnly.update(value => !value); }

  // Reads the source signal: the cart is restored before the public products alias exists.
  getById(id: string): Product | undefined { return this.productsSignal().find(product => product.id === id); }

  // Returns false when the catalogue would not survive a reload, so the studio can warn
  // instead of showing an uploaded photo that storage silently refused to keep.
  save(product: Product): boolean {
    const exists = this.products().some(item => item.id === product.id);
    const next = exists ? this.products().map(item => item.id === product.id ? product : item) : [...this.products(), product];
    const stored = this.persist(next);
    void this.push([product]);
    return stored;
  }

  remove(id: string): void {
    const hidden = this.products().flatMap(product => product.id === id ? [{ ...product, inStock: false }] : []);
    this.persist(this.products().map(product => product.id === id ? { ...product, inStock: false } : product));
    void this.push(hidden);
  }

  restoreSeedData(): void { this.persist(SEED_PRODUCTS); void this.push(SEED_PRODUCTS); }

  private loadProducts(): Product[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return SEED_PRODUCTS;
      const products = JSON.parse(stored) as Product[];
      return products.length && products.every(product => ARABIC_CATEGORIES.includes(product.category)) ? products : SEED_PRODUCTS;
    } catch { return SEED_PRODUCTS; }
  }

  private persist(products: Product[]): boolean {
    const previous = this.productsSignal();
    this.productsSignal.set(products);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); return true; }
    catch {
      // Firestore holds the real catalogue, so a full local cache only costs the offline copy.
      if (this.firestore) return true;
      this.productsSignal.set(previous);
      return false;
    }
  }

  // Firestore is the catalogue of record: every device follows the same collection live,
  // and localStorage is kept as the copy that paints the shop before the first snapshot lands.
  private listenToCatalogue(): void {
    if (!this.firestore) return;
    onSnapshot(collection(this.firestore, 'products'), snapshot => {
      // An empty result read from the local cache only means the snapshot is still on its way.
      if (snapshot.empty) { if (!snapshot.metadata.fromCache) void this.seedCatalogue(); return; }
      this.cache(snapshot.docs.map(document => this.fromCloud(document.id, document.data())));
      this.cloudError.set('');
    }, (error: unknown) => {
      console.error('Failed to read the catalogue from Firestore', error);
      this.cloudError.set('تعذر الوصول للكتالوج على السيرفر، بتشوف النسخة المحفوظة على الجهاز.');
    });
  }

  // The first run starts the shop off with the pieces the studio was designed around.
  private async seedCatalogue(): Promise<void> {
    if (this.seeding) return;
    this.seeding = true;
    try { await this.push(SEED_PRODUCTS); }
    finally { this.seeding = false; }
  }

  private async push(products: Product[]): Promise<void> {
    if (!this.firestore || !products.length) return;
    try {
      const batch = writeBatch(this.firestore);
      products.forEach(product => batch.set(doc(this.firestore!, 'products', product.id), this.toCloud(product)));
      await batch.commit();
      this.cloudError.set('');
    } catch (error: unknown) {
      console.error('Failed to save the catalogue to Firestore', error);
      this.cloudError.set('التعديل محفوظ على الجهاز بس السيرفر رفضه. جرّب تقلل عدد الصور أو حجمها وتحفظ تاني.');
    }
  }

  // Firestore rejects undefined, so the optional fields travel with a value of their own.
  private toCloud(product: Product): DocumentData {
    return { ...product, colorNames: product.colorNames ?? [], featured: product.featured ?? false };
  }

  private fromCloud(id: string, data: DocumentData): Product {
    const texts = (key: string): string[] => Array.isArray(data[key]) ? (data[key] as unknown[]).filter((item): item is string => typeof item === 'string') : [];
    const category = data['category'] as ProductCategory;
    return {
      id,
      title: typeof data['title'] === 'string' ? data['title'] : '',
      category: ARABIC_CATEGORIES.includes(category) ? category : 'بناتي',
      price: typeof data['price'] === 'number' ? data['price'] : 0,
      sizes: texts('sizes'), colors: texts('colors'), colorNames: texts('colorNames'), images: texts('images'),
      description: typeof data['description'] === 'string' ? data['description'] : '',
      inStock: data['inStock'] !== false,
      featured: data['featured'] === true
    };
  }

  private cache(products: Product[]): void {
    this.productsSignal.set(products);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); } catch { /* The live snapshot stays usable without an offline copy. */ }
  }
}
