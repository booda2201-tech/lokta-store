import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OrderService } from './order.service';
import { OrderData } from '../models/order.model';

describe('Combined orders', () => {
  let service: OrderService;
  let http: HttpTestingController;

  const basket: OrderData = {
    customerName: 'سارة', phone: '01000000000', address: 'القاهرة',
    productImage: 'https://example.com/fustan.jpg',
    items: [
      { productTitle: 'فستان', size: 'سنتين', color: 'مرجاني', price: 690, quantity: 2 },
      { productTitle: 'رومبر', size: 'من 6 لـ 12 شهر', color: 'أصفر ليموني', price: 460, quantity: 1 }
    ]
  };

  beforeEach(() => {
    localStorage.removeItem('loqta-orders');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(OrderService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('loqta-orders');
  });

  it('posts the whole basket as one order instead of a single line', () => {
    service.submitOrder(basket).subscribe();
    const body = http.expectOne('/api/send-order').request.body as OrderData;
    expect(body.items?.length).toBe(2);
    expect(body.productTitle).toBeUndefined();
    expect(service.pieces(body)).toBe(3);
    expect(service.total(body)).toBe(1840);
  });

  it('keeps every line of a sent basket for the studio, even before the reply lands', () => {
    service.submitOrder(basket).subscribe();
    http.expectOne('/api/send-order');
    const [stored] = service.orders();
    expect(stored.status).toBe('جديد');
    expect(stored.details.items).toEqual(basket.items);
    expect(JSON.parse(localStorage.getItem('loqta-orders') ?? '[]')[0].details.items.length).toBe(2);
  });

  it('sends catalogue uploads to the notifier but keeps them out of the studio copy', () => {
    const upload = 'data:image/jpeg;base64,' + 'A'.repeat(50000);
    const items = basket.items?.map(item => ({ ...item, image: upload }));
    service.submitOrder({ ...basket, productImage: upload, items }).subscribe();

    const body = http.expectOne('/api/send-order').request.body as OrderData;
    expect(body.productImage).toBe(upload);
    expect(body.items?.every(item => item.image === upload)).toBeTrue();

    const [stored] = service.orders();
    expect(stored.details.productImage).toBeUndefined();
    expect(stored.details.items?.some(item => item.image)).toBeFalse();
    expect(stored.details.items?.length).toBe(2);
    expect((localStorage.getItem('loqta-orders') ?? '').length).toBeLessThan(2000);
  });

  it('keeps hosted picture links in the studio copy', () => {
    const items = basket.items?.map(item => ({ ...item, image: 'https://example.com/piece.jpg' }));
    service.submitOrder({ ...basket, items }).subscribe();
    http.expectOne('/api/send-order');
    expect(service.orders()[0].details.items?.[0].image).toBe('https://example.com/piece.jpg');
  });
});
