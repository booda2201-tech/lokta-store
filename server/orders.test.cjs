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

test('prefers productImage and uses imageUrl when productImage is blank', async () => {
  const photos = [];
  global.fetch = async (_, options) => { photos.push(JSON.parse(options.body).photo); return accepted(); };
  await call({ ...order, productImage: 'first', imageUrl: 'second' });
  await call({ ...order, productImage: ' ', imageUrl: 'second' });
  assert.deepEqual(photos, ['first', 'second']);
});
