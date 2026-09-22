import { TestBed } from '@angular/core/testing';
import { ProductService } from './product.service';

describe('Cart persistence', () => {
  const cart = (): ProductService => TestBed.inject(ProductService);

  beforeEach(() => {
    localStorage.removeItem('loqta-products');
    localStorage.removeItem('lokta-cart');
    TestBed.resetTestingModule();
  });

  afterEach(() => localStorage.removeItem('lokta-cart'));

  it('restores saved selections on startup', () => {
    localStorage.setItem('lokta-cart', JSON.stringify([{ id: 'fustan-wardy', size: '6 سنين', color: 'أصفر ليموني', quantity: 3 }]));
    const lines = cart().cartLines();
    expect(lines.length).toBe(1);
    expect(lines[0].size).toBe('6 سنين');
    expect(lines[0].color).toBe('أصفر ليموني');
    expect(lines[0].total).toBe(lines[0].product.price * 3);
    expect(cart().cartCount()).toBe(3);
  });

  it('migrates carts saved as plain product ids', () => {
    localStorage.setItem('lokta-cart', JSON.stringify(['romper-soghayar', 'ghayr-mawgood']));
    const lines = cart().cartLines();
    expect(lines.map(line => line.id)).toEqual(['romper-soghayar']);
    expect(lines[0].size).toBe(lines[0].product.sizes[0]);
    expect(lines[0].quantity).toBe(1);
  });

  it('repairs unusable sizes, colours and quantities', () => {
    localStorage.setItem('lokta-cart', JSON.stringify([{ id: 'fustan-wardy', size: 'XXL', color: 'بمبي', quantity: 99 }]));
    const [line] = cart().cartLines();
    expect(line.size).toBe(line.product.sizes[0]);
    expect(line.color).toBe(line.product.colorNames?.[0] ?? line.product.colors[0]);
    expect(line.quantity).toBe(cart().maxQuantity);
  });

  it('adds, counts up and removes lines', () => {
    const service = cart();
    service.addToCart('fustan-wardy');
    service.addToCart('fustan-wardy');
    expect(service.cartLines().length).toBe(1);
    expect(service.cartCount()).toBe(2);
    service.setQuantity('fustan-wardy', 0);
    expect(service.cartCount()).toBe(1);
    service.addToCart('romper-soghayar', { size: 'من 6 لـ 12 شهر' });
    expect(service.cartLines()[1].size).toBe('من 6 لـ 12 شهر');
    expect(JSON.parse(localStorage.getItem('lokta-cart') || '[]').length).toBe(2);
    service.clearCart();
    expect(service.cartCount()).toBe(0);
  });
});
