import { Component, ElementRef, EventEmitter, HostBinding, HostListener, Input, OnDestroy, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';

@Component({
 selector: 'app-select',
 standalone: true,
 imports: [CommonModule, IconComponent],
 template: `<span *ngIf="caption" class="select-caption">{{caption}}</span>
<button type="button" class="select-trigger" [class.open]="open()" aria-haspopup="listbox" [attr.aria-expanded]="open()" [attr.aria-label]="label ? label + ': ' + value : null" (click)="toggle()"><span>{{value}}</span><app-icon name="chevron"/></button>
<div *ngIf="open()" class="select-menu" role="listbox" [attr.aria-label]="label">
 <button type="button" *ngFor="let option of options" role="option" [class.selected]="option===value" [attr.aria-selected]="option===value" (click)="choose(option)">{{option}}<app-icon *ngIf="option===value" name="check"/></button>
</div>`,
 styles: [`:host{position:relative;display:inline-flex;flex-direction:column;gap:6px;max-width:100%}
.select-caption{font-size:9px;font-weight:700;color:var(--muted)}
.select-trigger{display:inline-flex;align-items:center;gap:12px;max-width:100%;min-height:36px;border:1px solid var(--line);border-radius:99px;padding:8px 15px;background:white;font-size:11px;font-weight:700;color:var(--ink)}
.select-trigger span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.select-trigger app-icon{width:13px;height:13px;color:var(--muted);transition:transform .2s}
.select-trigger:hover{border-color:var(--ink)}
.select-trigger.open{border-color:var(--ink);box-shadow:0 0 0 3px #202d4714}
.select-trigger.open app-icon{transform:rotate(180deg)}
.select-menu{position:absolute;top:calc(100% + 7px);inset-inline-start:0;z-index:20;display:grid;gap:2px;min-width:max(100%,135px);max-height:260px;overflow:auto;scrollbar-width:none;padding:6px;background:var(--paper);border:1px solid var(--line);border-radius:16px;box-shadow:0 18px 44px #202d4722;animation:menu .18s ease-out}
.select-menu::-webkit-scrollbar{display:none}
.select-menu button{display:flex;align-items:center;justify-content:space-between;gap:14px;border:0;border-radius:11px;padding:9px 12px;background:transparent;font-size:11px;font-weight:600;text-align:start;white-space:nowrap}
.select-menu button:hover{background:var(--blue)}
.select-menu button.selected{background:var(--ink);color:var(--paper)}
.select-menu app-icon{width:13px;height:13px}
:host(.field){display:flex;width:100%}
:host(.field) .select-trigger{width:100%;justify-content:space-between;border-color:transparent;border-radius:11px;padding:12px;background:var(--paper);font-size:12px;font-weight:600;line-height:16px}
:host(.field) .select-menu{min-width:100%}
:host(.accent) .select-trigger{border-color:var(--orange);background:var(--orange);color:white}
:host(.accent) .select-trigger app-icon{color:#ffffffcc}
@keyframes menu{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
@media(max-width:720px){.select-trigger{min-height:42px;font-size:12px}.select-menu button{font-size:12px;padding:11px 12px}:host(.inline) .select-menu{position:static;box-shadow:none;max-height:none;animation:none}}`]
})
export class SelectComponent implements OnDestroy {
 private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
 @Input() options: string[] = [];
 @Input() value = '';
 @Input() caption = '';
 @Input() label = '';
 // Lists inside a scrolling panel drop in place instead of floating, so they never get clipped.
 @HostBinding('class.inline') @Input() inline = false;
 // Inside a form the trigger takes the shape of the neighbouring inputs instead of the pill shape.
 @HostBinding('class.field') @Input() field = false;
 @HostBinding('class.accent') @Input() accent = false;
 @Output() valueChange = new EventEmitter<string>();
 readonly open = signal(false);
 private timer?: number;
 // Capture phase: clicks inside the cart drawer are stopped before they reach the document.
 private readonly dismiss = (event: Event) => { if(!this.host.nativeElement.contains(event.target as Node)) this.open.set(false); };

 constructor() { document.addEventListener('pointerdown', this.dismiss, true); }

 toggle(): void {
  const opening = !this.open();
  this.open.set(opening);
  if(!opening) return;
  window.clearTimeout(this.timer);
  this.timer = window.setTimeout(() => this.host.nativeElement.querySelector('.select-menu')?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
 }

 choose(option: string): void { this.open.set(false); if(option !== this.value) this.valueChange.emit(option); }

 // Escape belongs to the list while it is open, so dialogs behind it stay put.
 @HostListener('keydown.escape', ['$event']) escape(event: Event): void {
  if(!this.open()) return;
  event.stopPropagation();
  this.open.set(false);
  this.host.nativeElement.querySelector<HTMLElement>('.select-trigger')?.focus();
 }

 ngOnDestroy(): void { document.removeEventListener('pointerdown', this.dismiss, true); window.clearTimeout(this.timer); }
}
