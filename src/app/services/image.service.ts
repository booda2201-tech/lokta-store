import { Injectable } from '@angular/core';

const MAX_DIMENSION = 1100;
const QUALITY = 0.82;
const MAX_FILE_SIZE = 8 * 1024 * 1024;

@Injectable({ providedIn: 'root' })
export class ImageService {
  // Phone photos are many times larger than the gallery shows them, so each upload is
  // redrawn at display size before it takes a share of the browser's storage budget.
  async toStoredImage(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error(`«${file.name}» مش صورة.`);
    if (file.size > MAX_FILE_SIZE) throw new Error(`«${file.name}» أكبر من 8 ميجا.`);
    const source = await this.load(file);
    try {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(source.width, source.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(source.width * scale);
      canvas.height = Math.round(source.height * scale);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('المتصفح مش بيدعم تحضير الصور.');
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', QUALITY);
    } finally {
      URL.revokeObjectURL(source.src);
    }
  }

  private load(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => { URL.revokeObjectURL(image.src); reject(new Error(`تعذر قراءة «${file.name}».`)); };
      image.src = URL.createObjectURL(file);
    });
  }
}
