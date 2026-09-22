import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Product, ProductCategory } from '../../models/product.model';
import { OrderItem, OrderStatus, StoredOrder } from '../../models/order.model';
import { COLOR_PALETTE, ColorChoice, DEFAULT_CUSTOM_COLOR } from '../../config/colors.config';
import { ProductService } from '../../services/product.service';
import { OrderService } from '../../services/order.service';
import { AdminService } from '../../services/admin.service';
import { ImageService } from '../../services/image.service';
import { IconComponent } from '../../shared/icon.component';
import { SelectComponent } from '../../shared/select.component';

@Component({ selector: 'app-admin', standalone: true, imports: [CommonModule, FormsModule, RouterLink, IconComponent, SelectComponent], templateUrl: './admin.component.html', styleUrls: ['./admin.component.scss'] })
export class AdminComponent implements OnInit, OnDestroy {
  private readonly service = inject(ProductService);
  private readonly admin = inject(AdminService);
  private readonly orderService = inject(OrderService);
  private readonly images = inject(ImageService);
  private readonly router = inject(Router);
  readonly statuses: OrderStatus[] = ['جديد', 'تم التأكيد', 'تم التسليم', 'ملغي'];
  readonly categories: ProductCategory[] = ['بناتي', 'أولادي', 'بيبي'];
  readonly palette = COLOR_PALETTE;
  readonly tab = signal<'products' | 'orders'>('products');
  // On phones the editor lives in a bottom sheet; on wider screens it stays pinned beside the table.
  readonly editorOpen = signal(false);
  readonly editing = signal<Product | null>(null);
  readonly draft = signal<Product>(this.emptyProduct());
  readonly expanded = signal<string | null>(null);
  readonly syncError = signal('');
  readonly imageError = signal('');
  readonly imageBusy = signal(false);
  readonly saveError = signal('');
  readonly products = this.service.products;
  readonly orders = this.orderService.orders;
  readonly catalogNote = this.service.cloudError;
  readonly ordersNote = computed(() => this.syncError() || this.orderService.cloudError());
  @ViewChild('editorPanel') private editorPanel?: ElementRef<HTMLElement>;
  private sheetTimer?: number;
  // A product stores its shades and their names side by side, so the editor pairs them up.
  readonly colorRows = computed<ColorChoice[]>(() => {
    const product = this.draft();
    return product.colors.map((hex, index) => ({ hex, name: product.colorNames?.[index] ?? '' }));
  });
  readonly liveProducts = computed(() => this.products().filter(product => product.inStock).length);
  readonly newOrders = computed(() => this.orders().filter(order => order.status === 'جديد').length);

  // The studio follows Firestore live, so an order placed on a phone shows up here on its own.
  ngOnInit(): void { this.orderService.startLiveOrders(); void this.syncOrders(); }
  showTab(tab: 'products' | 'orders'): void {
    this.closeEditor();
    this.tab.set(tab);
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  newPiece(): void { this.startNew(); this.openEditor(); }
  editPiece(product: Product): void { this.edit(product); this.openEditor(); }
  closeEditor(): void { this.editorOpen.set(false); this.lockPageScroll(false); }
  @HostListener('document:keydown.escape') escape(): void { if (this.editorOpen()) this.closeEditor(); }
  async syncOrders(): Promise<void> {
    this.syncError.set('');
    try { await this.orderService.syncFromCloud(); }
    catch { this.syncError.set('تعذر تحديث الطلبات من السيرفر، بتشوف المحفوظ محلياً.'); }
  }
  async logout(): Promise<void> { await this.admin.logout(); await this.router.navigate(['/']); }
  pieces(order: StoredOrder): number { return this.orderService.pieces(order.details); }
  // Older orders kept a single product on the order itself, so they are read as a one-line list.
  orderItems(order: StoredOrder): OrderItem[] {
    const details = order.details;
    if (details.items?.length) return details.items;
    if (!details.productTitle) return [];
    return [{ productTitle: details.productTitle, size: details.size ?? '', color: details.color ?? '', price: details.price ?? 0, quantity: 1 }];
  }
  total(order: StoredOrder): number { return this.orderService.total(order.details); }
  toggleDetails(id: string): void { this.expanded.update(current => current === id ? null : id); }
  setStatus(id: string, status: string): void { this.orderService.setStatus(id, status as OrderStatus); }
  setCategory(category: string): void { this.updateField('category', category as ProductCategory); }
  removeOrder(id: string): void { this.orderService.removeOrder(id); }
  startNew(): void { this.editing.set(null); this.draft.set(this.emptyProduct()); this.resetEditorMessages(); }
  edit(product: Product): void {
    this.editing.set(product);
    this.draft.set({
      ...product, sizes: [...product.sizes], colors: [...product.colors],
      colorNames: [...(product.colorNames ?? [])], images: [...product.images]
    });
    this.resetEditorMessages();
  }
  save(): void {
    const product = this.draft();
    const colors = this.colorRows();
    if (!product.title.trim()) { this.saveError.set('اكتب اسم المنتج الأول.'); return; }
    if (!product.images.length) { this.saveError.set('ضيف صورة واحدة على الأقل للمنتج.'); return; }
    if (colors.some(color => !color.name.trim())) { this.saveError.set('اكتب اسم لكل لون زي «مرجاني»، عشان العميل يشوفه كده.'); return; }
    // Images and colours keep their own lists: splitting on commas would break data urls and names.
    const saved = this.service.save({
      ...product, id: product.id || `product-${Date.now()}`, title: product.title.trim(),
      sizes: this.csv(product.sizes), images: product.images,
      colors: colors.map(color => color.hex), colorNames: colors.map(color => color.name.trim())
    });
    if (!saved) { this.saveError.set('مساحة التخزين امتلت. امسح صور زيادة من المنتج ده أو من منتجات تانية وحاول تاني.'); return; }
    this.startNew();
    this.closeEditor();
  }
  remove(id: string): void { this.service.remove(id); }
  updateField<K extends keyof Product>(key: K, value: Product[K]): void { this.draft.set({ ...this.draft(), [key]: value }); }

  trackByIndex(index: number): number { return index; }
  async addImageFiles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;
    this.imageBusy.set(true);
    this.imageError.set('');
    const prepared: string[] = [];
    for (const file of files) {
      try { prepared.push(await this.images.toStoredImage(file)); }
      catch (error) { this.imageError.set(error instanceof Error ? error.message : 'تعذر تحضير الصورة.'); }
    }
    if (prepared.length) this.setImages([...this.draft().images, ...prepared]);
    this.imageBusy.set(false);
  }
  removeImage(index: number): void { this.setImages(this.draft().images.filter((_, position) => position !== index)); }
  moveImage(index: number, offset: number): void {
    const images = [...this.draft().images];
    const target = index + offset;
    if (target < 0 || target >= images.length) return;
    [images[index], images[target]] = [images[target], images[index]];
    this.setImages(images);
  }
  makeMainImage(index: number): void {
    const images = this.draft().images;
    if (index <= 0 || index >= images.length) return;
    this.setImages([images[index], ...images.filter((_, position) => position !== index)]);
  }

  isPicked(hex: string): boolean { return this.draft().colors.some(color => color.toLowerCase() === hex.toLowerCase()); }
  togglePaletteColor(choice: ColorChoice): void {
    const rows = this.colorRows();
    const picked = rows.findIndex(row => row.hex.toLowerCase() === choice.hex.toLowerCase());
    this.setColors(picked >= 0 ? rows.filter((_, position) => position !== picked) : [...rows, { ...choice }]);
  }
  addCustomColor(): void { this.setColors([...this.colorRows(), { hex: DEFAULT_CUSTOM_COLOR, name: '' }]); }
  updateColorHex(index: number, hex: string): void { this.setColors(this.colorRows().map((row, position) => position === index ? { ...row, hex } : row)); }
  updateColorName(index: number, name: string): void { this.setColors(this.colorRows().map((row, position) => position === index ? { ...row, name } : row)); }
  removeColor(index: number): void { this.setColors(this.colorRows().filter((_, position) => position !== index)); }

  private openEditor(): void {
    this.editorOpen.set(true);
    this.lockPageScroll(true);
    // The sheet stays mounted between products, so it rewinds to the top once it is on screen again.
    window.clearTimeout(this.sheetTimer);
    this.sheetTimer = window.setTimeout(() => { if (this.editorPanel) this.editorPanel.nativeElement.scrollTop = 0; });
  }
  // The sheet only covers the screen on phones, so the page keeps scrolling everywhere else.
  private lockPageScroll(active: boolean): void {
    document.body.style.overflow = active && window.matchMedia('(max-width: 720px)').matches ? 'hidden' : '';
  }
  private setImages(images: string[]): void {
    this.updateField('images', images);
    this.imageError.set('');
    this.saveError.set('');
  }
  private setColors(rows: ColorChoice[]): void {
    this.draft.set({ ...this.draft(), colors: rows.map(row => row.hex), colorNames: rows.map(row => row.name) });
    this.saveError.set('');
  }
  private resetEditorMessages(): void { this.imageError.set(''); this.saveError.set(''); }
  private csv(value: string[]): string[] { return value.flatMap(item => item.split(',')).map(item => item.trim()).filter(Boolean); }
  private emptyProduct(): Product { return { id: '', title: '', category: 'بناتي' as ProductCategory, price: 0, sizes: [], colors: [], colorNames: [], images: [], description: '', inStock: true }; }
  ngOnDestroy(): void { this.orderService.stopLiveOrders(); window.clearTimeout(this.sheetTimer); this.lockPageScroll(false); }
}
