import { TestBed } from '@angular/core/testing';
import { ImageService } from './image.service';

describe('Product image uploads', () => {
  const service = (): ImageService => TestBed.inject(ImageService);

  beforeEach(() => TestBed.resetTestingModule());

  const picture = async (width: number, height: number): Promise<File> => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#f45c35';
    context.fillRect(0, 0, width, height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    return new File([blob!], 'photo.png', { type: 'image/png' });
  };

  const size = async (image: string): Promise<{ width: number; height: number }> =>
    new Promise(resolve => {
      const element = new Image();
      element.onload = () => resolve({ width: element.width, height: element.height });
      element.src = image;
    });

  it('stores a picked photo as a jpeg data url', async () => {
    const image = await service().toStoredImage(await picture(400, 500));
    expect(image.startsWith('data:image/jpeg;base64,')).toBeTrue();
    expect(await size(image)).toEqual({ width: 400, height: 500 });
  });

  it('shrinks oversized photos to the gallery size and keeps their shape', async () => {
    const image = await service().toStoredImage(await picture(3000, 2000));
    const { width, height } = await size(image);
    expect(width).toBe(1100);
    expect(height).toBe(733);
  });

  it('refuses files that are not images', async () => {
    const note = new File(['not a photo'], 'notes.txt', { type: 'text/plain' });
    await expectAsync(service().toStoredImage(note)).toBeRejectedWithError('«notes.txt» مش صورة.');
  });

  it('refuses images heavier than the upload limit', async () => {
    const heavy = new File([new Uint8Array(9 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' });
    await expectAsync(service().toStoredImage(heavy)).toBeRejectedWithError('«huge.jpg» أكبر من 8 ميجا.');
  });
});
