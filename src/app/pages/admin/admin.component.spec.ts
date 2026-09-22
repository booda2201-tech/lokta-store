import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { registerLocaleData } from '@angular/common';
import arabic from '@angular/common/locales/ar';
import { AdminComponent } from './admin.component';
import { ProductService } from '../../services/product.service';

// The prices in the table run through the ar-EG number pipe, which main.ts feeds at startup.
registerLocaleData(arabic, 'ar-EG');

describe('Studio colour editor', () => {
  let fixture: ComponentFixture<AdminComponent>;
  let admin: AdminComponent;

  const nameInputs = (): HTMLInputElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.color-list input[type="text"]'));
  const swatch = (label: string): HTMLButtonElement =>
    fixture.nativeElement.querySelector(`.palette button[aria-label="${label}"]`);
  const type = (input: HTMLInputElement, value: string): void => {
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  // ngModel writes its value into the input on a microtask, so the DOM needs a beat to catch up.
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    localStorage.removeItem('loqta-products');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [AdminComponent, RouterTestingModule, HttpClientTestingModule] });
    fixture = TestBed.createComponent(AdminComponent);
    admin = fixture.componentInstance;
    fixture.detectChanges();
    admin.edit(TestBed.inject(ProductService).products()[0]);
    await settle();
  });

  afterEach(() => localStorage.removeItem('loqta-products'));

  it('pairs every shade with the name shoppers read', () => {
    expect(nameInputs().map(input => input.value)).toEqual(['مرجاني', 'أصفر ليموني']);
    expect(admin.colorRows().map(row => row.hex)).toEqual(['#f0785f', '#f6cf71']);
  });

  it('keeps a typed arabic name whole and keeps the cursor in place', () => {
    const input = nameInputs()[1];
    type(input, 'لبني ملوكي');
    expect(nameInputs()[1].value).toBe('لبني ملوكي');
    expect(document.activeElement).toBe(nameInputs()[1]);
    expect(admin.colorRows()[1]).toEqual({ hex: '#f6cf71', name: 'لبني ملوكي' });
  });

  it('adds a palette colour with its name already written, and takes it back off', async () => {
    swatch('لبني').click();
    await settle();
    expect(admin.colorRows().at(-1)).toEqual({ hex: '#cbdcf4', name: 'لبني' });
    expect(nameInputs().at(-1)?.value).toBe('لبني');
    expect(admin.isPicked('#cbdcf4')).toBeTrue();

    swatch('لبني').click();
    await settle();
    expect(admin.colorRows().length).toBe(2);
    expect(admin.isPicked('#cbdcf4')).toBeFalse();
  });

  it('refuses to save a shade nobody named', () => {
    admin.addCustomColor();
    admin.save();
    expect(admin.saveError()).toBe('اكتب اسم لكل لون زي «مرجاني»، عشان العميل يشوفه كده.');

    admin.removeColor(admin.colorRows().length - 1);
    admin.save();
    expect(admin.saveError()).toBe('');
  });

  it('stores the names on the product so the shop can label the swatches', () => {
    admin.updateColorName(0, ' مرجاني دافي ');
    admin.save();
    const service = TestBed.inject(ProductService);
    const saved = service.products()[0];
    expect(saved.colorNames).toEqual(['مرجاني دافي', 'أصفر ليموني']);
    expect(service.colorOptions(saved)).toEqual(['مرجاني دافي', 'أصفر ليموني']);
  });
});
