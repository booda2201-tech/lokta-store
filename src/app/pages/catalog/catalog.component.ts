import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Product, ProductCategory } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { AnimationService } from '../../services/animation.service';
import { IconComponent } from '../../shared/icon.component';
import { SelectComponent } from '../../shared/select.component';
import { gsap } from 'gsap';
@Component({selector:'app-catalog',standalone:true,imports:[CommonModule,FormsModule,RouterLink,IconComponent,SelectComponent],templateUrl:'./catalog.component.html',styleUrls:['./catalog.component.scss']})
export class CatalogComponent implements AfterViewInit, OnDestroy {
 readonly productService = inject(ProductService);
 private readonly animations = inject(AnimationService);
 @ViewChild('heroSection') private heroSection?: ElementRef<HTMLElement>;
 @ViewChild('productGrid') private productGrid?: ElementRef<HTMLElement>;
 @ViewChild('catalogRoot') private catalogRoot?: ElementRef<HTMLElement>;
 private heroContext?: gsap.Context;
 private gridContext?: gsap.Context;
 private revealContext?: gsap.Context;
 private gridTimer?: number;
 private toastTimer?: number;
 readonly search = signal(''); readonly category = signal<'الكل'|ProductCategory>('الكل'); readonly size = signal('كل المقاسات'); readonly sort = signal('المميز');
 readonly categories: Array<'الكل'|ProductCategory> = ['الكل','بناتي','أولادي','بيبي'];
 readonly sizes = ['كل المقاسات','من 0 لـ 3 شهور','من 3 لـ 6 شهور','من 6 لـ 12 شهر','من سنة لسنتين','سنتين','4 سنين','6 سنين','8 سنين','10 سنين'];
 readonly sortOptions = ['المميز','السعر: الأقل أولاً','السعر: الأعلى أولاً'];
 readonly addedProductId = signal('');
 readonly toast = signal('');
 readonly collections = [
  {name:'بناتي' as ProductCategory, caption:'كل يوم حكاية جديدة', label:'GIRLS CLUB', image:'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?auto=format&fit=crop&w=650&q=85', theme:'pink', symbol:'✿'},
  {name:'أولادي' as ProductCategory, caption:'جاهزين لأي مغامرة', label:'LITTLE EXPLORERS', image:'https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=650&q=85', theme:'blue', symbol:'↗'},
  {name:'بيبي' as ProductCategory, caption:'أول ضحكة، أول لقطة', label:'TINY BEGINNINGS', image:'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=650&q=85', theme:'yellow', symbol:'☀'}
 ];
 get filteredProducts(): Product[] {
  const query=this.search().trim().toLowerCase();
  return this.productService.activeProducts().filter(p => (!query || `${p.title} ${p.category}`.toLowerCase().includes(query)) && (this.category()==='الكل'||p.category===this.category()) && (this.size()==='كل المقاسات'||p.sizes.includes(this.size())) && (!this.productService.favoritesOnly()||this.isFavorite(p))).sort((a,b)=>this.sort()==='السعر: الأقل أولاً'?a.price-b.price:this.sort()==='السعر: الأعلى أولاً'?b.price-a.price:Number(b.featured)-Number(a.featured));
 }
 setSearch(value:string):void {this.search.set(value);this.animateGridSoon();}
 setCategory(value:'الكل'|ProductCategory):void {this.category.set(value);this.animateGridSoon();}
 setSize(value:string):void {this.size.set(value);this.animateGridSoon();}
 setSort(value:string):void {this.sort.set(value);this.animateGridSoon();}
 discover(category:'الكل'|ProductCategory='الكل'):void {this.productService.favoritesOnly.set(false);this.setCategory(category);document.getElementById('shop')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
 resetFilters():void {this.search.set('');this.category.set('الكل');this.size.set('كل المقاسات');this.productService.favoritesOnly.set(false);this.animateGridSoon();}
 cardEnter(card:HTMLElement):void {this.animations.hoverCard(card,true);}
 cardLeave(card:HTMLElement):void {this.animations.hoverCard(card,false);}
 addToCart(product:Product):void {this.productService.addToCart(product.id);this.addedProductId.set(product.id);this.notify('لقطة حلوة! اتضافت للشنطة');}
 toggleFavorite(product:Product):void {this.productService.toggleFavorite(product.id);this.notify(this.isFavorite(product)?'اتحفظت في لقطاتك المفضلة':'اتشالت من المفضلة');}
 isFavorite(product:Product):boolean {return this.productService.favoriteIds().includes(product.id);}
 private notify(message:string):void {window.clearTimeout(this.toastTimer);this.toast.set(message);this.toastTimer=window.setTimeout(()=>{this.toast.set('');this.addedProductId.set('');},2300);}
 trackProduct(_index:number,product:Product):string {return product.id;}
 ngAfterViewInit():void {if(this.heroSection)this.heroContext=this.animations.createHero(this.heroSection);if(this.catalogRoot)this.revealContext=this.animations.revealSections(this.catalogRoot);this.animateGridSoon();}
 private animateGridSoon():void {window.clearTimeout(this.gridTimer);this.gridTimer=window.setTimeout(()=>{this.gridContext?.revert();if(this.productGrid)this.gridContext=this.animations.animateGrid(this.productGrid);});}
 ngOnDestroy():void {window.clearTimeout(this.gridTimer);window.clearTimeout(this.toastTimer);this.heroContext?.revert();this.gridContext?.revert();this.revealContext?.revert();this.animations.clearInteractions();}
}
