import { Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AnimationService } from './services/animation.service';
import { gsap } from 'gsap';
import { ProductService } from './services/product.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {
  private readonly animations = inject(AnimationService);
  readonly productService = inject(ProductService);
  readonly activeTab = signal('home');
  readonly tabMessage = signal('');
  @ViewChild('routeShell') private routeShell?: ElementRef<HTMLElement>;
  private routeContext?: gsap.Context;

  routeActivated(): void {
    window.setTimeout(() => {
      this.routeContext?.revert();
      if (this.routeShell) this.routeContext = this.animations.routeEnter(this.routeShell);
    });
  }

  selectTab(tab: 'home' | 'sections' | 'cart' | 'favorites'): void {
    this.activeTab.set(tab);
    this.productService.favoritesOnly.set(tab === 'favorites');
    if (tab === 'cart') this.showTabMessage(this.productService.cartCount() ? `عندك ${this.productService.cartCount()} قطعة في السلة` : 'السلة لسه فاضية');
    window.setTimeout(() => tab === 'home'
      ? window.scrollTo({ top: 0, behavior: 'smooth' })
      : document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  private showTabMessage(message: string): void {
    this.tabMessage.set(message);
    window.setTimeout(() => this.tabMessage.set(''), 2200);
  }

  ngOnDestroy(): void { this.routeContext?.revert(); }
}
