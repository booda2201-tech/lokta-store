import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Product } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { AnimationService } from '../../services/animation.service';
import { OrderService } from '../../services/order.service';
import { OrderData } from '../../models/order.model';
import { gsap } from 'gsap';
import { IconComponent } from '../../shared/icon.component';
import { DialogDirective } from '../../shared/dialog.directive';

@Component({
  selector: 'app-product-detail', standalone: true, imports: [CommonModule, FormsModule, RouterLink, IconComponent, DialogDirective],
  templateUrl: './product-detail.component.html', styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  readonly productService = inject(ProductService);
  private readonly animations = inject(AnimationService);
  private readonly orderService = inject(OrderService);
  @ViewChild('detailRoot') private detailRoot?: ElementRef<HTMLElement>;
  @ViewChild('gallery') private gallery?: ElementRef<HTMLElement>;
  @ViewChild('orderButton') private orderButton?: ElementRef<HTMLElement>;
  private detailContext?: gsap.Context;
  private pulseContext?: gsap.Context;
  private celebrationContext?: gsap.Context;
  private imageTween?: gsap.core.Tween;
  readonly zoomOpen = signal(false);
  readonly sizeGuideOpen = signal(false);
  private touchStart = 0;
  product?: Product;
  readonly selectedImage = signal(0);
  readonly selectedSize = signal('');
  readonly selectedColor = signal('');
  readonly orderOpen = signal(false);
  readonly orderForm = signal({ name: '', phone: '', address: '', notes: '' });
  readonly orderError = signal('');
  readonly orderSubmitted = signal(false);
  readonly orderSubmitting = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.product = this.productService.getById(id);
    if (this.product) {
      this.selectedSize.set(this.product.sizes[0]);
      this.selectedColor.set(this.product.colorNames?.[0] ?? this.product.colors[0]);
    }
  }

  ngAfterViewInit(): void {
    if (this.detailRoot) this.detailContext = this.animations.routeEnter(this.detailRoot);
    if (this.detailRoot && this.orderButton) this.pulseContext = this.animations.pulseButton(this.detailRoot, this.orderButton.nativeElement);
  }

  selectImage(index: number): void {
    this.imageTween?.kill();
    const image = this.gallery?.nativeElement.querySelector('.main-product-image');
    if (!image || this.animations.reduced) {
      this.selectedImage.set(index);
      return;
    }
    this.selectedImage.set(index);
    this.imageTween = gsap.fromTo(image, { opacity: .4, scale: 1.025 }, { opacity: 1, scale: 1, duration: .35, clearProps: 'opacity,transform' });
  }

  swipeStart(event: TouchEvent): void { this.touchStart = event.changedTouches[0].clientX; }
  swipeEnd(event: TouchEvent): void {
    if (!this.product) return;
    const delta = event.changedTouches[0].clientX - this.touchStart;
    if (Math.abs(delta) > 50) this.selectImage((this.selectedImage() + (delta > 0 ? 1 : -1) + this.product.images.length) % this.product.images.length);
  }
  @HostListener('document:keydown.escape') escape(): void { this.closeOrder(); this.zoomOpen.set(false); }
  toggleFavorite(): void { if (this.product) this.productService.toggleFavorite(this.product.id); }
  get isFavorite(): boolean { return !!this.product && this.productService.favoriteIds().includes(this.product.id); }

  selectColor(index: number): void {
    if (this.product) this.selectedColor.set(this.product.colorNames?.[index] ?? this.product.colors[index]);
  }

  updateOrderField(field: 'name' | 'phone' | 'address' | 'notes', value: string): void {
    this.orderForm.set({ ...this.orderForm(), [field]: value });
  }

  openOrder(): void {
    this.orderError.set('');
    this.orderSubmitted.set(false);
    this.orderOpen.set(true);
  }

  closeOrder(): void {
    if (!this.orderSubmitting()) this.orderOpen.set(false);
  }

  submitOrder(): void {
    const details = this.orderForm();
    if (!details.name.trim() || !details.phone.trim() || !details.address.trim()) {
      this.orderError.set('اكتب الاسم ورقم الموبايل والعنوان عشان نقدر نجهز طلبك.');
      return;
    }
    if (!this.product || this.orderSubmitting()) return;
    const order: OrderData = {
      customerName: details.name.trim(),
      phone: details.phone.trim(),
      address: details.address.trim(),
      productTitle: this.product.title,
      productImage: this.product.images[this.selectedImage()] || this.product.images[0],
      size: this.selectedSize(),
      color: this.selectedColor(),
      price: this.product.price,
      notes: details.notes.trim()
    };
    this.orderSubmitting.set(true);
    this.orderError.set('');
    this.orderService.submitOrder(order).subscribe({
      next: () => {
        this.orderSubmitted.set(true);
        this.orderOpen.set(false);
        this.orderForm.set({ name: '', phone: '', address: '', notes: '' });
      },
      error: (error: HttpErrorResponse) => {
        const serviceUnavailable = error.status === 503 || error.status === 504 || error.status === 0;
        this.orderError.set(serviceUnavailable
          ? 'خدمة الطلبات غير متاحة حالياً. يرجى المحاولة لاحقاً.'
          : 'حصلت مشكلة أثناء إرسال الطلب. حاول تاني لو سمحت.');
        this.orderSubmitting.set(false);
      },
      complete: () => this.orderSubmitting.set(false)
    });
  }

  celebrateOrder(): void {
    if (this.orderButton) {
      this.celebrationContext?.revert();
      this.celebrationContext = this.animations.celebrate(this.orderButton.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.imageTween?.kill();
    this.detailContext?.revert();
    this.pulseContext?.revert();
    this.celebrationContext?.revert();
  }

}
