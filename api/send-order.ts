import type { VercelRequest, VercelResponse } from '@vercel/node';

const textFields = ['customerName', 'phone', 'address', 'productTitle', 'size', 'color', 'notes'] as const;
const MAX_ITEMS = 30;
const MAX_ITEM_QUANTITY = 99;
// Telegram shows ten pictures per album and refuses uploads heavier than ten megabytes.
const MAX_PHOTOS = 10;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const CAPTION_LIMIT = 1024;

interface OrderItem { productTitle?: string; size?: string; color?: string; price: number; quantity: number; image?: string; }
interface Upload { blob: Blob; name: string; }

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isOrderItem(item: unknown): item is OrderItem {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const { productTitle, size, color, price, quantity, image } = item as Record<string, unknown>;
  return [productTitle, size, color, image].every(value => value == null || typeof value === 'string')
    && typeof price === 'number' && Number.isFinite(price) && price >= 0
    && typeof quantity === 'number' && Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_ITEM_QUANTITY;
}

// A picture uploaded into the catalogue travels as a data url, which Telegram cannot fetch by
// link, so it is decoded here and uploaded as a file instead. Hosted pictures still go by link.
function toUpload(photo: string): Upload | undefined {
  const match = /^data:(image\/[a-z0-9+.-]+);base64,([a-z0-9+/=\s]+)$/i.exec(photo);
  if (!match) return undefined;
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) return undefined;
  return { blob: new Blob([bytes], { type: match[1] }), name: `photo.${match[1].split('/')[1].split('+')[0]}` };
}

function isUsablePhoto(photo: string): boolean {
  return /^https?:\/\//i.test(photo) || !!toUpload(photo);
}

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ success: false, message: 'Method Not Allowed' });
    return;
  }

  const order = request.body;
  if (!order || typeof order !== 'object' || Array.isArray(order)
    || textFields.some(field => order[field] != null && typeof order[field] !== 'string')
    || (order.price != null && (typeof order.price !== 'number' || !Number.isFinite(order.price) || order.price < 0))
    || (order.items != null && (!Array.isArray(order.items) || !order.items.length || order.items.length > MAX_ITEMS || !order.items.every(isOrderItem)))) {
    response.status(400).json({ success: false, message: 'بيانات الطلب غير صحيحة.' });
    return;
  }

  const { productImage, imageUrl, customerName, phone, address, productTitle, size, color, price, notes } = order;
  const items: OrderItem[] | undefined = order.items;
  const photo = (typeof productImage === 'string' && productImage.trim())
    || (typeof imageUrl === 'string' && imageUrl.trim()) || undefined;
  // A basket shows a picture per piece; a single order keeps the one picture it was sent.
  const photos = [...new Set([...(items?.map(item => item.image?.trim()) ?? []), photo])]
    .filter((value): value is string => !!value && isUsablePhoto(value))
    .slice(0, MAX_PHOTOS);
  const fallback = (value?: string | null): string => value?.trim() || 'غير محدد';
  const title = '🛍️ طلب جديد من لقطة!';
  const fields: Array<[string, string]> = [
    ['👤 العميل:', fallback(customerName)],
    ['📱 الهاتف:', fallback(phone)],
    ['📍 العنوان:', fallback(address)]
  ];
  if (items) {
    const pieces = items.reduce((sum, item) => sum + item.quantity, 0);
    fields.push(['🛒 الطلب:', `${items.length} منتج · إجمالي ${pieces} قطعة`]);
    items.forEach((item, index) => fields.push([`${index + 1}.`,
      `${fallback(item.productTitle)} — ${fallback(item.size)} · ${fallback(item.color)} · ×${item.quantity} · ${item.price * item.quantity} ج.م`]));
    fields.push(['💰 الإجمالي:', `${items.reduce((sum, item) => sum + item.price * item.quantity, 0)} ج.م`]);
  } else {
    fields.push(
      ['👗 المنتج:', fallback(productTitle)],
      ['📏 المقاس:', fallback(size)],
      ['🎨 اللون:', fallback(color)],
      ['💰 السعر:', `${price || 0} ج.م`]
    );
  }
  if (notes?.trim()) fields.push(['📝 ملاحظات:', notes.trim()]);

  // Telegram limits the message to 4096 characters after HTML entity parsing.
  const plainText = [title, ...fields.map(([label, value]) => `${label} ${value}`)].join('\n');
  if (plainText.length > 4096) {
    response.status(400).json({ success: false, message: 'تفاصيل الطلب أطول من الحد المسموح.' });
    return;
  }
  const text = [`<b>${title}</b>`, ...fields.map(([label, value]) => `<b>${label}</b> ${escapeHtml(value)}`)].join('\n');

  const token = process.env['TELEGRAM_BOT_TOKEN']?.trim();
  const chatId = process.env['TELEGRAM_CHAT_ID']?.trim();
  if (!token || !chatId) {
    response.status(503).json({
      success: false,
      code: 'ORDER_SERVICE_UNAVAILABLE',
      message: 'خدمة الطلبات غير متاحة حالياً. يرجى المحاولة لاحقاً.'
    });
    return;
  }

  const call = async (method: string, body: BodyInit, headers?: Record<string, string>): Promise<boolean> => {
    try {
      const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(20000),
        body
      });
      const result = await telegramResponse.json() as { ok?: boolean } | null;
      return telegramResponse.ok && result?.ok === true;
    } catch {
      // Do not expose the request URL: it contains the bot token.
      return false;
    }
  };

  const send = (method: 'sendPhoto' | 'sendMessage', payload: Record<string, string>): Promise<boolean> =>
    call(method, JSON.stringify({ chat_id: chatId, parse_mode: 'HTML', ...payload }), { 'Content-Type': 'application/json' });

  const sendUpload = (upload: Upload, caption: string): Promise<boolean> => {
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('parse_mode', 'HTML');
    form.append('caption', caption);
    form.append('photo', upload.blob, upload.name);
    return call('sendPhoto', form);
  };

  // Several pictures arrive as one album, with the order details as the caption of the first.
  const sendAlbum = (album: string[], caption: string): Promise<boolean> => {
    const form = new FormData();
    form.append('chat_id', chatId);
    const media = album.map((item, index) => {
      const upload = toUpload(item);
      if (upload) form.append(`photo${index}`, upload.blob, upload.name);
      return {
        type: 'photo',
        media: upload ? `attach://photo${index}` : item,
        ...(index === 0 ? { caption, parse_mode: 'HTML' } : {})
      };
    });
    form.append('media', JSON.stringify(media));
    return call('sendMediaGroup', form);
  };

  const sendPhotos = (album: string[], caption: string): Promise<boolean> => {
    if (album.length > 1) return sendAlbum(album, caption);
    const upload = toUpload(album[0]);
    return upload ? sendUpload(upload, caption) : send('sendPhoto', { photo: album[0], caption });
  };

  // Longer orders use text so no details are lost to Telegram's 1024-character caption limit.
  const photoSent = photos.length && plainText.length <= CAPTION_LIMIT ? await sendPhotos(photos, text) : false;
  if (photoSent || await send('sendMessage', { text })) {
    response.status(200).json({ success: true, message: 'Order sent successfully' });
  } else {
    response.status(502).json({ success: false, message: 'تعذر إرسال الطلب حالياً.' });
  }
}
