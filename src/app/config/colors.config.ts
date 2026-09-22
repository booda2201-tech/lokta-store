export interface ColorChoice {
  name: string;
  hex: string;
}

// The studio picks from these instead of typing hex codes; the name is what shoppers read.
export const COLOR_PALETTE: ColorChoice[] = [
  { name: 'أبيض', hex: '#ffffff' },
  { name: 'أوف وايت', hex: '#f8f5ef' },
  { name: 'بيج', hex: '#e8d9c5' },
  { name: 'بمبي هادي', hex: '#f5c9d6' },
  { name: 'مرجاني', hex: '#f0785f' },
  { name: 'أحمر', hex: '#d64545' },
  { name: 'نبيتي هادي', hex: '#8e5264' },
  { name: 'أصفر ليموني', hex: '#f6cf71' },
  { name: 'برتقالي', hex: '#f59e4b' },
  { name: 'أخضر فاتح', hex: '#a8d5ba' },
  { name: 'أخضر زيتي', hex: '#6f7d5a' },
  { name: 'أزرق سماوي', hex: '#cfe8e3' },
  { name: 'لبني', hex: '#cbdcf4' },
  { name: 'أزرق', hex: '#6f9fd8' },
  { name: 'كحلي', hex: '#202d47' },
  { name: 'رمادي', hex: '#9aa0a6' },
  { name: 'بني غامق', hex: '#5a4632' },
  { name: 'أسود', hex: '#25231f' }
];

export const DEFAULT_CUSTOM_COLOR = '#f0785f';
