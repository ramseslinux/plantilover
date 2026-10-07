import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';

async function request(app, method, path, options = {}) {
  const server = app.listen(0);
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}${path}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    const setCookie = response.headers.get('set-cookie');
    const cookie = setCookie ? setCookie.split(';')[0] : undefined;
    return { status: response.status, body, headers: response.headers, cookie };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('health endpoint responds with ok', async () => {
  const app = createApp();
  const { status, body } = await request(app, 'GET', '/health');

  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.service, 'planti-lovers-api');
});

test('list products endpoint responds with catalog', async () => {
  const app = createApp();
  const { status, body } = await request(app, 'GET', '/api/products');

  assert.equal(status, 200);
  assert.ok(Array.isArray(body.items));
  assert.ok(body.items.length > 0);
});

test('demo catalog includes multiple plants with real pricing', async () => {
  const app = createApp();
  const { status, body } = await request(app, 'GET', '/api/products');

  assert.equal(status, 200);
  assert.ok(body.items.length >= 6);
  assert.ok(body.items.every((product) => Number(product.price) > 0));
  assert.ok(body.items.some((product) => product.category === 'Interior'));
  assert.ok(body.items.some((product) => product.category === 'Exterior'));
  assert.equal(body.items.find((product) => product.id === '1').sku, 'PL-MON-01');
  assert.equal(body.items.find((product) => product.id === '1').price, '450.00');
  assert.equal(body.items.find((product) => product.id === '5').price, '680.00');
});

test('creates quotation with snapshot and PED public number', async () => {
  const app = createApp();
  const { status, body } = await request(app, 'POST', '/api/orders', {
    body: {
      customerName: 'Ana',
      items: [
        { productId: '1', quantity: 2 },
        { productId: '2', quantity: 1 },
      ],
    },
  });

  assert.equal(status, 201);
  assert.match(body.publicOrderNumber, /^PED-\d{8}-[A-Z0-9]{4}$/);
  assert.equal(body.subtotal, '1180.00');
  assert.equal(body.items.length, 2);
  assert.equal(body.items[0].unitPrice, '450.00');
  assert.equal(body.items[0].subtotal, '900.00');
});

test('admin login works and orders endpoint is protected', async () => {
  const app = createApp();

  const login = await request(app, 'POST', '/api/admin/login', {
    body: { email: 'admin@example.com', password: 'change_me_admin_password' },
  });

  assert.equal(login.status, 200);
  assert.ok(login.cookie);

  const orders = await request(app, 'GET', '/api/admin/orders', {
    headers: { Cookie: login.cookie },
  });

  assert.equal(orders.status, 200);
  assert.ok(Array.isArray(orders.body.orders));
});

test('PED order can transition to ORD without duplicating', async () => {
  const app = createApp();
  const created = await request(app, 'POST', '/api/orders', {
    body: { items: [{ productId: '3', quantity: 1 }] },
  });

  assert.equal(created.status, 201);
  const orderId = created.body.order.id;
  const login = await request(app, 'POST', '/api/admin/login', {
    body: { email: 'admin@example.com', password: 'change_me_admin_password' },
  });

  const updated = await request(app, 'PATCH', `/api/admin/orders/${orderId}`, {
    headers: { Cookie: login.cookie },
    body: {
      paymentStatus: 'approved',
      documentType: 'ORD',
      status: 'paid',
    },
  });

  assert.equal(updated.status, 200);
  assert.equal(updated.body.documentType, 'ORD');
  assert.match(updated.body.publicOrderNumber, /^ORD-\d{8}-[A-Z0-9]{4}$/);
  assert.equal(updated.body.id, orderId);
  assert.equal(updated.body.items.length, 1);
});

test('dangerous payment proof upload is rejected', async () => {
  const app = createApp();
  const created = await request(app, 'POST', '/api/orders', {
    body: { items: [{ productId: '1', quantity: 1 }] },
  });

  const login = await request(app, 'POST', '/api/admin/login', {
    body: { email: 'admin@example.com', password: 'change_me_admin_password' },
  });

  const proof = await request(
    app,
    'POST',
    `/api/orders/${created.body.publicOrderNumber}/payment-proof`,
    {
      headers: { Cookie: login.cookie },
      body: {
        fileName: 'payload.php',
        mimeType: 'application/x-php',
        content: '<?php echo "hack"; ?>',
      },
    }
  );

  assert.equal(proof.status, 400);
  assert.equal(proof.body.error, 'Invalid or unsafe file upload.');
});

test('admin can mark order shipped and attach evidence', async () => {
  const app = createApp();
  const created = await request(app, 'POST', '/api/orders', {
    body: { items: [{ productId: '2', quantity: 2 }] },
  });

  const login = await request(app, 'POST', '/api/admin/login', {
    body: { email: 'admin@example.com', password: 'change_me_admin_password' },
  });

  const shipping = await request(
    app,
    'PATCH',
    `/api/admin/orders/${created.body.order.id}/shipping`,
    {
      headers: { Cookie: login.cookie },
      body: {
        shippingStatus: 'shipped',
        shippingCarrier: 'Correo Argentino',
        trackingNumber: 'AR-123456',
        shippedAt: '2026-10-06T12:00:00.000Z',
        shippingNotes: 'Paquete listo para despacho',
      },
    }
  );

  assert.equal(shipping.status, 200);
  assert.equal(shipping.body.shippingStatus, 'shipped');
  assert.equal(shipping.body.trackingNumber, 'AR-123456');

  const evidence = await request(
    app,
    'POST',
    `/api/admin/orders/${created.body.order.id}/evidence`,
    {
      headers: { Cookie: login.cookie },
      body: {
        fileName: 'packing-photo.jpg',
        mimeType: 'image/jpeg',
        content: 'data:image/jpeg;base64,AAAA',
        context: 'packaging',
      },
    }
  );

  assert.equal(evidence.status, 201);
  assert.equal(evidence.body.evidence.context, 'packaging');
  assert.equal(evidence.body.evidence.fileName, 'packing-photo.jpg');
  assert.ok(Array.isArray(evidence.body.auditTrail));
});

test('historical orders can be archived and restored without duplication', async () => {
  const app = createApp();
  const created = await request(app, 'POST', '/api/orders', {
    body: { items: [{ productId: '1', quantity: 1 }] },
  });

  const login = await request(app, 'POST', '/api/admin/login', {
    body: { email: 'admin@example.com', password: 'change_me_admin_password' },
  });

  const archived = await request(
    app,
    'PATCH',
    `/api/admin/orders/${created.body.order.id}/archive`,
    {
      headers: { Cookie: login.cookie },
      body: { status: 'archived', archivedReason: 'inactive' },
    }
  );

  assert.equal(archived.status, 200);
  assert.equal(archived.body.archived, true);
  assert.equal(archived.body.status, 'archived');

  const list = await request(app, 'GET', '/api/admin/orders?scope=active', {
    headers: { Cookie: login.cookie },
  });

  assert.equal(list.status, 200);
  assert.ok(Array.isArray(list.body.orders));

  const restored = await request(
    app,
    'PATCH',
    `/api/admin/orders/${created.body.order.id}/restore`,
    {
      headers: { Cookie: login.cookie },
      body: { status: 'pending' },
    }
  );

  assert.equal(restored.status, 200);
  assert.equal(restored.body.restored, true);
  assert.equal(restored.body.id, created.body.order.id);
  assert.equal(restored.body.publicOrderNumberBase, created.body.publicOrderNumberBase);
});

test('shipping tariff snapshot is preserved and versioned', async () => {
  const app = createApp();
  const login = await request(app, 'POST', '/api/admin/login', {
    body: { email: 'admin@example.com', password: 'change_me_admin_password' },
  });

  const imported = await request(app, 'POST', '/api/admin/shipping-rates/import', {
    headers: { Cookie: login.cookie },
    body: {
      version: 'v2026-10-01',
      provider: 'Correo Argentino',
      entries: [
        { postalCode: '1000', service: 'standard', price: '120.00' },
        { postalCode: '1000', service: 'express', price: '250.00' },
      ],
    },
  });

  assert.equal(imported.status, 201);
  assert.equal(imported.body.importVersion, 'v2026-10-01');

  const selected = await request(app, 'POST', '/api/admin/shipping-rates/quote', {
    headers: { Cookie: login.cookie },
    body: {
      postalCode: '1000',
      service: 'standard',
      currency: 'ARS',
    },
  });

  assert.equal(selected.status, 200);
  assert.equal(selected.body.price, '120.00');
  assert.equal(selected.body.version, 'v2026-10-01');
});
