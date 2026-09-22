import { Component, ElementRef, HostListener, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { AnimationService } from './services/animation.service';
import { gsap } from 'gsap';
import { ProductService } from './services/product.service';
import { IconComponent } from './shared/icon.component';
import { DialogDirective } from './shared/dialog.directive';
import { CartCheckoutComponent } from './shared/cart-checkout.component';
import { FormsModule } from '@angular/forms';
import { SelectComponent } from './shared/select.component';
import { AdminService } from './services/admin.service';
@Component({selector:'app-root',standalone:true,imports:[CommonModule,FormsModule,RouterLink,RouterOutlet,IconComponent,DialogDirective,CartCheckoutComponent,SelectComponent],templateUrl:'./app.component.html',styleUrls:['./app.component.scss']})
export class AppComponent implements OnDestroy {
 private readonly animations = inject(AnimationService);
 private readonly router = inject(Router);
 readonly productService = inject(ProductService);
 readonly admin = inject(AdminService);
 readonly activeTab = signal('home');
 readonly adminRoute = signal(false);
 readonly cartOpen = signal(false);
 readonly checkoutOpen = signal(false);
 readonly cartOrderSent = signal(false);
 readonly adminPassword = signal('');
 readonly adminError = signal('');
 readonly adminSigningIn = signal(false);
 @ViewChild('routeShell') private routeShell?: ElementRef<HTMLElement>;
 private routeContext?: gsap.Context;
 private routeTimer?: number;
 private navigationTimer?: number;
 private readonly navigation = this.router.events.subscribe(event => { if(event instanceof NavigationEnd) this.adminRoute.set(event.urlAfterRedirects.startsWith('/admin')); });
 routeActivated(): void {
  this.cartOpen.set(false);
  this.checkoutOpen.set(false);
  window.clearTimeout(this.routeTimer);
  this.routeTimer = window.setTimeout(() => { this.routeContext?.revert(); if(this.routeShell) this.routeContext = this.animations.routeEnter(this.routeShell); });
 }
 async selectTab(tab: 'home'|'sections'|'cart'|'favorites'|'search'): Promise<void> {
  if(tab === 'cart') { this.cartOpen.set(true); return; }
  this.activeTab.set(tab);
  this.productService.favoritesOnly.set(tab === 'favorites');
  await this.router.navigate(['/'], { fragment: tab === 'home' ? undefined : 'shop' });
  window.clearTimeout(this.navigationTimer);
  this.navigationTimer = window.setTimeout(() => {
   if(tab === 'home') window.scrollTo({top:0,behavior:this.scrollBehavior});
   else {
    document.getElementById('shop')?.scrollIntoView({behavior:this.scrollBehavior,block:'start'});
    if(tab === 'search') document.getElementById('product-search')?.focus({preventScroll:true});
   }
  }, 60);
 }
 private get scrollBehavior(): ScrollBehavior { return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'; }
 // The logo keeps taking shoppers home; only the third quick tap reveals the studio login.
 tapLogo(): void {
  if(!this.admin.registerLogoTap()) return;
  this.adminPassword.set('');
  this.adminError.set('');
  if(this.admin.authenticated()) { this.admin.closeLogin(); void this.router.navigate(['/admin']); }
 }
 async submitAdminLogin(): Promise<void> {
  if(this.adminSigningIn()) return;
  this.adminSigningIn.set(true);
  const error = await this.admin.login(this.adminPassword());
  this.adminSigningIn.set(false);
  if(error) { this.adminError.set(error); return; }
  this.adminPassword.set('');
  this.adminError.set('');
  await this.router.navigate(['/admin']);
 }
 closeAdminLogin(): void { if(this.adminSigningIn()) return; this.adminPassword.set(''); this.adminError.set(''); this.admin.closeLogin(); }
 openCheckout(): void { if(this.productService.cartCount()) { this.cartOrderSent.set(false); this.checkoutOpen.set(true); } }
 cartOrdered(): void { this.checkoutOpen.set(false); this.cartOpen.set(false); this.cartOrderSent.set(true); }
 closeCart(): void { this.cartOpen.set(false); }
 // The checkout and the size lists close themselves on Escape, so the drawer stays open behind them.
 @HostListener('document:keydown.escape') escape(): void { if(this.admin.loginOpen()) { this.closeAdminLogin(); return; } if(!this.checkoutOpen()) this.closeCart(); }
 ngOnDestroy(): void { this.navigation.unsubscribe(); window.clearTimeout(this.navigationTimer); window.clearTimeout(this.routeTimer); this.routeContext?.revert(); }
}
