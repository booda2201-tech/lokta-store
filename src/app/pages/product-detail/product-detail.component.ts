import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Product } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { AnimationService } from '../../services/animation.service';
import { gsap } from 'gsap';
import { ORDER_CONFIG } from '../../config/order.config';

@Component({
  selector: 'app-product-detail', standalone: true, imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './product-detail.component.html', styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly animations = inject(AnimationService);
  @ViewChild('detailRoot') private detailRoot?: ElementRef<HTMLElement>;
  @ViewChild('gallery') private gallery?: ElementRef<HTMLElement>;
  @ViewChild('orderButton') private orderButton?: ElementRef<HTMLElement>;
  private detailContext?: gsap.Context;
  private pulseContext?: gsap.Context;
  private celebrationContext?: gsap.Context;
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
    gsap.from(this.detailRoot?.nativeElement.querySelectorAll('.detail-panel > *') ?? [], { y: 20, opacity: 0, duration: .65, stagger: .08, ease: 'back.out(1.2)' });
  }

  selectImage(index: number): void {
    const image = this.gallery?.nativeElement.querySelector('.main-product-image');
    if (!image) {
      this.selectedImage.set(index);
      return;
    }
    gsap.to(image, { opacity: 0, duration: .12, onComplete: () => { this.selectedImage.set(index); gsap.to(image, { opacity: 1, duration: .28 }); } });
  }

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

  closeOrder(): void { this.orderOpen.set(false); }

  submitOrder(): void {
    const details = this.orderForm();
    if (!details.name.trim() || !details.phone.trim() || !details.address.trim()) {
      this.orderError.set('اكتب الاسم ورقم الموبايل والعنوان عشان نقدر نجهز طلبك.');
      return;
    }
    if (!this.product || this.orderSubmitting()) return;
    if (!ORDER_CONFIG.webhookUrl) {
      this.orderError.set('رابط استقبال الطلبات لسه مش متضاف. ضيف رابط Make أو Zapier في order.config.ts.');
      return;
    }
    const order = {
      createdAt: new Date().toISOString(),
      source: 'متجر لقطة',
      product: this.product.title,
      category: this.product.category,
      size: this.selectedSize(),
      color: this.selectedColor(),
      price: this.product.price,
      customer: details
    };
    this.orderSubmitting.set(true);
    fetch(ORDER_CONFIG.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    }).then(async response => {
      const result = await response.json().catch(() => ({ message: 'تعذر استقبال الطلب حالياً.' }));
      if (!response.ok) throw new Error(result.message || 'تعذر استقبال الطلب حالياً.');
      this.orderSubmitted.set(true);
    }).catch(error => {
      this.orderError.set(error instanceof Error ? error.message : 'حصلت مشكلة أثناء إرسال الطلب.');
    }).finally(() => this.orderSubmitting.set(false));
  }

  celebrateOrder(): void {
    if (this.orderButton) {
      this.celebrationContext?.revert();
      this.celebrationContext = this.animations.celebrate(this.orderButton.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.detailContext?.revert();
    this.pulseContext?.revert();
    this.celebrationContext?.revert();
  }

  orderUrl(): string {
    if (!this.product) return '#';
    const details = this.orderForm();
    const message = [
      'طلب جديد من متجر لقطة',
      '--------------------',
      `المنتج: ${this.product.title}`,
      `القسم: ${this.product.category}`,
      `المقاس: ${this.selectedSize()}`,
      `اللون: ${this.selectedColor()}`,
      `السعر: ${this.product.price} ج.م`,
      '',
      `اسم العميل: ${details.name}`,
      `رقم الموبايل: ${details.phone}`,
      `العنوان: ${details.address}`,
      `ملاحظات: ${details.notes || 'لا يوجد'}`
    ].join('\n');
    return `https://wa.me/201127273643?text=${encodeURIComponent(message)}`;
  }
}
