import { Component, Input } from '@angular/core';
@Component({ selector: 'app-icon', standalone: true,
 template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="paths[name] || paths['star']"/></svg>`,
 styles: [':host{display:inline-flex;width:24px;height:24px;flex-shrink:0}svg{width:100%;height:100%}']
})
export class IconComponent {
 @Input() name = 'star';
 readonly paths: Record<string, string> = {
 home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
 search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
 heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
 bag: 'M5 7h14l2 14H3L5 7Zm3 1V6a4 4 0 0 1 8 0v2',
 grid: 'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',
 arrow: 'M19 12H5m7-7-7 7 7 7', close: 'm6 6 12 12M6 18 18 6', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', check: 'm5 12 4 4L19 6',
 chevron: 'm6 9 6 6 6-6',
 logout: 'M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5M10 8l-4 4 4 4M6 12h9',
 truck: 'M1 4h13v13H1ZM14 8h5l4 5v4h-9M8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0m12 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
 star: 'm12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z'
 };
}
