import type { VercelRequest, VercelResponse } from '@vercel/node';

const textFields = ['customerName', 'phone', 'address', 'productTitle', 'size', 'color', 'notes'] as const;

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
    || (order.price != null && (typeof order.price !== 'number' || !Number.isFinite(order.price) || order.price < 0))) {
    response.status(400).json({ success: false, message: 'بيانات الطلب غير صحيحة.' });
    return;
  }

  const { productImage, imageUrl, customerName, phone, address, productTitle, size, color, price, notes } = order;
  const photo = (typeof productImage === 'string' && productImage.trim())
    || (typeof imageUrl === 'string' && imageUrl.trim()) || undefined;
  const fallback = (value?: string | null): string => value?.trim() || 'غير محدد';
  const title = '🛍️ طلب جديد من لقطة!';
  const fields: Array<[string, string]> = [
    ['👤 العميل:', fallback(customerName)],
    ['📱 الهاتف:', fallback(phone)],
    ['📍 العنوان:', fallback(address)],
    ['👗 المنتج:', fallback(productTitle)],
    ['📏 المقاس:', fallback(size)],
    ['🎨 اللون:', fallback(color)],
    ['💰 السعر:', `${price || 0} ج.م`]
  ];
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

  const send = async (method: 'sendPhoto' | 'sendMessage', payload: Record<string, string>): Promise<boolean> => {
    try {
      const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ chat_id: chatId, parse_mode: 'HTML', ...payload })
      });
      const result = await telegramResponse.json() as { ok?: boolean } | null;
      return telegramResponse.ok && result?.ok === true;
    } catch {
      // Do not expose the request URL: it contains the bot token.
      return false;
    }
  };

  // Longer orders use text so no details are lost to Telegram's 1024-character caption limit.
  const photoSent = photo && plainText.length <= 1024
    ? await send('sendPhoto', { photo, caption: text }) : false;
  if (photoSent || await send('sendMessage', { text })) {
    response.status(200).json({ success: true, message: 'Order sent successfully' });
  } else {
    response.status(502).json({ success: false, message: 'تعذر إرسال الطلب حالياً.' });
  }
}
