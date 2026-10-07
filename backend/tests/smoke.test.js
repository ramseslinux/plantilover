import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TEST_ADMIN_EMAIL = 'test-admin@example.invalid';
const TEST_ADMIN_PASSWORD = 'test-only-password';
process.env.ADMIN_EMAIL = TEST_ADMIN_EMAIL;
process.env.ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;

const { createApp, initializeDatabase } = await import('../src/server.js');
const argon2 = (await import('argon2')).default;

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
  const proxiedHealth = await request(app, 'GET', '/api/health');
  assert.equal(proxiedHealth.status, 200);
});

test('database migrations run once in numeric filename order', async () => {
  const applied = new Set();
  const migrationSql = [];
  const pool = {
    async query(sql, values = []) {
      if (sql.includes('SELECT 1 FROM schema_migrations')) {
        return { rows: applied.has(values[0]) ? [{ exists: 1 }] : [] };
      }
      if (sql.includes('SELECT order_data FROM demo_quotation_orders')) {
        return { rows: [] };
      }
      return { rows: [] };
    },
    async connect() {
      return {
        async query(sql, values = []) {
          if (sql.includes('INSERT INTO schema_migrations')) {
            applied.add(values[0]);
          } else if (!['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) {
            migrationSql.push(sql);
          }
          return { rows: [] };
        },
        release() {},
      };
    },
  };

  await initializeDatabase(pool);
  assert.equal(applied.size, 13);
  assert.match(migrationSql[0], /CREATE EXTENSION IF NOT EXISTS pgcrypto/);
  assert.match(migrationSql[1], /ALTER TABLE orders/);
  assert.match(migrationSql[2], /CREATE TABLE IF NOT EXISTS demo_quotation_orders/);
  assert.match(migrationSql[3], /archived_from_status/);
  assert.match(migrationSql[4], /CREATE TABLE IF NOT EXISTS admin_sessions/);
  assert.match(migrationSql[5], /ADD COLUMN IF NOT EXISTS original_file_name/);
  assert.match(migrationSql[6], /INSERT INTO products/);
  assert.match(migrationSql[7], /order_shipping/);
  assert.match(migrationSql[8], /DEFAULT 'MXN'/);
  assert.match(migrationSql[9], /weight_snapshot/);
  assert.match(migrationSql[10], /UPDATE order_items/);
  assert.match(migrationSql[11], /app_settings/);
  assert.match(migrationSql[12], /payment_method/);

  await initializeDatabase(pool);
  assert.equal(migrationSql.length, 13);
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
  const monstera = body.items.find((product) => product.sku === 'PL-MON-01');
  assert.equal(monstera.id, monstera.slug);
  assert.equal(monstera.price, '450.00');
  assert.equal(body.items.find((product) => product.sku === 'PL-FIC-04').price, '680.00');
});

test('admin can create, update and archive catalog products', async () => {
  const app = createApp();
  const login = await request(app, 'POST', '/api/admin/login', {
    body: { email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD },
  });
  const created = await request(app, 'POST', '/api/admin/products', {
    headers: { Cookie: login.cookie },
    body: { name: 'Helecho Azul', sku: 'PL-HELECHO-01', category: 'Sombra', price: '315.50', stock: 6 },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.product.slug, 'helecho-azul');
  assert.equal(created.body.product.price, '315.50');
  const updated = await request(app, 'PATCH', `/api/admin/products/${created.body.product.id}`, {
    headers: { Cookie: login.cookie },
    body: { price: '325.00', stock: 4 },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.product.price, '325.00');
  const unsafeImage = await request(app, 'PATCH', `/api/admin/products/${created.body.product.id}`, {
    headers: { Cookie: login.cookie },
    body: { image: 'javascript:alert(1)' },
  });
  assert.equal(unsafeImage.status, 400);
  const archived = await request(app, 'DELETE', `/api/admin/products/${created.body.product.id}`, {
    headers: { Cookie: login.cookie },
  });
  assert.equal(archived.status, 200);
  const catalog = await request(app, 'GET', '/api/products');
  assert.equal(catalog.body.items.some((product) => product.id === created.body.product.id), false);
});

test('login rate limit rejects the eleventh attempt in a minute', async () => {
  const app = createApp();
  let response;
  for (let attempt = 0; attempt < 11; attempt += 1) {
    response = await request(app, 'POST', '/api/admin/login', {
      body: { email: 'invalid@example.invalid', password: 'wrong-password' },
    });
  }
  assert.equal(response.status, 429);
  assert.match(response.body.error, /login attempts/i);
});

test('administrator can configure the inactivity archive period', async () => {
  const app = createApp();
  const login = await request(app, 'POST', '/api/admin/login', {
    body: { email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD },
  });
  const initial = await request(app, 'GET', '/api/admin/settings/order-archive', {
    headers: { Cookie: login.cookie },
  });
  assert.equal(initial.body.days, 30);
  const updated = await request(app, 'PATCH', '/api/admin/settings/order-archive', {
    headers: { Cookie: login.cookie },
    body: { days: 45 },
  });
  assert.equal(updated.status, 200);
  const invalid = await request(app, 'PATCH', '/api/admin/settings/order-archive', {
    headers: { Cookie: login.cookie }, body: { days: 0 },
  });
  assert.equal(invalid.status, 400);
  const current = await request(app, 'GET', '/api/admin/settings/order-archive', {
    headers: { Cookie: login.cookie },
  });
  assert.equal(current.body.days, 45);
  await request(app, 'PATCH', '/api/admin/settings/order-archive', {
    headers: { Cookie: login.cookie }, body: { days: 30 },
  });
});

test('database mode reads normalized products and persists quotation snapshots', async () => {
  const persistedOrders = [];
  const persistedItems = [];
  const pool = {
    async query(sql) {
      if (sql.includes('FROM products p')) {
        return {
          rows: [
            {
              id: 1,
              slug: 'monstera-deliciosa',
              name: 'Monstera Deliciosa',
              sku: 'PL-MON-01',
              category: 'Interior',
              price: '450.00',
              image_url: 'https://example.com/monstera.jpg',
              description: 'Demo plant',
              care_level: 'media',
              plant_size: '65 cm',
              light_requirement: 'Luz indirecta',
              pet_friendly: false,
              stock: 18,
            },
          ],
        };
      }
      if (sql.includes('INSERT INTO audit_log')) return { rows: [] };
      throw new Error(`Unexpected pool query: ${sql}`);
    },
    async connect() {
      return {
        async query(sql, values = []) {
          if (sql.includes('INSERT INTO orders')) {
            persistedOrders.push(values);
            return { rows: [{ id: values[0] }] };
          }
          if (sql.includes('SELECT 1 FROM order_items')) return { rows: [] };
          if (sql.includes('INSERT INTO order_items')) {
            persistedItems.push(values);
          }
          return { rows: [] };
        },
        release() {},
      };
    },
  };
  const app = createApp({ pool });

  const catalog = await request(app, 'GET', '/api/products');
  assert.equal(catalog.status, 200);
  assert.equal(catalog.body.items[0].price, '450.00');

  const created = await request(app, 'POST', '/api/orders', {
    body: { customerName: 'Database customer', items: [{ productId: 'monstera-deliciosa', quantity: 2 }] },
  });

  assert.equal(created.status, 201);
  assert.equal(created.body.total, '900.00');
  assert.equal(persistedOrders.length, 1);
  assert.equal(persistedItems.length, 1);
  assert.equal(persistedItems[0][4], 'PL-MON-01');
  assert.equal(persistedItems[0][6], '450.00');
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

  const lookup = await request(app, 'GET', `/api/orders/${body.publicOrderNumber}`);
  assert.equal(lookup.status, 200);
  assert.equal(lookup.body.publicOrderNumber, body.publicOrderNumber);
  assert.equal('customerName' in lookup.body, false);
  assert.equal('id' in lookup.body, false);
  assert.equal('id' in body, false);
  assert.equal(lookup.body.items.length, 2);
  assert.equal('productId' in lookup.body.items[0], false);
});

test('quotation money uses exact cents and invalid products return 400', async () => {
  const pool = {
    async query(sql, values = []) {
      if (sql.includes('FROM products p')) {
        return { rows: [{
          id: 1,
          slug: 'test-plant',
          name: 'Test plant',
          sku: 'TEST-01',
          category: 'Interior',
          price: '0.10',
          image_url: '',
          description: '',
          care_level: 'media',
          plant_size: '',
          light_requirement: '',
          pet_friendly: false,
          stock: 10,
        }] };
      }
      if (sql.includes('INSERT INTO audit_log')) return { rows: [] };
      throw new Error(`Unexpected query: ${sql} ${values.length}`);
    },
    async connect() {
      return {
        async query(sql, values = []) {
          if (sql.includes('INSERT INTO orders')) return { rows: [{ id: values[0] }] };
          if (sql.includes('SELECT 1 FROM order_items')) return { rows: [] };
          return { rows: [] };
        },
        release() {},
      };
    },
  };
  const app = createApp({ pool });
  const created = await request(app, 'POST', '/api/orders', {
    body: { items: [{ productId: 'test-plant', quantity: 3 }] },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.total, '0.30');

  const invalid = await request(app, 'POST', '/api/orders', {
    body: { items: [{ productId: 'missing', quantity: 1 }] },
  });
  assert.equal(invalid.status, 400);
});

test('admin login works and orders endpoint is protected', async () => {
  const app = createApp();

  const login = await request(app, 'POST', '/api/admin/login', {
    body: { email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD },
  });

  assert.equal(login.status, 200);
  assert.ok(login.cookie);

  const orders = await request(app, 'GET', '/api/admin/orders', {
    headers: { Cookie: login.cookie },
  });

  assert.equal(orders.status, 200);
  assert.ok(Array.isArray(orders.body.orders));
});

test('database-backed admin sessions remain valid across app instances', async () => {
  const passwordHash = await argon2.hash(TEST_ADMIN_PASSWORD);
  let savedSession = null;
  const pool = {
    async query(sql, values = []) {
      if (sql.includes('FROM admin_users')) {
        return { rows: [{
          id: '00000000-0000-4000-8000-000000000001',
          email: TEST_ADMIN_EMAIL,
          password_hash: passwordHash,
          role: 'admin',
        }] };
      }
      if (sql.includes('INSERT INTO admin_sessions')) {
        savedSession = { tokenHash: values[0], expiresAt: values[2] };
        return { rows: [] };
      }
      if (sql.includes('FROM admin_sessions s')) {
        return savedSession?.tokenHash === values[0] && savedSession.expiresAt > new Date()
          ? { rows: [{ id: '00000000-0000-4000-8000-000000000001', email: TEST_ADMIN_EMAIL, role: 'admin' }] }
          : { rows: [] };
      }
      return { rows: [] };
    },
  };

  const login = await request(createApp({ pool }), 'POST', '/api/admin/login', {
    body: { email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD },
  });
  assert.equal(login.status, 200);
  assert.ok(savedSession);

  const afterRestart = await request(createApp({ pool }), 'GET', '/api/admin/orders', {
    headers: { Cookie: login.cookie },
  });
  assert.equal(afterRestart.status, 200);
});

test('PED order can transition to ORD without duplicating', async () => {
  const app = createApp();
  const created = await request(app, 'POST', '/api/orders', {
    body: { items: [{ productId: '3', quantity: 1 }] },
  });

  assert.equal(created.status, 201);
  const orderId = created.body.publicOrderNumber;
  const login = await request(app, 'POST', '/api/admin/login', {
    body: { email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD },
  });

  const updated = await request(app, 'PATCH', `/api/admin/orders/${orderId}`, {
    headers: { Cookie: login.cookie },
    body: {
      paymentStatus: 'approved',
      paymentMethod: 'cash',
      documentType: 'ORD',
      status: 'paid',
    },
  });

  assert.equal(updated.status, 200);
  assert.equal(updated.body.documentType, 'ORD');
  assert.match(updated.body.publicOrderNumber, /^ORD-\d{8}-[A-Z0-9]{4}$/);
  assert.equal(updated.body.publicOrderNumberBase, created.body.publicOrderNumberBase);
  assert.equal(updated.body.paymentMethod, 'cash');
  assert.equal(updated.body.items.length, 1);
});

test('dangerous payment proof upload is rejected', async () => {
  const app = createApp();
  const created = await request(app, 'POST', '/api/orders', {
    body: { items: [{ productId: '1', quantity: 1 }] },
  });

  const login = await request(app, 'POST', '/api/admin/login', {
    body: { email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD },
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

test('valid payment proofs are type-checked, stored outside web files and update order status', async (t) => {
  const uploadDirectory = await mkdtemp(join(tmpdir(), 'planti-proof-'));
  t.after(() => rm(uploadDirectory, { recursive: true, force: true }));
  const app = createApp({ uploadDirectory });
  const created = await request(app, 'POST', '/api/orders', {
    body: { items: [{ productId: '1', quantity: 1 }] },
  });

  const proof = await request(
    app,
    'POST',
    `/api/orders/${created.body.publicOrderNumber}/payment-proof`,
    { body: {
      fileName: 'receipt.jpg',
      mimeType: 'image/jpeg',
      content: 'data:image/jpeg;base64,/9j/2Q==',
    } }
  );
  assert.equal(proof.status, 201);
  assert.equal(proof.body.paymentStatus, 'pending_review');
  assert.equal('filePath' in proof.body.proof, false);
  assert.equal((await readdir(uploadDirectory)).length, 1);

  const lookedUp = await request(app, 'GET', `/api/orders/${created.body.publicOrderNumber}`);
  assert.equal(lookedUp.body.paymentStatus, 'pending_review');

  const login = await request(app, 'POST', '/api/admin/login', {
    body: { email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD },
  });
  const review = await request(
    app,
    'PATCH',
    `/api/admin/orders/${created.body.publicOrderNumber}/payment-proofs/${proof.body.proof.id}`,
    { headers: { Cookie: login.cookie }, body: { status: 'approved' } }
  );
  assert.equal(review.status, 200);
  assert.equal(review.body.documentType, 'ORD');
  assert.equal(review.body.status, 'paid');
  const afterReview = await request(app, 'GET', `/api/orders/${review.body.publicOrderNumber}`);
  assert.equal(afterReview.body.paymentStatus, 'approved');
  assert.equal(afterReview.body.publicOrderNumberBase, created.body.publicOrderNumberBase);
});

test('admin can mark order shipped and attach evidence', async (t) => {
  const uploadDirectory = await mkdtemp(join(tmpdir(), 'planti-evidence-'));
  t.after(() => rm(uploadDirectory, { recursive: true, force: true }));
  const app = createApp({ uploadDirectory });
  const created = await request(app, 'POST', '/api/orders', {
    body: { items: [{ productId: '2', quantity: 2 }] },
  });

  const login = await request(app, 'POST', '/api/admin/login', {
    body: { email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD },
  });

  const shipping = await request(
    app,
    'PATCH',
    `/api/admin/orders/${created.body.publicOrderNumber}/shipping`,
    {
      headers: { Cookie: login.cookie },
      body: {
        shippingStatus: 'shipped',
        shippingCarrier: 'Correo Argentino',
        trackingNumber: 'AR-123456',
        shippedAt: '2026-10-06T12:00:00.000Z',
        shippingNotes: 'Paquete listo para despacho',
        shippingService: 'Standard',
        postalCodeSnapshot: '01000',
        rateVersion: 'v2026-10-06',
        rateOriginal: '120.00',
        rateFinal: '149.99',
        shippingManualOverride: true,
      },
    }
  );

  assert.equal(shipping.status, 200);
  assert.equal(shipping.body.shippingStatus, 'shipped');
  assert.equal(shipping.body.trackingNumber, 'AR-123456');
  assert.ok(shipping.body.shippedAt);
  assert.equal(shipping.body.total, '709.99');
  assert.equal(shipping.body.rateVersion, 'v2026-10-06');
  const publicTracking = await request(app, 'GET', `/api/orders/${created.body.publicOrderNumber}`);
  assert.equal(publicTracking.body.shippingStatus, 'shipped');
  assert.equal('postalCodeSnapshot' in publicTracking.body, false);
  assert.equal('rateOriginal' in publicTracking.body, false);

  const evidence = await request(
    app,
    'POST',
    `/api/admin/orders/${created.body.publicOrderNumber}/evidence`,
    {
      headers: { Cookie: login.cookie },
      body: {
        fileName: 'packing-photo.jpg',
        mimeType: 'image/jpeg',
        content: 'data:image/jpeg;base64,/9j/2Q==',
        context: 'packaging',
      },
    }
  );

  assert.equal(evidence.status, 201);
  assert.equal(evidence.body.evidence.context, 'packaging');
  assert.equal(evidence.body.evidence.fileName, 'packing-photo.jpg');
  assert.equal((await readdir(uploadDirectory)).length, 1);
  assert.ok(Array.isArray(evidence.body.auditTrail));
});

test('historical orders can be archived and restored without duplication', async () => {
  const app = createApp();
  const created = await request(app, 'POST', '/api/orders', {
    body: { items: [{ productId: '1', quantity: 1 }] },
  });

  const login = await request(app, 'POST', '/api/admin/login', {
    body: { email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD },
  });

  const archived = await request(
    app,
    'PATCH',
    `/api/admin/orders/${created.body.publicOrderNumber}/archive`,
    {
      headers: { Cookie: login.cookie },
      body: { status: 'archived', archivedReason: 'inactive' },
    }
  );

  assert.equal(archived.status, 200);
  assert.equal(archived.body.archived, true);
  assert.equal(archived.body.status, 'archived');
  assert.equal(archived.body.paymentStatus, 'pending');

  const list = await request(app, 'GET', '/api/admin/orders?scope=active', {
    headers: { Cookie: login.cookie },
  });

  assert.equal(list.status, 200);
  assert.ok(Array.isArray(list.body.orders));

  const restored = await request(
    app,
    'PATCH',
    `/api/admin/orders/${created.body.publicOrderNumber}/restore`,
    {
      headers: { Cookie: login.cookie },
      body: { status: 'pending' },
    }
  );

  assert.equal(restored.status, 200);
  assert.equal(restored.body.restored, true);
  assert.equal(restored.body.status, 'pending');
  assert.equal(restored.body.paymentStatus, 'pending');
  assert.equal(restored.body.publicOrderNumberBase, created.body.publicOrderNumberBase);
});

test('shipping tariff snapshot is preserved and versioned', async () => {
  const app = createApp();
  const login = await request(app, 'POST', '/api/admin/login', {
    body: { email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD },
  });

  const imported = await request(app, 'POST', '/api/admin/shipping-rates/import', {
    headers: { Cookie: login.cookie },
    body: {
      version: 'v2026-10-01',
      provider: 'Correo Argentino',
      sourceFileName: 'tarifas.csv',
      csvContent: 'postalCode,service,zone,weightMin,weightMax,price,currency\n01000,standard,A,0,10,120.00,MXN\n01000,express,A,0,10,250.00,MXN',
    },
  });

  assert.equal(imported.status, 201);
  assert.equal(imported.body.importVersion, 'v2026-10-01');

  const selected = await request(app, 'POST', '/api/admin/shipping-rates/quote', {
    headers: { Cookie: login.cookie },
    body: {
      postalCode: '01000',
      service: 'standard',
      currency: 'MXN',
      weight: 2,
    },
  });

  assert.equal(selected.status, 200);
  assert.equal(selected.body.price, '120.00');
  assert.equal(selected.body.version, 'v2026-10-01');

  const outOfRange = await request(app, 'POST', '/api/admin/shipping-rates/quote', {
    headers: { Cookie: login.cookie },
    body: { postalCode: '01000', service: 'standard', weight: 11 },
  });
  assert.equal(outOfRange.status, 404);
});

test('database-backed shipping rate imports can be quoted after persistence', async () => {
  const passwordHash = await argon2.hash(TEST_ADMIN_PASSWORD);
  let savedSession = null;
  let savedRate = null;
  const pool = {
    async query(sql, values = []) {
      if (sql.includes('FROM admin_users')) {
        return { rows: [{ id: '00000000-0000-4000-8000-000000000001', email: TEST_ADMIN_EMAIL, password_hash: passwordHash, role: 'admin' }] };
      }
      if (sql.includes('INSERT INTO admin_sessions')) {
        savedSession = { tokenHash: values[0], expiresAt: values[2] };
        return { rows: [] };
      }
      if (sql.includes('FROM admin_sessions s')) {
        return savedSession?.tokenHash === values[0]
          ? { rows: [{ id: '00000000-0000-4000-8000-000000000001', email: TEST_ADMIN_EMAIL, role: 'admin' }] }
          : { rows: [] };
      }
      if (sql.includes('FROM shipping_rates r')) return { rows: savedRate ? [savedRate] : [] };
      return { rows: [] };
    },
    async connect() {
      return {
        async query(sql, values = []) {
          if (sql.includes('INSERT INTO shipping_providers')) return { rows: [{ id: 'provider-id' }] };
          if (sql.includes('INSERT INTO shipping_rate_imports')) return { rows: [{ id: 'import-id' }] };
          if (sql.includes('INSERT INTO shipping_services')) return { rows: [{ id: 'service-id' }] };
          if (sql.includes('INSERT INTO shipping_rates')) {
            savedRate = {
              version: 'v2026-10-02',
              provider: 'Planti Courier',
              service: 'standard',
              postal_code: values[2],
              currency: values[7],
              price: values[6],
            };
          }
          return { rows: [] };
        },
        release() {},
      };
    },
  };
  const app = createApp({ pool });
  const login = await request(app, 'POST', '/api/admin/login', {
    body: { email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD },
  });
  const imported = await request(app, 'POST', '/api/admin/shipping-rates/import', {
    headers: { Cookie: login.cookie },
    body: {
      version: 'v2026-10-02',
      provider: 'Planti Courier',
      entries: [{ postalCode: '12345', service: 'standard', price: '1.20', currency: 'MXN' }],
    },
  });
  assert.equal(imported.status, 201);

  const quoted = await request(app, 'POST', '/api/admin/shipping-rates/quote', {
    headers: { Cookie: login.cookie },
    body: { postalCode: '12345', service: 'standard' },
  });
  assert.equal(quoted.status, 200);
  assert.equal(quoted.body.price, '1.20');
  assert.equal(quoted.body.version, 'v2026-10-02');
});
