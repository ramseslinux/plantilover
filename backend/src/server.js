import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { config } from './config.js';

const productCatalog = [
  {
    id: '1',
    slug: 'monstera-deliciosa',
    name: 'Monstera Deliciosa',
    sku: 'PL-MON-01',
    category: 'Interior',
    price: '450.00',
    image:
      'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=80',
    description: 'Costilla de Adán. Follaje tropical con hojas grandes y luminosas para espacios de estilo moderno.',
    care: 'Media',
    size: '65 cm',
    light: 'Luz indirecta',
    petFriendly: false,
    stock: 18,
  },
  {
    id: '2',
    slug: 'sansevieria-trifasciata',
    name: 'Sansevieria Trifasciata',
    sku: 'PL-SAN-08',
    category: 'Interior',
    price: '280.00',
    image:
      'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80',
    description: 'Lengua de Suegra, resistente y de poco riego; ideal para interiores.',
    care: 'Baja',
    size: '55 cm',
    light: 'Luz indirecta',
    petFriendly: false,
    stock: 24,
  },
  {
    id: '3',
    slug: 'pothos-aurum',
    name: 'Pothos Dorado',
    sku: 'PL-POT-12',
    category: 'Colgantes',
    price: '220.00',
    image:
      'https://images.unsplash.com/photo-1512428813834-c702c7702b78?auto=format&fit=crop&w=900&q=80',
    description: 'Planta colgante y purificadora con hojas variegadas que aportan movimiento y color.',
    care: 'Baja',
    size: '40 cm',
    light: 'Luz indirecta',
    petFriendly: false,
    stock: 32,
  },
  {
    id: '4',
    slug: 'calathea-orbifolia',
    name: 'Calathea Orbifolia',
    sku: 'PL-CAL-03',
    category: 'Interior',
    price: '360.00',
    image:
      'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=900&q=80',
    description: 'Hojas grandes y texturizadas para crear una atmósfera elegante y relajante.',
    care: 'Media',
    size: '45 cm',
    light: 'Luz indirecta',
    petFriendly: true,
    stock: 12,
  },
  {
    id: '5',
    slug: 'ficus-lyrata',
    name: 'Ficus Lyrata',
    sku: 'PL-FIC-04',
    category: 'Interior',
    price: '680.00',
    image:
      'https://images.unsplash.com/photo-1463320726281-696a485928c7?auto=format&fit=crop&w=900&q=80',
    description: 'Excelente para salas grandes o oficinas con buena luminosidad indirecta.',
    care: 'Media',
    size: '90 cm',
    light: 'Luz brillante',
    petFriendly: false,
    stock: 9,
  },
  {
    id: '6',
    slug: 'aloe-vera',
    name: 'Aloe Vera',
    sku: 'PL-006',
    category: 'Medicinal',
    price: '140.00',
    image:
      'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=900&q=80',
    description: 'Planta fácil de cuidar con propiedades decorativas y funcionales.',
    care: 'Baja',
    size: '25 cm',
    light: 'Luz brillante',
    petFriendly: false,
    stock: 28,
  },
  {
    id: '7',
    slug: 'zamioculcas-zamiifolia',
    name: 'Zamioculcas',
    sku: 'PL-007',
    category: 'Bajo mantenimiento',
    price: '230.00',
    image:
      'https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?auto=format&fit=crop&w=900&q=80',
    description: 'Larga vida útil y aspecto muy limpio, ideal para departamentos y oficinas.',
    care: 'Baja',
    size: '50 cm',
    light: 'Poca luz',
    petFriendly: false,
    stock: 16,
  },
  {
    id: '8',
    slug: 'heliconia-rostrata',
    name: 'Heliconia Rostrata',
    sku: 'PL-008',
    category: 'Exterior',
    price: '390.00',
    image:
      'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=80',
    description: 'Gran presencia exterior con flores llamativas y follaje tropical.',
    care: 'Alta',
    size: '80 cm',
    light: 'Sol directo',
    petFriendly: false,
    stock: 11,
  },
  {
    id: '9',
    slug: 'dracaena-marginata',
    name: 'Dracaena Marginata',
    sku: 'PL-009',
    category: 'Interior',
    price: '260.00',
    image:
      'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=900&q=80',
    description: 'Perfil elegante y vertical para espacios minimalistas y modernos.',
    care: 'Media',
    size: '75 cm',
    light: 'Luz brillante',
    petFriendly: false,
    stock: 20,
  },
];

const orders = [];
const auditLogs = [];
const orderEvidence = [];
const shippingRateVersions = [];
const loginSessions = new Map();
const adminUsers = [
  {
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    passwordHash: await argon2.hash(
      process.env.ADMIN_PASSWORD || 'change_me_admin_password'
    ),
    role: 'admin',
  },
];

const ALLOWED_UPLOAD_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function randomToken(length = 24) {
  return randomBytes(length).toString('hex').slice(0, length);
}

function toMoney(value) {
  return Number(value || 0).toFixed(2);
}

function buildPublicOrderNumber(order) {
  return `${order.documentType}-${order.publicOrderNumberBase}`;
}

function serialiseOrder(order) {
  return {
    id: order.id,
    publicOrderNumber: buildPublicOrderNumber(order),
    publicOrderNumberBase: order.publicOrderNumberBase,
    documentType: order.documentType,
    status: order.status,
    paymentStatus: order.paymentStatus,
    customerName: order.customerName,
    shippingStatus: order.shippingStatus || 'not_requested',
    shippingCarrier: order.shippingCarrier || null,
    trackingNumber: order.trackingNumber || null,
    shippedAt: order.shippedAt || null,
    deliveredAt: order.deliveredAt || null,
    shippingNotes: order.shippingNotes || null,
    subtotal: order.subtotal,
    total: order.total,
    items: order.items,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function createPublicOrderBase() {
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = randomToken(4).toUpperCase();
  return `${dateStamp}-${suffix}`;
}

function appendAuditLog({
  entityType,
  entityId,
  action,
  actor,
  previousState,
  newState,
  details,
}) {
  auditLogs.push({
    id: randomToken(8),
    entityType,
    entityId,
    action,
    actor,
    previousState,
    newState,
    details,
    createdAt: new Date().toISOString(),
  });
}

function findOrderByIdOrCode(orderIdOrPublicNumber) {
  return orders.find((order) => {
    if (order.id === orderIdOrPublicNumber) return true;
    if (order.publicOrderNumberBase === orderIdOrPublicNumber) return true;
    return buildPublicOrderNumber(order) === orderIdOrPublicNumber;
  });
}

function getProductById(productId) {
  return productCatalog.find((product) => product.id === productId);
}

function validateUpload(fileName, mimeType, content) {
  const extension = String(fileName || '')
    .slice(fileName.lastIndexOf('.'))
    .toLowerCase();
  const safeMime = String(mimeType || '').toLowerCase();
  const contentText = String(content || '');

  if (!ALLOWED_UPLOAD_EXTENSIONS.has(extension)) {
    return false;
  }

  if (!ALLOWED_UPLOAD_MIME_TYPES.has(safeMime)) {
    return false;
  }

  const dangerousPatterns = [
    /<\?php/i,
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /eval\s*\(/i,
    /document\.cookie/i,
  ];

  if (dangerousPatterns.some((pattern) => pattern.test(contentText))) {
    return false;
  }

  return true;
}

function requireAdmin(req, res, next) {
  const cookies = req.headers.cookie || '';
  const sessionCookie = cookies
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('planti_session='));

  const token = sessionCookie
    ? sessionCookie.replace('planti_session=', '')
    : null;

  if (!token || !loginSessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  req.admin = loginSessions.get(token);
  return next();
}

export function createApp() {
  const app = express();

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Many requests. Please slow down.' },
  });

  const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts.' },
  });

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use('/api', apiLimiter);

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'planti-lovers-api', env: config.nodeEnv });
  });

  app.get('/api/products', (_req, res) => {
    res.json({ items: productCatalog });
  });

  app.get('/api/products/:slug', (req, res) => {
    const product = productCatalog.find(
      (item) => item.slug === req.params.slug
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    return res.json({ item: product });
  });

  app.get('/api/categories', (_req, res) => {
    const categories = [
      ...new Set(productCatalog.map((product) => product.category)),
    ];
    res.json({ items: categories });
  });

  app.post('/api/orders', (req, res) => {
    const { items, customerName } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart items are required.' });
    }

    const snapshotItems = items.map((item) => {
      const quantity = Number(item.quantity || 0);
      const product = getProductById(item.productId);

      if (!product) {
        throw new Error(`Product ${item.productId} was not found.`);
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('Quantity must be a positive integer.');
      }

      const unitPrice = Number(product.price);
      const subtotal = unitPrice * quantity;

      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity,
        unitPrice: toMoney(unitPrice),
        subtotal: toMoney(subtotal),
      };
    });

    const subtotal = snapshotItems.reduce(
      (sum, item) => sum + Number(item.subtotal),
      0
    );
    const publicOrderNumberBase = createPublicOrderBase();
    const order = {
      id: `order-${randomToken(10)}`,
      publicOrderNumberBase,
      documentType: 'PED',
      status: 'pending',
      paymentStatus: 'pending',
      customerName: customerName || 'Guest',
      shippingStatus: 'not_requested',
      shippingCarrier: null,
      trackingNumber: null,
      shippedAt: null,
      deliveredAt: null,
      shippingNotes: null,
      subtotal: toMoney(subtotal),
      total: toMoney(subtotal),
      items: snapshotItems,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    orders.push(order);
    appendAuditLog({
      entityType: 'orders',
      entityId: order.id,
      action: 'created',
      actor: 'customer',
      previousState: null,
      newState: {
        documentType: order.documentType,
        publicOrderNumber: buildPublicOrderNumber(order),
      },
      details: { items: snapshotItems },
    });

    return res.status(201).json({
      message: 'Quotation created successfully.',
      publicOrderNumber: buildPublicOrderNumber(order),
      publicOrderNumberBase: order.publicOrderNumberBase,
      subtotal: order.subtotal,
      total: order.total,
      customerName: order.customerName,
      order: serialiseOrder(order),
      items: order.items,
    });
  });

  app.get('/api/orders/:publicOrderNumber', (req, res) => {
    const order = findOrderByIdOrCode(req.params.publicOrderNumber);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    return res.json(serialiseOrder(order));
  });

  app.post('/api/orders/:publicOrderNumber/payment-proof', (req, res) => {
    const { fileName, mimeType, content } = req.body || {};
    const order = findOrderByIdOrCode(req.params.publicOrderNumber);

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (!fileName || !validateUpload(fileName, mimeType, content)) {
      return res.status(400).json({ error: 'Invalid or unsafe file upload.' });
    }

    const proof = {
      id: `proof-${randomToken(10)}`,
      orderId: order.id,
      fileName,
      mimeType,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
    };

    appendAuditLog({
      entityType: 'payment_proofs',
      entityId: proof.id,
      action: 'uploaded',
      actor: 'customer',
      previousState: null,
      newState: { orderId: order.id, fileName },
      details: { mimeType },
    });

    return res.status(201).json({
      message: 'Payment proof received.',
      publicOrderNumber: buildPublicOrderNumber(order),
      fileName,
      paymentStatus: 'pending_review',
      proof,
    });
  });

  app.post('/api/admin/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: 'Email and password are required.' });
    }

    const admin = adminUsers.find(
      (user) => user.email.toLowerCase() === String(email).toLowerCase()
    );
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isValidPassword = await argon2.verify(
      admin.passwordHash,
      String(password)
    );
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = randomToken(32);
    loginSessions.set(token, {
      email: admin.email,
      role: admin.role,
      createdAt: new Date().toISOString(),
    });

    res.setHeader(
      'Set-Cookie',
      `planti_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`
    );
    appendAuditLog({
      entityType: 'admin_users',
      entityId: admin.email,
      action: 'login',
      actor: admin.email,
      previousState: null,
      newState: { email: admin.email, role: admin.role },
      details: { result: 'success' },
    });

    return res.json({
      message: 'Authenticated.',
      user: { email: admin.email, role: admin.role },
    });
  });

  app.post('/api/admin/logout', requireAdmin, (req, res) => {
    const cookies = req.headers.cookie || '';
    const sessionCookie = cookies
      .split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith('planti_session='));
    const token = sessionCookie
      ? sessionCookie.replace('planti_session=', '')
      : null;

    if (token) {
      loginSessions.delete(token);
    }

    res.setHeader(
      'Set-Cookie',
      'planti_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
    );
    appendAuditLog({
      entityType: 'admin_users',
      entityId: req.admin.email,
      action: 'logout',
      actor: req.admin.email,
      previousState: { email: req.admin.email },
      newState: null,
      details: { result: 'success' },
    });

    return res.json({ message: 'Logged out.' });
  });

  app.get('/api/admin/orders/:id', requireAdmin, (req, res) => {
    const order = findOrderByIdOrCode(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    return res.json({ order: serialiseOrder(order) });
  });

  app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
    const order = findOrderByIdOrCode(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const previous = { ...order };
    const updates = req.body || {};

    Object.assign(order, {
      status: updates.status || order.status,
      paymentStatus: updates.paymentStatus || order.paymentStatus,
      shippingStatus: updates.shippingStatus || order.shippingStatus,
      shippingCarrier: updates.shippingCarrier ?? order.shippingCarrier,
      trackingNumber: updates.trackingNumber ?? order.trackingNumber,
      shippedAt: updates.shippedAt ?? order.shippedAt,
      deliveredAt: updates.deliveredAt ?? order.deliveredAt,
      shippingNotes: updates.shippingNotes ?? order.shippingNotes,
      updatedAt: new Date().toISOString(),
    });

    if (updates.documentType) {
      order.documentType = updates.documentType;
    }

    if (order.paymentStatus === 'approved' && order.documentType !== 'ORD') {
      order.documentType = 'ORD';
    }

    appendAuditLog({
      entityType: 'orders',
      entityId: order.id,
      action: 'updated',
      actor: req.admin.email,
      previousState: previous,
      newState: { ...order },
      details: { changes: updates },
    });

    return res.json({
      message: 'Order updated successfully.',
      ...serialiseOrder(order),
    });
  });

  app.patch('/api/admin/orders/:id/shipping', requireAdmin, (req, res) => {
    const order = findOrderByIdOrCode(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const previous = { ...order };
    const {
      shippingStatus,
      shippingCarrier,
      trackingNumber,
      shippedAt,
      deliveredAt,
      shippingNotes,
    } = req.body || {};

    if (
      shippingStatus &&
      !['not_requested', 'pending', 'shipped', 'delivered'].includes(
        shippingStatus
      )
    ) {
      return res.status(400).json({ error: 'Invalid shipping status.' });
    }

    if (shippingStatus === 'delivered' && !order.shippingCarrier) {
      return res.status(400).json({ error: 'Carrier is required before delivery.' });
    }

    order.shippingStatus = shippingStatus || order.shippingStatus;
    order.shippingCarrier = shippingCarrier ?? order.shippingCarrier;
    order.trackingNumber = trackingNumber ?? order.trackingNumber;
    order.shippedAt = shippedAt ?? order.shippedAt;
    order.deliveredAt = deliveredAt ?? order.deliveredAt;
    order.shippingNotes = shippingNotes ?? order.shippingNotes;
    order.updatedAt = new Date().toISOString();

    appendAuditLog({
      entityType: 'orders',
      entityId: order.id,
      action: 'shipping_updated',
      actor: req.admin.email,
      previousState: previous,
      newState: { ...order },
      details: {
        shippingStatus: order.shippingStatus,
        shippingCarrier: order.shippingCarrier,
        trackingNumber: order.trackingNumber,
      },
    });

    return res.json({
      message: 'Shipping updated successfully.',
      ...serialiseOrder(order),
    });
  });

  app.patch('/api/admin/orders/:id/archive', requireAdmin, (req, res) => {
    const order = findOrderByIdOrCode(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const previous = { ...order };
    order.status = req.body?.status || 'archived';
    order.updatedAt = new Date().toISOString();
    order.archived = true;
    order.archivedReason = req.body?.archivedReason || 'inactive';

    appendAuditLog({
      entityType: 'orders',
      entityId: order.id,
      action: 'archived',
      actor: req.admin.email,
      previousState: previous,
      newState: { ...order },
      details: { archivedReason: order.archivedReason },
    });

    return res.json({
      message: 'Order archived successfully.',
      archived: true,
      ...serialiseOrder(order),
    });
  });

  app.patch('/api/admin/orders/:id/restore', requireAdmin, (req, res) => {
    const order = findOrderByIdOrCode(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const previous = { ...order };
    order.status = req.body?.status || 'pending';
    order.updatedAt = new Date().toISOString();
    order.archived = false;
    delete order.archivedReason;

    appendAuditLog({
      entityType: 'orders',
      entityId: order.id,
      action: 'restored',
      actor: req.admin.email,
      previousState: previous,
      newState: { ...order },
      details: { restored: true },
    });

    return res.json({
      message: 'Order restored successfully.',
      restored: true,
      ...serialiseOrder(order),
    });
  });

  app.post('/api/admin/orders/:id/evidence', requireAdmin, (req, res) => {
    const order = findOrderByIdOrCode(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const { fileName, mimeType, content, context } = req.body || {};
    if (!fileName || !mimeType || !content || !context) {
      return res.status(400).json({ error: 'fileName, mimeType, content and context are required.' });
    }

    if (!validateUpload(fileName, mimeType, content)) {
      return res.status(400).json({ error: 'Invalid or unsafe file upload.' });
    }

    const evidence = {
      id: `evidence-${randomToken(10)}`,
      orderId: order.id,
      fileName,
      mimeType,
      context,
      uploadedBy: req.admin.email,
      createdAt: new Date().toISOString(),
    };

    orderEvidence.push(evidence);
    const trail = auditLogs.filter((entry) => entry.entityId === order.id || entry.entityType === 'orders');
    appendAuditLog({
      entityType: 'shipping_evidence',
      entityId: order.id,
      action: 'evidence_uploaded',
      actor: req.admin.email,
      previousState: null,
      newState: { orderId: order.id, fileName, context },
      details: { mimeType, uploadedBy: req.admin.email },
    });

    return res.status(201).json({
      message: 'Evidence uploaded successfully.',
      evidence,
      auditTrail: trail.slice(-5),
    });
  });

  app.post('/api/admin/shipping-rates/import', requireAdmin, (req, res) => {
    const { version, provider, entries } = req.body || {};

    if (!version || !provider || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'version, provider and entries are required.' });
    }

    const record = {
      id: `shipping-v-${randomToken(10)}`,
      version,
      provider,
      entries: entries.map((entry) => ({
        postalCode: String(entry.postalCode || '').trim(),
        service: String(entry.service || '').trim(),
        price: toMoney(entry.price || 0),
      })),
      createdAt: new Date().toISOString(),
    };

    shippingRateVersions.push(record);
    appendAuditLog({
      entityType: 'shipping_rates',
      entityId: record.id,
      action: 'imported',
      actor: req.admin.email,
      previousState: null,
      newState: { version, provider },
      details: { entries: record.entries },
    });

    return res.status(201).json({
      message: 'Shipping rate import created.',
      importVersion: version,
      provider,
      versionId: record.id,
    });
  });

  app.post('/api/admin/shipping-rates/quote', requireAdmin, (req, res) => {
    const { postalCode, service, currency = 'ARS' } = req.body || {};
    const versionRecord = shippingRateVersions.findLast(
      (entry) =>
        entry.entries.some(
          (item) =>
            item.postalCode === String(postalCode || '').trim() &&
            item.service === String(service || '').trim()
        )
    );

    if (!versionRecord) {
      return res.status(404).json({ error: 'No shipping rate found for this postal code and service.' });
    }

    const selected = versionRecord.entries.find(
      (item) =>
        item.postalCode === String(postalCode || '').trim() &&
        item.service === String(service || '').trim()
    );

    return res.json({
      version: versionRecord.version,
      provider: versionRecord.provider,
      service,
      postalCode,
      currency,
      price: selected ? selected.price : '0.00',
    });
  });

  app.get('/api/admin/orders', requireAdmin, (req, res) => {
    const scope = req.query.scope || 'all';
    const list =
      scope === 'active'
        ? orders.filter((order) => !order.archived)
        : orders;

    res.json({ orders: list.map(serialiseOrder) });
  });

  app.post('/api/admin/products', requireAdmin, (req, res) => {
    const { name, slug, sku, category, price } = req.body || {};

    if (!name || !slug || !sku || !category || !price) {
      return res
        .status(400)
        .json({ error: 'name, slug, sku, category and price are required.' });
    }

    const product = {
      id: `product-${randomToken(10)}`,
      name,
      slug,
      sku,
      category,
      price: toMoney(price),
      image:
        'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=80',
      createdAt: new Date().toISOString(),
    };

    productCatalog.push(product);
    appendAuditLog({
      entityType: 'products',
      entityId: product.id,
      action: 'created',
      actor: req.admin.email,
      previousState: null,
      newState: { ...product },
      details: { createdBy: req.admin.email },
    });

    return res.status(201).json({ message: 'Product created.', product });
  });

  app.patch('/api/admin/products/:id', requireAdmin, (req, res) => {
    const product = productCatalog.find((entry) => entry.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    Object.assign(product, req.body || {});
    if (product.price) {
      product.price = toMoney(product.price);
    }

    appendAuditLog({
      entityType: 'products',
      entityId: product.id,
      action: 'updated',
      actor: req.admin.email,
      previousState: { id: product.id },
      newState: { ...product },
      details: { updatedBy: req.admin.email },
    });

    return res.json({ message: 'Product updated.', product });
  });

  app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    const index = productCatalog.findIndex(
      (entry) => entry.id === req.params.id
    );
    if (index === -1) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const [removedProduct] = productCatalog.splice(index, 1);
    appendAuditLog({
      entityType: 'products',
      entityId: removedProduct.id,
      action: 'deleted',
      actor: req.admin.email,
      previousState: { ...removedProduct },
      newState: null,
      details: { deletedBy: req.admin.email },
    });

    return res.json({ message: 'Product deleted.', product: removedProduct });
  });

  app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.originalUrl}` });
  });

  app.use((error, _req, res, _next) => {
    void _next;
    if (config.nodeEnv === 'production') {
      return res.status(500).json({ error: 'Internal server error.' });
    }

    return res.status(500).json({ error: error.message || 'Unexpected error' });
  });

  return app;
}

export function startServer(port = config.port) {
  const app = createApp();
  const server = createServer(app);

  server.listen(port, '0.0.0.0', () => {
    console.log(`API listening on http://0.0.0.0:${port}`);
  });

  return server;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  startServer();
}
