const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/send-order.ts').default;
const originalFetch = global.fetch;
const keys = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];
const originalEnv = Object.fromEntries(keys.map(key => [key, process.env[key]]));
beforeEach(() => {
  process.env.TELEGRAM_BOT_TOKEN = '123:test-token';
  process.env.TELEGRAM_CHAT_ID = '-100123';
});
afterEach(() => {
  global.fetch = originalFetch;
  for (const key of keys) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});
const order = { customerName: 'Test', phone: '01000000000', address: 'Test address', productTitle: 'Dress', size: 'M', color: 'Pink', price: 500, notes: 'Test note' };
async function call(body = order, method = 'POST') {
  const response = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  await handler({ method, body }, response);
  return response;
}
const accepted = () => ({ ok: true, json: async () => ({ ok: true, result: { message_id: 1 } }) });

test('rejects unsupported methods and malformed orders without delivery', async () => {
  global.fetch = () => { throw new Error('Must not send'); };
  const response = await call(order, 'GET');
  assert.equal(response.code, 405);
  assert.equal(response.headers.Allow, 'POST');
  for (const body of [null, [], 'invalid', { ...order, phone: 123 }, { ...order, price: -1 }, { ...order, price: Infinity }, { ...order, notes: {} }]) {
    assert.equal((await call(body)).code, 400);
  }
});
test('requires both Telegram environment variables', async () => {
  global.fetch = () => { throw new Error('Must not send'); };
  for (const key of keys) {
    const value = process.env[key];
    delete process.env[key];
    const response = await call();
    assert.equal(response.code, 503);
    assert.equal(response.body.code, 'ORDER_SERVICE_UNAVAILABLE');
    process.env[key] = value;
  }
});
test('posts the complete HTML message and returns the requested success JSON', async () => {
  let delivered = false;
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.telegram.org/bot123:test-token/sendMessage');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.ok(options.signal instanceof AbortSignal);
    assert.deepEqual(JSON.parse(options.body), {
      chat_id: '-100123', parse_mode: 'HTML',
      text: '<b>🛍️ طلب جديد من لقطة!</b>\n<b>👤 العميل:</b> Test\n<b>📱 الهاتف:</b> 01000000000\n<b>📍 العنوان:</b> Test address\n<b>👗 المنتج:</b> Dress\n<b>📏 المقاس:</b> M\n<b>🎨 اللون:</b> Pink\n<b>💰 السعر:</b> 500 ج.م\n<b>📝 ملاحظات:</b> Test note'
    });
    delivered = true;
    return accepted();
  };
  const response = await call();
  assert.equal(delivered, true);
  assert.equal(response.code, 200);
  assert.deepEqual(response.body, { success: true, message: 'Order sent successfully' });
});
test('uses Arabic defaults and zero price for omitted or empty fields', async () => {
  global.fetch = async (_, options) => {
    const { text } = JSON.parse(options.body);
    assert.equal((text.match(/غير محدد/g) || []).length, 6);
    assert.ok(text.endsWith('<b>💰 السعر:</b> 0 ج.م'));
    return accepted();
  };
  assert.equal((await call({})).code, 200);
  assert.equal((await call({ customerName: ' ', phone: null, price: 0 })).code, 200);
});
test('escapes customer text without escaping the message formatting', async () => {
  global.fetch = async (_, options) => {
    const { text } = JSON.parse(options.body);
    assert.ok(text.includes('<b>👤 العميل:</b> &lt;b&gt;A &amp; B&lt;/b&gt;'));
    assert.ok(text.includes('<b>📝 ملاحظات:</b> &lt;script&gt;'));
    return accepted();
  };
  assert.equal((await call({ ...order, customerName: '<b>A & B</b>', notes: '<script>' })).code, 200);
});
test('checks Telegram message length after entity parsing', async () => {
  let deliveries = 0;
  global.fetch = async () => { deliveries++; return accepted(); };
  assert.equal((await call({ ...order, address: '&'.repeat(2000) })).code, 200);
  assert.equal((await call({ ...order, address: 'x'.repeat(4096) })).code, 400);
  assert.equal(deliveries, 1);
});
test('does not report success on HTTP errors, API rejection, invalid JSON or network failures', async () => {
  for (const mock of [
    async () => ({ ok: false, json: async () => ({ ok: false }) }),
    async () => ({ ok: true, json: async () => ({ ok: false }) }),
    async () => ({ ok: true, json: async () => null }),
    async () => ({ ok: true, json: async () => { throw new Error('Invalid JSON'); } }),
    async () => { throw new Error('Network failure'); },
    async () => { throw new DOMException('Timed out', 'TimeoutError'); }
  ]) {
    global.fetch = mock;
    const response = await call();
    assert.equal(response.code, 502);
    assert.equal(response.body.success, false);
    assert.ok(!JSON.stringify(response.body).includes('test-token'));
  }
});

for (const field of ['productImage', 'imageUrl']) {
  test(`sends ${field} with an escaped HTML caption, without a second message`, async () => {
    let calls = 0;
    global.fetch = async (url, options) => {
      calls++;
      assert.ok(url.endsWith('/sendPhoto'));
      assert.equal(options.method, 'POST');
      const payload = JSON.parse(options.body);
      assert.equal(payload.chat_id, '-100123');
      assert.equal(payload.photo, 'https://example.com/product.jpg');
      assert.equal(payload.parse_mode, 'HTML');
      assert.ok(payload.caption.startsWith('<b>🛍️ طلب جديد من لقطة!</b>\n'));
      assert.ok(payload.caption.includes('<b>👤 العميل:</b> A &amp; &lt;B&gt;'));
      assert.ok(payload.caption.includes('<b>💰 السعر:</b> 500 ج.م'));
      assert.ok(payload.caption.endsWith('<b>📝 ملاحظات:</b> Test note'));
      assert.equal(payload.text, undefined);
      return accepted();
    };
    const response = await call({ ...order, customerName: 'A & <B>', [field]: 'https://example.com/product.jpg' });
    assert.equal(response.code, 200);
    assert.equal(calls, 1);
  });
}

test('falls back to the same order text on all photo delivery failures', async () => {
  for (const failure of [
    async () => ({ ok: false, json: async () => ({ ok: false }) }),
    async () => ({ ok: true, json: async () => ({ ok: false }) }),
    async () => ({ ok: true, json: async () => { throw new Error('Invalid JSON'); } }),
    async () => { throw new Error('Network failure'); },
    async () => { throw new DOMException('Timed out', 'TimeoutError'); }
  ]) {
    const calls = [];
    let caption;
    global.fetch = async (url, options) => {
      calls.push(url.split('/').pop());
      const payload = JSON.parse(options.body);
      if (calls.length === 1) {
        caption = payload.caption;
        return failure();
      }
      assert.equal(payload.text, caption);
      assert.equal(payload.parse_mode, 'HTML');
      assert.equal(payload.photo, undefined);
      return accepted();
    };
    assert.equal((await call({ ...order, productImage: 'https://example.com/product.jpg' })).code, 200);
    assert.deepEqual(calls, ['sendPhoto', 'sendMessage']);
  }
});

test('reports failure when both photo and text delivery fail', async () => {
  const methods = [];
  global.fetch = async url => { methods.push(url.split('/').pop()); return { ok: false, json: async () => ({ ok: false }) }; };
  const response = await call({ ...order, productImage: 'https://example.com/product.jpg' });
  assert.equal(response.code, 502);
  assert.equal(response.body.success, false);
  assert.deepEqual(methods, ['sendPhoto', 'sendMessage']);
});

test('sends complete long orders as text instead of truncating the photo caption', async () => {
  let calls = 0;
  global.fetch = async (url, options) => {
    calls++;
    assert.ok(url.endsWith('/sendMessage'));
    assert.ok(JSON.parse(options.body).text.includes('x'.repeat(1100)));
    return accepted();
  };
  assert.equal((await call({ ...order, productImage: 'https://example.com/product.jpg', address: 'x'.repeat(1100) })).code, 200);
  assert.equal(calls, 1);
});

test('lists every cart item once and totals the combined order itself', async () => {
  let sent;
  global.fetch = async (_, options) => { sent = JSON.parse(options.body); return accepted(); };
  const items = [
    { productTitle: 'فستان وردي', size: '4 سنين', color: 'مرجاني', price: 690, quantity: 2 },
    { productTitle: 'رومبر البرعم', size: 'من 6 لـ 12 شهر', color: 'أصفر ليموني', price: 460, quantity: 1 }
  ];
  const response = await call({ customerName: 'Test', phone: '01000000000', address: 'Cairo', price: 1, items, notes: 'Test note' });
  assert.equal(response.code, 200);
  assert.equal(sent.text, [
    '<b>🛍️ طلب جديد من لقطة!</b>',
    '<b>👤 العميل:</b> Test',
    '<b>📱 الهاتف:</b> 01000000000',
    '<b>📍 العنوان:</b> Cairo',
    '<b>🛒 الطلب:</b> 2 منتج · إجمالي 3 قطعة',
    '<b>1.</b> فستان وردي — 4 سنين · مرجاني · ×2 · 1380 ج.م',
    '<b>2.</b> رومبر البرعم — من 6 لـ 12 شهر · أصفر ليموني · ×1 · 460 ج.م',
    '<b>💰 الإجمالي:</b> 1840 ج.م',
    '<b>📝 ملاحظات:</b> Test note'
  ].join('\n'));
});

test('rejects cart orders with missing or malformed items', async () => {
  global.fetch = () => { throw new Error('Must not send'); };
  const item = { productTitle: 'Dress', size: 'M', color: 'Pink', price: 500, quantity: 1 };
  for (const items of [[], {}, 'Dress', [null], ['Dress'], [{ ...item, size: 5 }], [{ ...item, price: -1 }], [{ ...item, price: '500' }],
    [{ ...item, quantity: 0 }], [{ ...item, quantity: 1.5 }], [{ ...item, quantity: 100 }], Array.from({ length: 31 }, () => item)]) {
    assert.equal((await call({ ...order, items })).code, 400);
  }
});

const upload = `data:image/jpeg;base64,${Buffer.from('a tiny jpeg').toString('base64')}`;

test('uploads a catalogue photo as a file, since Telegram cannot fetch a data url', async () => {
  let sent;
  global.fetch = async (url, options) => {
    assert.ok(url.endsWith('/sendPhoto'));
    assert.equal(options.headers, undefined);
    sent = options.body;
    return accepted();
  };
  assert.equal((await call({ ...order, productImage: upload })).code, 200);
  assert.ok(sent instanceof FormData);
  assert.equal(sent.get('chat_id'), '-100123');
  assert.equal(sent.get('parse_mode'), 'HTML');
  assert.ok(sent.get('caption').startsWith('<b>🛍️ طلب جديد من لقطة!</b>'));
  const photo = sent.get('photo');
  assert.equal(photo.type, 'image/jpeg');
  assert.equal(photo.name, 'photo.jpeg');
  assert.equal(await photo.text(), 'a tiny jpeg');
});

test('sends one album carrying a photo for every piece in the basket', async () => {
  let sent;
  global.fetch = async (url, options) => {
    assert.ok(url.endsWith('/sendMediaGroup'));
    sent = options.body;
    return accepted();
  };
  const items = [
    { productTitle: 'فستان', size: '4 سنين', color: 'مرجاني', price: 690, quantity: 1, image: upload },
    { productTitle: 'رومبر', size: 'سنتين', color: 'أصفر', price: 460, quantity: 1, image: 'https://example.com/romper.jpg' }
  ];
  assert.equal((await call({ customerName: 'Test', phone: '0100', address: 'Cairo', items })).code, 200);
  const media = JSON.parse(sent.get('media'));
  assert.equal(media.length, 2);
  assert.equal(media[0].media, 'attach://photo0');
  assert.ok(media[0].caption.includes('<b>1.</b> فستان'));
  assert.equal(media[0].parse_mode, 'HTML');
  assert.equal(media[1].media, 'https://example.com/romper.jpg');
  assert.equal(media[1].caption, undefined);
  assert.equal(await sent.get('photo0').text(), 'a tiny jpeg');
  assert.equal(sent.get('photo1'), null);
});

test('shows each piece once and stops at the ten photos an album holds', async () => {
  let media;
  global.fetch = async (_, options) => { media = JSON.parse(options.body.get('media')); return accepted(); };
  const piece = index => ({ productTitle: `قطعة ${index}`, size: 'M', color: 'وردي', price: 100, quantity: 1, image: `https://example.com/${index}.jpg` });
  const items = Array.from({ length: 14 }, (_, index) => piece(index));
  assert.equal((await call({ customerName: 'Test', phone: '0100', address: 'Cairo', items })).code, 200);
  assert.equal(media.length, 10);
  assert.deepEqual(media.map(entry => entry.media), Array.from({ length: 10 }, (_, index) => `https://example.com/${index}.jpg`));
});

test('sends a basket of the same piece as one photo rather than a repeated album', async () => {
  let sent;
  global.fetch = async (url, options) => {
    assert.ok(url.endsWith('/sendPhoto'));
    sent = JSON.parse(options.body);
    return accepted();
  };
  const piece = { productTitle: 'فستان', size: 'M', color: 'وردي', price: 100, quantity: 1, image: 'https://example.com/fustan.jpg' };
  const items = Array.from({ length: 4 }, () => ({ ...piece }));
  assert.equal((await call({ customerName: 'Test', phone: '0100', address: 'Cairo', items })).code, 200);
  assert.equal(sent.photo, 'https://example.com/fustan.jpg');
});

test('ignores unusable photos instead of letting them break delivery', async () => {
  const methods = [];
  global.fetch = async url => { methods.push(url.split('/').pop()); return accepted(); };
  for (const image of ['not-a-url', 'data:image/jpeg;base64,', 'data:text/plain;base64,aGk=', `data:image/jpeg;base64,${'A'.repeat(15 * 1024 * 1024)}`]) {
    assert.equal((await call({ ...order, productImage: image })).code, 200);
  }
  assert.deepEqual(methods, ['sendMessage', 'sendMessage', 'sendMessage', 'sendMessage']);
});

test('rejects items whose photo is not text', async () => {
  global.fetch = () => { throw new Error('Must not send'); };
  const item = { productTitle: 'Dress', size: 'M', color: 'Pink', price: 500, quantity: 1 };
  assert.equal((await call({ ...order, items: [{ ...item, image: 5 }] })).code, 400);
});

test('prefers productImage and uses imageUrl when productImage is blank', async () => {
  const photos = [];
  global.fetch = async (_, options) => { photos.push(JSON.parse(options.body).photo); return accepted(); };
  await call({ ...order, productImage: 'https://example.com/first.jpg', imageUrl: 'https://example.com/second.jpg' });
  await call({ ...order, productImage: ' ', imageUrl: 'https://example.com/second.jpg' });
  assert.deepEqual(photos, ['https://example.com/first.jpg', 'https://example.com/second.jpg']);
});
