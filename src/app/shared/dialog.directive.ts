import { AfterViewInit, Directive, ElementRef, HostListener, OnDestroy, inject } from '@angular/core';
@Directive({ selector: '[appDialog]', standalone: true })
export class DialogDirective implements AfterViewInit, OnDestroy {
 private readonly el: ElementRef<HTMLElement> = inject(ElementRef);
 private readonly previous = document.activeElement as HTMLElement | null;
 private readonly overflow = document.body.style.overflow;
 private timer?: number;
 ngAfterViewInit(): void { document.body.style.overflow = 'hidden'; this.timer = window.setTimeout(() => this.items()[0]?.focus()); }
 private items(): HTMLElement[] { return Array.from(this.el.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input,textarea,select,[tabindex="0"]')).filter(el => el.getClientRects().length > 0); }
 @HostListener('keydown', ['$event']) trap(event: KeyboardEvent): void {
  if(event.key !== 'Tab') return;
  const items = this.items(); const first = items[0]; const last = items[items.length - 1];
  if(event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  if(!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
 }
 ngOnDestroy(): void { window.clearTimeout(this.timer); document.body.style.overflow = this.overflow; if(this.previous?.isConnected) this.previous.focus(); }
}
