import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Product, ProductCategory } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { AnimationService } from '../../services/animation.service';
import { gsap } from 'gsap';
import * as AOS from 'aos';

@Component({
  selector: 'app-catalog', standalone: true, imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalog.component.html', styleUrls: ['./catalog.component.scss']
})
export class CatalogComponent implements AfterViewInit, OnDestroy {
  private readonly productService = inject(ProductService);
  private readonly animations = inject(AnimationService);
  private readonly allProducts = this.productService.activeProducts;
  @ViewChild('heroSection') private heroSection?: ElementRef<HTMLElement>;
  @ViewChild('productGrid') private productGrid?: ElementRef<HTMLElement>;
  private heroContext?: gsap.Context;
  private gridContext?: gsap.Context;
  private filterTween?: gsap.core.Tween;
  readonly search = signal('');
  readonly category = signal<'الكل' | ProductCategory>('الكل');
  readonly size = signal('كل المقاسات');
  readonly sort = signal('الأحدث');
  readonly categories: Array<'الكل' | ProductCategory> = ['الكل', 'بناتي', 'أولادي', 'بيبي'];
  readonly sizes = ['كل المقاسات', 'من 0 لـ 3 شهور', 'من 3 لـ 6 شهور', 'من 6 لـ 12 شهر', 'من سنة لسنتين', 'سنتين', '4 سنين', '6 سنين', '8 سنين', '10 سنين'];
  readonly addedProductId = signal('');
  readonly dropdownOpen = signal<string | null>(null);

  get filteredProducts(): Product[] {
    const query = this.search().trim().toLowerCase();
    const result = this.allProducts().filter(product => {
      const matchesSearch = !query || `${product.title} ${product.category}`.toLowerCase().includes(query);
      const matchesCategory = this.category() === 'الكل' || product.category === this.category();
      const matchesSize = this.size() === 'كل المقاسات' || product.sizes.includes(this.size());
      const matchesFavorites = !this.productService.favoritesOnly() || this.productService.favoriteIds().includes(product.id);
      return matchesSearch && matchesCategory && matchesSize && matchesFavorites;
    });
    return [...result].sort((a, b) => this.sort() === 'السعر: من الأقل للأعلى' ? a.price - b.price : this.sort() === 'السعر: من الأعلى للأقل' ? b.price - a.price : Number(b.featured) - Number(a.featured));
  }

  setSearch(value: string): void { this.transitionFilter(() => this.search.set(value)); }
  setCategory(value: 'الكل' | ProductCategory): void { this.transitionFilter(() => this.category.set(value)); }
  setSize(value: string): void { this.transitionFilter(() => this.size.set(value)); }
  setSort(value: string): void { this.transitionFilter(() => this.sort.set(value)); }
  toggleDropdown(name: string, event: Event): void { event.stopPropagation(); this.dropdownOpen.set(this.dropdownOpen() === name ? null : name); }
  chooseCategory(value: 'الكل' | ProductCategory): void { this.setCategory(value); this.dropdownOpen.set(null); }
  chooseSize(value: string): void { this.setSize(value); this.dropdownOpen.set(null); }
  chooseSort(value: string): void { this.setSort(value); this.dropdownOpen.set(null); }
  @HostListener('document:click') closeDropdown(): void { this.dropdownOpen.set(null); }
  cardEnter(card: HTMLElement): void { this.animations.hoverCard(card, true); }
  cardLeave(card: HTMLElement): void { this.animations.hoverCard(card, false); }
  addToCart(product: Product): void { this.productService.addToCart(product.id); this.addedProductId.set(product.id); window.setTimeout(() => this.addedProductId.set(''), 1600); }
  toggleFavorite(product: Product, event: Event): void { event.preventDefault(); event.stopPropagation(); this.productService.toggleFavorite(product.id); }
  isFavorite(product: Product): boolean { return this.productService.favoriteIds().includes(product.id); }

  ngAfterViewInit(): void {
    if (this.heroSection) this.heroContext = this.animations.createHero(this.heroSection);
    this.animateGridSoon();
    AOS.init({ duration: 620, once: true, offset: 70, easing: 'ease-out-back' });
  }

  ngOnDestroy(): void {
    this.heroContext?.revert();
    this.gridContext?.revert();
    this.filterTween?.kill();
    this.animations.clearInteractions();
  }

  private transitionFilter(update: () => void): void {
    this.filterTween?.kill();
    const cards = this.productGrid?.nativeElement.querySelectorAll('.product-card');
    if (!cards?.length) {
      update();
      this.animateGridSoon();
      return;
    }
    this.filterTween = gsap.to(cards, {
      autoAlpha: 0,
      y: -10,
      duration: .16,
      stagger: .012,
      ease: 'power2.in',
      onComplete: () => {
        update();
        this.animateGridSoon();
      }
    });
  }

  private animateGridSoon(): void {
    if (!this.productGrid) return;
    window.setTimeout(() => {
      this.gridContext?.revert();
      if (this.productGrid) this.gridContext = this.animations.animateGrid(this.productGrid);
      AOS.refresh();
    });
  }
}
