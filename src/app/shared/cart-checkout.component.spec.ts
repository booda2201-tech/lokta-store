import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CartCheckoutComponent } from './cart-checkout.component';
import { ProductService } from '../services/product.service';
import { CartLine } from '../models/product.model';

describe('Cart order submission', () => {
  let component: CartCheckoutComponent;
  let http: HttpTestingController;
  let cart: { cartLines: () => CartLine[]; clearCart: jasmine.Spy };

  const line = (id: string, title: string, price: number, quantity: number): CartLine => ({
    id, size: 'M', color: 'وردي', quantity, total: price * quantity,
    product: { id, title, category: 'بناتي', price, sizes: ['M'], colors: ['#f0785f'], colorNames: ['وردي'], images: [`https://example.com/${id}.jpg`], description: '', inStock: true }
  });

  beforeEach(() => {
    cart = { cartLines: () => [line('fustan', 'فستان', 690, 2), line('romper', 'رومبر', 460, 1)], clearCart: jasmine.createSpy('clearCart') };
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: ProductService, useValue: cart }]
    });
    component = TestBed.runInInjectionContext(() => new CartCheckoutComponent());
    http = TestBed.inject(HttpTestingController);
    component.orderForm.set({ name: ' Test ', phone: '01000000000', address: 'Cairo', notes: 'Test note' });
  });

  afterEach(() => http.verify());

  it('sends every cart line in a single request, then empties the cart', () => {
    const ordered = spyOn(component.ordered, 'emit');
    component.submitOrder();
    component.submitOrder();
    const request = http.expectOne('/api/send-order');
    expect(request.request.body).toEqual({
      customerName: 'Test', phone: '01000000000', address: 'Cairo', notes: 'Test note',
      items: [
        { productTitle: 'فستان', size: 'M', color: 'وردي', price: 690, quantity: 2, image: 'https://example.com/fustan.jpg' },
        { productTitle: 'رومبر', size: 'M', color: 'وردي', price: 460, quantity: 1, image: 'https://example.com/romper.jpg' }
      ]
    });
    expect(cart.clearCart).not.toHaveBeenCalled();
    request.flush({ success: true, message: 'Order sent successfully' });
    expect(cart.clearCart).toHaveBeenCalledTimes(1);
    expect(ordered).toHaveBeenCalledTimes(1);
    expect(component.orderForm().name).toBe('');
  });

  it('sends a photo uploaded into the catalogue along with its line', () => {
    const uploaded = line('fustan', 'فستان', 690, 2);
    uploaded.product.images = ['data:image/jpeg;base64,' + 'A'.repeat(20000)];
    cart.cartLines = () => [uploaded];
    component.submitOrder();
    const body = http.expectOne('/api/send-order').request.body as { items: { image?: string }[] };
    expect(body.items[0].image).toBe(uploaded.product.images[0]);
  });

  it('leaves the photos off the baskets Telegram cannot fit in one album', () => {
    cart.cartLines = () => Array.from({ length: 12 }, (_, index) => line(`piece-${index}`, `قطعة ${index}`, 100, 1));
    component.submitOrder();
    const body = http.expectOne('/api/send-order').request.body as { items: { image?: string }[] };
    expect(body.items.length).toBe(12);
    expect(body.items.filter(item => item.image).length).toBe(10);
    expect(body.items[10].image).toBeUndefined();
  });

  it('keeps the cart and the details for retry after delivery fails', () => {
    component.submitOrder();
    http.expectOne('/api/send-order').flush({}, { status: 502, statusText: 'Bad Gateway' });
    expect(cart.clearCart).not.toHaveBeenCalled();
    expect(component.orderError()).toBeTruthy();
    expect(component.orderSubmitting()).toBeFalse();
    expect(component.orderForm().address).toBe('Cairo');
    component.submitOrder();
    http.expectOne('/api/send-order').flush({ success: true, message: 'Order sent successfully' });
    expect(cart.clearCart).toHaveBeenCalledTimes(1);
  });

  it('does not submit incomplete details or an empty cart', () => {
    component.updateOrderField('phone', ' ');
    component.submitOrder();
    expect(component.orderError()).toBeTruthy();
    component.updateOrderField('phone', '01000000000');
    cart.cartLines = () => [];
    component.submitOrder();
    http.expectNone('/api/send-order');
  });

  it('reports an unavailable order service without closing', () => {
    const ordered = spyOn(component.ordered, 'emit');
    component.submitOrder();
    http.expectOne('/api/send-order').flush({}, { status: 503, statusText: 'Service unavailable' });
    expect(component.orderError()).toBe('خدمة الطلبات غير متاحة حالياً. يرجى المحاولة لاحقاً.');
    expect(ordered).not.toHaveBeenCalled();
  });
});
