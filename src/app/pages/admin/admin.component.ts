import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Product, ProductCategory } from '../../models/product.model';
import { ProductService } from '../../services/product.service';

@Component({ selector: 'app-admin', standalone: true, imports: [CommonModule, FormsModule, RouterLink], templateUrl: './admin.component.html', styleUrls: ['./admin.component.scss'] })
export class AdminComponent implements OnInit {
  private readonly service = inject(ProductService);
  private readonly router = inject(Router);
  readonly authenticated = signal(false);
  readonly password = signal('');
  readonly editing = signal<Product | null>(null);
  readonly draft = signal<Product>(this.emptyProduct());
  readonly products = this.service.products;

  ngOnInit(): void { this.authenticated.set(sessionStorage.getItem('loqta-admin') === 'true'); }
  login(): void { if (this.password() === 'lokta2024') { sessionStorage.setItem('loqta-admin', 'true'); this.authenticated.set(true); } }
  logout(): void { sessionStorage.removeItem('loqta-admin'); this.authenticated.set(false); }
  startNew(): void { this.editing.set(null); this.draft.set(this.emptyProduct()); }
  edit(product: Product): void { this.editing.set(product); this.draft.set({ ...product, sizes: [...product.sizes], colors: [...product.colors], images: [...product.images] }); }
  save(): void { const product = this.draft(); this.service.save({ ...product, id: product.id || `product-${Date.now()}`, sizes: this.csv(product.sizes), colors: this.csv(product.colors), images: this.csv(product.images) }); this.startNew(); }
  remove(id: string): void { this.service.remove(id); }
  updateField<K extends keyof Product>(key: K, value: Product[K]): void { this.draft.set({ ...this.draft(), [key]: value }); }
  private csv(value: string[]): string[] { return value.flatMap(item => item.split(',')).map(item => item.trim()).filter(Boolean); }
  private emptyProduct(): Product { return { id: '', title: '', category: 'بناتي' as ProductCategory, price: 0, sizes: [], colors: [], images: [], description: '', inStock: true }; }
}
