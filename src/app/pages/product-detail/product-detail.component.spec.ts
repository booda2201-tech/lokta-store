import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ProductDetailComponent } from './product-detail.component';
import { ProductService } from '../../services/product.service';
import { AnimationService } from '../../services/animation.service';

describe('Product order submission', () => {
  let component: ProductDetailComponent;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'test' }) } } },
        { provide: ProductService, useValue: { getById: () => ({ title: 'قميص', price: 500, sizes: ['M'], colors: ['Pink'], images: ['https://example.com/first.jpg', 'https://example.com/second.jpg'] }) } },
        { provide: AnimationService, useValue: {} }
      ]
    });
    component = TestBed.runInInjectionContext(() => new ProductDetailComponent());
    http = TestBed.inject(HttpTestingController);
    component.ngOnInit();
    component.openOrder();
    component.orderForm.set({ name: ' Test ', phone: '01000000000', address: 'Cairo', notes: 'Test note' });
  });

  afterEach(() => http.verify());

  it('posts details once, waits for success, then closes the modal and shows notification', () => {
    component.selectedImage.set(1);
    component.submitOrder();
    component.submitOrder();
    const request = http.expectOne('/api/send-order');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ customerName: 'Test', phone: '01000000000', address: 'Cairo', productTitle: 'قميص', productImage: 'https://example.com/second.jpg', size: 'M', color: 'Pink', price: 500, notes: 'Test note' });
    component.closeOrder();
    expect(component.orderOpen()).toBeTrue();
    expect(component.orderSubmitted()).toBeFalse();
    request.flush({ success: true, message: 'Order sent successfully' });
    expect(component.orderOpen()).toBeFalse();
    expect(component.orderSubmitted()).toBeTrue();
    expect(component.orderSubmitting()).toBeFalse();
    expect(component.orderForm().name).toBe('');
  });

  it('preserves details and allows retry after delivery fails', () => {
    component.submitOrder();
    http.expectOne('/api/send-order').flush({}, { status: 502, statusText: 'Bad Gateway' });
    expect(component.orderOpen()).toBeTrue();
    expect(component.orderSubmitted()).toBeFalse();
    expect(component.orderSubmitting()).toBeFalse();
    expect(component.orderError()).toBeTruthy();
    expect(component.orderForm().address).toBe('Cairo');
    component.submitOrder();
    http.expectOne('/api/send-order').flush({ success: true, message: 'Order sent successfully' });
    expect(component.orderSubmitted()).toBeTrue();
  });

  it('does not submit incomplete customer details', () => {
    component.updateOrderField('name', ' ');
    component.submitOrder();
    http.expectNone('/api/send-order');
    expect(component.orderError()).toBeTruthy();
  });

  for (const status of [503, 504]) {
    it(`shows service unavailability for HTTP ${status} without clearing the order`, () => {
      component.submitOrder();
      http.expectOne('/api/send-order').flush({}, { status, statusText: 'Service unavailable' });
      expect(component.orderError()).toBe('خدمة الطلبات غير متاحة حالياً. يرجى المحاولة لاحقاً.');
      expect(component.orderOpen()).toBeTrue();
      expect(component.orderSubmitted()).toBeFalse();
      expect(component.orderSubmitting()).toBeFalse();
      expect(component.orderForm().address).toBe('Cairo');
    });
  }
});
