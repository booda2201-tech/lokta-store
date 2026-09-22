import { Component, EventEmitter, HostListener, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { OrderData, OrderItem } from '../models/order.model';
import { OrderService } from '../services/order.service';
import { ProductService } from '../services/product.service';
import { IconComponent } from './icon.component';
import { DialogDirective } from './dialog.directive';

const MAX_ORDER_PHOTOS = 10;
@Component({selector:'app-cart-checkout',standalone:true,imports:[CommonModule,FormsModule,IconComponent,DialogDirective],templateUrl:'./cart-checkout.component.html',styleUrls:['./cart-checkout.component.scss']})
export class CartCheckoutComponent {
 readonly productService = inject(ProductService);
 private readonly orderService = inject(OrderService);
 @Output() readonly closed = new EventEmitter<void>();
 @Output() readonly ordered = new EventEmitter<void>();
 readonly orderForm = signal({ name: '', phone: '', address: '', notes: '' });
 readonly orderError = signal('');
 readonly orderSubmitting = signal(false);

 updateOrderField(field: 'name'|'phone'|'address'|'notes', value: string): void {
  this.orderForm.set({ ...this.orderForm(), [field]: value });
 }

 @HostListener('document:keydown.escape') close(): void { if(!this.orderSubmitting()) this.closed.emit(); }

 submitOrder(): void {
  const details = this.orderForm();
  if(!details.name.trim() || !details.phone.trim() || !details.address.trim()) {
   this.orderError.set('اكتب الاسم ورقم الموبايل والعنوان عشان نقدر نجهز طلبك.');
   return;
  }
  const lines = this.productService.cartLines();
  if(!lines.length || this.orderSubmitting()) return;
  const order: OrderData = {
   customerName: details.name.trim(),
   phone: details.phone.trim(),
   address: details.address.trim(),
   notes: details.notes.trim(),
   // Telegram shows ten pictures per album, so a heavier basket travels without the extras.
   items: lines.map((line, index) => {
    const item: OrderItem = { productTitle: line.product.title, size: line.size, color: line.color, price: line.product.price, quantity: line.quantity };
    const image = index < MAX_ORDER_PHOTOS ? line.product.images[0] : undefined;
    return image ? { ...item, image } : item;
   })
  };
  this.orderSubmitting.set(true);
  this.orderError.set('');
  this.orderService.submitOrder(order).subscribe({
   next: () => {
    this.productService.clearCart();
    this.orderForm.set({ name: '', phone: '', address: '', notes: '' });
    this.ordered.emit();
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
}
