import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { createServer } from 'node:http';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';
import argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { config } from './config.js';

const { Pool } = pg;
const databasePool = config.databaseUrl
  ? new Pool({ connectionString: config.databaseUrl })
  : null;

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
const paymentProofs = [];
const shippingRateVersions = [];
const loginSessions = new Map();
let orderArchiveDays = 30;
const adminUsers = process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD
  ? [{
      email: process.env.ADMIN_EMAIL,
      passwordHash: await argon2.hash(process.env.ADMIN_PASSWORD),
      role: 'admin',
    }]
  : [];
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const MAX_UPLOAD_BYTES = 1024 * 1024;
const UPLOAD_MIME_EXTENSIONS = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

function randomToken(length = 24) {
  return randomBytes(length).toString('hex').slice(0, length);
}

function toMoney(value) {
  const normalized = String(value ?? 0).trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) {
    const error = new Error('Money value must be a non-negative decimal with up to two places.');
    error.statusCode = 400;
    throw error;
  }
  const cents = BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0') || '0');
  if (cents > 999999999999n) {
    const error = new Error('Money value exceeds the supported range.');
    error.statusCode = 400;
    throw error;
  }
  const whole = cents / 100n;
  const fraction = String(cents % 100n).padStart(2, '0');
  return `${whole}.${fraction}`;
}

function moneyToCents(value) {
  const [whole, fraction] = toMoney(value).split('.');
  return BigInt(whole) * 100n + BigInt(fraction);
}

function centsToMoney(cents) {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

function buildPublicOrderNumber(order) {
  return `${order.documentType}-${order.publicOrderNumberBase}`;
}

function trackingUrl(carrier, trackingNumber) {
  if (!carrier || !trackingNumber) return null;
  const code = encodeURIComponent(trackingNumber);
  const normalized = String(carrier).toLowerCase();
  if (normalized.includes('dhl')) return `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${code}`;
  if (normalized.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${code}`;
  if (normalized.includes('ups')) return `https://www.ups.com/track?tracknum=${code}`;
  if (normalized.includes('estafeta')) return `https://www.estafeta.com/Herramientas/Rastreo?guia=${code}`;
  if (normalized.includes('redpack')) return `https://www.redpack.com.mx/rastreo/?guias=${code}`;
  return null;
}

function whatsappUrl(publicOrderNumber) {
  const number = String(config.whatsappNumber || '').replace(/\D/g, '');
  if (!/^\d{8,15}$/.test(number)) return null;
  const message = `Hola, solicito información sobre el pedido ${publicOrderNumber}.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function serialiseOrder(order, { includePrivate = false } = {}) {
  const publicItems = (order.items || []).map((item) => {
    if (includePrivate) return item;
    const { productId, ...snapshot } = item;
    void productId;
    return snapshot;
  });
  return {
    ...(includePrivate ? {
      id: order.id,
      customerName: order.customerName,
      shippingProviderId: order.shippingProviderId || null,
      shippingServiceId: order.shippingServiceId || null,
      shippingRateImportId: order.shippingRateImportId || null,
      shippingWeight: order.shippingWeight ?? null,
      postalCodeSnapshot: order.postalCodeSnapshot || null,
      shippingService: order.shippingService || null,
      rateVersion: order.rateVersion || null,
      rateOriginal: order.rateOriginal ?? null,
      rateFinal: order.rateFinal ?? null,
      shippingCurrency: order.shippingCurrency || 'MXN',
      shippingManualOverride: Boolean(order.shippingManualOverride),
    } : {}),
    publicOrderNumber: buildPublicOrderNumber(order),
    publicOrderNumberBase: order.publicOrderNumberBase,
    documentType: order.documentType,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod || 'unspecified',
    shippingStatus: order.shippingStatus || 'not_requested',
    shippingCarrier: order.shippingCarrier || null,
    trackingNumber: order.trackingNumber || null,
    shippedAt: order.shippedAt || null,
    deliveredAt: order.deliveredAt || null,
    ...(includePrivate ? { shippingNotes: order.shippingNotes || null } : {}),
    trackingUrl: trackingUrl(order.shippingCarrier, order.trackingNumber),
    whatsappUrl: whatsappUrl(buildPublicOrderNumber(order)),
    subtotal: order.subtotal,
    total: order.total,
    items: publicItems,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function createPublicOrderBase() {
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = randomToken(4).toUpperCase();
  return `${dateStamp}-${suffix}`;
}

async function appendAuditLog({
  pool,
  entityType,
  entityId,
  action,
  actor,
  previousState,
  newState,
  details,
}) {
  const entry = {
    id: randomToken(8),
    entityType,
    entityId,
    action,
    actor,
    previousState,
    newState,
    details,
    createdAt: new Date().toISOString(),
  };
  auditLogs.push(entry);

  if (pool) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    await pool.query(
      `INSERT INTO audit_log (
         entity_type, entity_id, action, actor_name,
         previous_state, new_state, details, created_at
       ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8)`,
      [
        entityType,
        uuid.test(String(entityId || '')) ? entityId : null,
        action,
        actor || null,
        previousState == null ? null : JSON.stringify(previousState),
        newState == null ? null : JSON.stringify(newState),
        details == null ? null : JSON.stringify(details),
        entry.createdAt,
      ]
    );
  }

  return entry;
}

function findOrderByIdOrCode(orderIdOrPublicNumber) {
  return orders.find((order) => {
    if (order.id === orderIdOrPublicNumber) return true;
    if (order.publicOrderNumberBase === orderIdOrPublicNumber) return true;
    return buildPublicOrderNumber(order) === orderIdOrPublicNumber;
  });
}

function findOrderByPublicNumber(publicOrderNumber) {
  const match = /^(?:PED|ORD)-(\d{8}-[A-Z0-9]{4})$/.exec(publicOrderNumber);
  if (!match) return undefined;
  return orders.find((order) => order.publicOrderNumberBase === match[1]);
}

function mapDemoPlant(row) {
  return {
    id: String(row.id),
    slug: row.slug,
    name: row.name,
    sku: row.sku,
    category: row.category,
    price: toMoney(row.price),
    image: row.image_url,
    description: row.description || '',
    care: row.care_level
      ? `${row.care_level[0].toUpperCase()}${row.care_level.slice(1)}`
      : 'Media',
    size: row.plant_size || '',
    light: row.light_requirement || '',
    petFriendly: Boolean(row.pet_friendly),
    stock: Number(row.stock || 0),
  };
}

async function loadDemoPlants(pool) {
  const { rows } = await pool.query(
    `SELECT p.id::text, p.slug, p.name, p.sku, c.name AS category,
            p.price::text, p.image_url, p.description, p.care_level,
            p.plant_size, p.light_requirement, p.pet_friendly,
            p.stock_quantity AS stock
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.status = 'active'
      ORDER BY p.name`
  );
  return rows.map(mapDemoPlant);
}

function slugify(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function findOrCreateCategory(pool, categoryName) {
  const name = String(categoryName || '').trim();
  if (!name || name.length > 120) {
    const error = new Error('A valid category is required.');
    error.statusCode = 400;
    throw error;
  }
  const slug = slugify(name);
  const { rows } = await pool.query(
    `INSERT INTO categories (name, slug) VALUES ($1, $2)
     ON CONFLICT (slug) DO UPDATE SET name = categories.name
     RETURNING id::text, name, slug`,
    [name, slug]
  );
  return rows[0];
}

function validateProductImage(image) {
  if (image == null || image === '') return null;
  let parsed;
  try {
    parsed = new URL(String(image));
  } catch {
    const error = new Error('Product image must be an HTTPS URL.');
    error.statusCode = 400;
    throw error;
  }
  if (parsed.protocol !== 'https:') {
    const error = new Error('Product image must be an HTTPS URL.');
    error.statusCode = 400;
    throw error;
  }
  return parsed.href;
}

function parseShippingRateCsv(content) {
  if (typeof content !== 'string' || !content.trim() || content.length > 1_500_000) {
    const error = new Error('CSV content is empty or exceeds the size limit.');
    error.statusCode = 400;
    throw error;
  }
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (character === '"') {
      if (quoted && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && content[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (quoted) {
    const error = new Error('CSV contains an unclosed quoted field.');
    error.statusCode = 400;
    throw error;
  }
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  const headers = (rows.shift() || []).map((header) => header.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[^a-z]/g, ''));
  const column = (name) => headers.indexOf(name);
  const postalColumn = column('postalcode') >= 0 ? column('postalcode') : column('cp');
  const serviceColumn = column('service');
  const priceColumn = column('price');
  if ([postalColumn, serviceColumn, priceColumn].some((value) => value < 0)) {
    const error = new Error('CSV must include postalCode (or CP), service and price columns.');
    error.statusCode = 400;
    throw error;
  }
  return rows.map((cells) => ({
    postalCode: cells[postalColumn],
    service: cells[serviceColumn],
    zone: cells[column('zone')] || 'default',
    weightMin: cells[column('weightmin')] || 0,
    weightMax: cells[column('weightmax')] || 99999999,
    price: cells[priceColumn],
    currency: cells[column('currency')] || 'MXN',
  }));
}

async function persistOrder(pool, order) {
  if (!pool) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO orders (
         id, public_order_number_base, document_type, customer_name, status,
         payment_status, payment_method, subtotal, total, shipping_status, shipping_carrier,
         tracking_number, shipped_at, delivered_at, shipping_notes,
         archived_reason, archived_from_status, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8::numeric, $9::numeric, $10, $11,
         $12, $13, $14, $15, $16, $17, $18, $19
       )
       ON CONFLICT (public_order_number_base) DO UPDATE SET
         document_type = EXCLUDED.document_type,
         status = EXCLUDED.status,
         payment_status = EXCLUDED.payment_status,
         payment_method = EXCLUDED.payment_method,
         customer_name = EXCLUDED.customer_name,
         subtotal = EXCLUDED.subtotal,
         total = EXCLUDED.total,
         shipping_status = EXCLUDED.shipping_status,
         shipping_carrier = EXCLUDED.shipping_carrier,
         tracking_number = EXCLUDED.tracking_number,
         shipped_at = EXCLUDED.shipped_at,
         delivered_at = EXCLUDED.delivered_at,
         shipping_notes = EXCLUDED.shipping_notes,
         archived_reason = EXCLUDED.archived_reason,
         archived_from_status = EXCLUDED.archived_from_status,
         updated_at = EXCLUDED.updated_at
       RETURNING id::text`,
      [
        order.id || randomUUID(),
        order.publicOrderNumberBase,
        order.documentType,
        order.customerName || 'Cliente',
        order.status,
        order.paymentStatus,
        order.paymentMethod || 'unspecified',
        order.subtotal,
        order.total,
        order.shippingStatus || 'not_requested',
        order.shippingCarrier || null,
        order.trackingNumber || null,
        order.shippedAt || null,
        order.deliveredAt || null,
        order.shippingNotes || null,
        order.archivedReason || null,
        order.archivedPreviousStatus || null,
        order.createdAt,
        order.updatedAt,
      ]
    );
    order.id = rows[0].id;

    const existingItems = await client.query(
      'SELECT 1 FROM order_items WHERE order_id = $1 LIMIT 1',
      [order.id]
    );
    if (existingItems.rows.length === 0) {
      for (const item of order.items) {
        await client.query(
          `INSERT INTO order_items (
             id, order_id, product_id, product_name, product_sku,
             quantity, unit_price, subtotal
          ) VALUES ($1, $2, COALESCE($3::uuid, (SELECT id FROM products WHERE sku = $5 LIMIT 1)), $4, $5, $6, $7::numeric, $8::numeric)`,
          [randomUUID(), order.id,
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.productId || '') ? item.productId : null,
            item.productName, item.productSku,
            item.quantity, item.unitPrice, item.subtotal]
        );
      }
    }
    if (order.shippingStatus !== 'not_requested' || order.shippingCarrier || order.trackingNumber || order.postalCodeSnapshot || order.rateFinal != null) {
      await client.query(
        `INSERT INTO order_shipping (
           order_id, provider_id, service_id, rate_import_id,
           postal_code_snapshot, rate_original, rate_final,
           is_manual_override, tracking_number, shipping_status,
           provider_name_snapshot, service_name_snapshot, rate_version_snapshot,
           notes, shipped_at, delivered_at, rate_currency, weight_snapshot, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6::numeric, $7::numeric, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::numeric, NOW())
         ON CONFLICT (order_id) DO UPDATE SET
           provider_id = EXCLUDED.provider_id,
           service_id = EXCLUDED.service_id,
           rate_import_id = EXCLUDED.rate_import_id,
           postal_code_snapshot = EXCLUDED.postal_code_snapshot,
           rate_original = EXCLUDED.rate_original,
           rate_final = EXCLUDED.rate_final,
           is_manual_override = EXCLUDED.is_manual_override,
           tracking_number = EXCLUDED.tracking_number,
           shipping_status = EXCLUDED.shipping_status,
           provider_name_snapshot = EXCLUDED.provider_name_snapshot,
           service_name_snapshot = EXCLUDED.service_name_snapshot,
           rate_version_snapshot = EXCLUDED.rate_version_snapshot,
           notes = EXCLUDED.notes,
           shipped_at = EXCLUDED.shipped_at,
           delivered_at = EXCLUDED.delivered_at,
           rate_currency = EXCLUDED.rate_currency,
           weight_snapshot = EXCLUDED.weight_snapshot,
           updated_at = NOW()`,
        [order.id, order.shippingProviderId || null, order.shippingServiceId || null,
          order.shippingRateImportId || null, order.postalCodeSnapshot || null,
          order.rateOriginal ?? null, order.rateFinal ?? null,
          Boolean(order.shippingManualOverride), order.trackingNumber || null,
          order.shippingStatus || 'not_requested', order.shippingCarrier || null,
          order.shippingService || null, order.rateVersion || null,
          order.shippingNotes || null, order.shippedAt || null,
          order.deliveredAt || null, order.shippingCurrency || 'MXN', order.shippingWeight ?? null]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function loadOrders(pool) {
  const { rows } = await pool.query(
    `SELECT o.id::text, o.public_order_number_base, o.document_type, o.status,
            o.payment_status, o.payment_method, o.customer_name, o.subtotal::text, o.total::text,
            o.shipping_status, o.shipping_carrier, o.tracking_number, o.shipped_at,
            o.delivered_at, o.shipping_notes, o.archived_reason,
            o.archived_from_status, o.created_at, o.updated_at,
            os.provider_id::text AS provider_id, os.service_id::text AS service_id,
            os.rate_import_id::text AS rate_import_id,
            os.postal_code_snapshot, os.provider_name_snapshot,
            os.service_name_snapshot, os.rate_version_snapshot,
            os.rate_original::text AS rate_original, os.rate_final::text AS rate_final,
            os.is_manual_override, os.rate_currency, os.weight_snapshot::text AS weight_snapshot,
            COALESCE(item_rows.items,
              '[]'::json
            ) AS items
       FROM orders o
       LEFT JOIN LATERAL (
         SELECT json_agg(json_build_object(
              'productId', oi.product_id,
              'productName', oi.product_name,
              'productSku', oi.product_sku,
              'quantity', oi.quantity,
              'unitPrice', oi.unit_price::text,
              'subtotal', oi.subtotal::text
            ) ORDER BY oi.created_at) AS items
           FROM order_items oi
          WHERE oi.order_id = o.id
       ) item_rows ON TRUE
       LEFT JOIN order_shipping os ON os.order_id = o.id
      ORDER BY o.created_at`
  );

  return rows.map((row) => ({
    id: row.id,
    publicOrderNumberBase: row.public_order_number_base,
    documentType: row.document_type,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method || 'unspecified',
    customerName: row.customer_name,
    shippingStatus: row.shipping_status || 'not_requested',
    shippingCarrier: row.shipping_carrier,
    trackingNumber: row.tracking_number,
    shippedAt: row.shipped_at,
    deliveredAt: row.delivered_at,
    shippingNotes: row.shipping_notes,
    postalCodeSnapshot: row.postal_code_snapshot,
    shippingProviderId: row.provider_id,
    shippingServiceId: row.service_id,
    shippingRateImportId: row.rate_import_id,
    shippingService: row.service_name_snapshot,
    rateVersion: row.rate_version_snapshot,
    rateOriginal: row.rate_original,
    rateFinal: row.rate_final,
    shippingManualOverride: Boolean(row.is_manual_override),
    shippingCurrency: row.rate_currency || 'MXN',
    shippingWeight: row.weight_snapshot,
    subtotal: row.subtotal,
    total: row.total,
    items: row.items || [],
    archived: row.status === 'archived',
    archivedReason: row.archived_reason,
    archivedPreviousStatus: row.archived_from_status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}

async function autoArchiveStaleOrders(pool) {
  let parsedDays = orderArchiveDays;
  if (pool) {
    const setting = await pool.query(
      `SELECT value FROM app_settings WHERE key = 'order_archive_days'`
    );
    parsedDays = Number(setting.rows[0]?.value ?? 30);
  }
  const days = Number.isInteger(parsedDays) && parsedDays >= 1 && parsedDays <= 3650 ? parsedDays : 30;
  if (!pool) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    for (const order of orders) {
      if (!['pending', 'cancelled'].includes(order.status) ||
          !['pending', 'pending_review', 'rejected'].includes(order.paymentStatus) ||
          Date.parse(order.createdAt) >= cutoff) continue;
      const previousStatus = order.status;
      order.archivedPreviousStatus = previousStatus;
      order.archivedReason = 'inactivity_timeout';
      order.status = 'archived';
      order.archived = true;
      order.updatedAt = new Date().toISOString();
      await appendAuditLog({
        entityType: 'orders', entityId: order.id, action: 'auto_archived', actor: 'system',
        previousState: { status: previousStatus }, newState: { status: 'archived' },
        details: { publicOrderNumberBase: order.publicOrderNumberBase, inactivityDays: days },
      });
    }
    return;
  }
  const { rows } = await pool.query(
    `UPDATE orders
        SET archived_from_status = status,
            status = 'archived',
            archived_reason = 'inactivity_timeout',
            updated_at = NOW()
      WHERE status IN ('pending', 'cancelled')
        AND payment_status IN ('pending', 'pending_review', 'rejected')
        AND created_at < NOW() - make_interval(days => $1::int)
      RETURNING id::text, public_order_number_base, archived_from_status`,
    [days]
  );
  for (const row of rows) {
    const order = orders.find((entry) => entry.id === row.id);
    if (order) {
      order.archivedPreviousStatus = row.archived_from_status;
      order.archivedReason = 'inactivity_timeout';
      order.status = 'archived';
      order.archived = true;
      order.updatedAt = new Date().toISOString();
    }
    await appendAuditLog({
      pool,
      entityType: 'orders',
      entityId: row.id,
      action: 'auto_archived',
      actor: 'system',
      previousState: { status: row.archived_from_status },
      newState: { status: 'archived' },
      details: { publicOrderNumberBase: row.public_order_number_base, inactivityDays: days },
    });
  }
}

export async function initializeDatabase(pool) {
  const seedSql = await readFile(
    new URL('../../database/demo_plants_seed.sql', import.meta.url),
    'utf8'
  );
  await pool.query(seedSql);

  const migrationDirectory = new URL('../../database/migrations/', import.meta.url);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrations = (await readdir(migrationDirectory))
    .filter((name) => /^\d+_[a-z0-9_-]+\.sql$/i.test(name))
    .sort();

  for (const version of migrations) {
    const { rows } = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE version = $1',
      [version]
    );
    if (rows.length > 0) continue;

    const migrationSql = await readFile(new URL(version, migrationDirectory), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(migrationSql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  await pool.query(
    `INSERT INTO app_settings (key, value)
     VALUES ('order_archive_days', '30'::jsonb)
     ON CONFLICT (key) DO NOTHING`
  );

  for (const admin of adminUsers) {
    await pool.query(
      `INSERT INTO admin_users (email, password_hash, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      [admin.email, admin.passwordHash, admin.role]
    );
  }

  const legacyOrders = await pool.query(
    'SELECT order_data FROM demo_quotation_orders ORDER BY created_at'
  );
  for (const row of legacyOrders.rows) {
    const legacyOrder = row.order_data;
    const existingOrder = await pool.query(
      'SELECT 1 FROM orders WHERE public_order_number_base = $1',
      [legacyOrder.publicOrderNumberBase]
    );
    if (existingOrder.rows.length > 0) continue;
    if (!/^[0-9a-f-]{36}$/i.test(legacyOrder.id || '')) {
      legacyOrder.id = randomUUID();
    }
    legacyOrder.archived = Boolean(legacyOrder.archived || legacyOrder.status === 'archived');
    await persistOrder(pool, legacyOrder);
  }

  orders.splice(0, orders.length, ...(await loadOrders(pool)));
  const auditRows = await pool.query(
    `SELECT id::text, entity_type, entity_id::text, action, actor_name,
            previous_state, new_state, details, created_at
       FROM audit_log
      ORDER BY created_at`
  );
  auditLogs.splice(0, auditLogs.length, ...auditRows.rows.map((row) => ({
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id || row.details?.orderId || null,
    action: row.action,
    actor: row.actor_name,
    previousState: row.previous_state,
    newState: row.new_state,
    details: row.details,
    createdAt: new Date(row.created_at).toISOString(),
  })));
}

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

function decodeImageUpload(fileName, mimeType, content) {
  const extension = String(fileName || '').slice(fileName.lastIndexOf('.')).toLowerCase();
  const declaredMime = String(mimeType || '').toLowerCase();
  const dataUrl = /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=]+)$/i.exec(String(content || ''));
  const base64 = dataUrl ? dataUrl[2] : String(content || '');
  const encoded = base64.replace(/\s/g, '');

  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension) ||
      !UPLOAD_MIME_EXTENSIONS.has(declaredMime) ||
      (dataUrl && dataUrl[1].toLowerCase() !== declaredMime) ||
      !/^[a-z0-9+/]*={0,2}$/i.test(encoded) || encoded.length % 4 === 1) {
    const error = new Error('Invalid or unsafe file upload.');
    error.statusCode = 400;
    throw error;
  }

  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES ||
      bytes.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')) {
    const error = new Error('Image is empty, too large, or invalid.');
    error.statusCode = 400;
    throw error;
  }

  let detectedMime = null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) detectedMime = 'image/jpeg';
  else if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    && bytes.toString('ascii', 12, 16) === 'IHDR') detectedMime = 'image/png';
  else if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') detectedMime = 'image/webp';

  if (!detectedMime || detectedMime !== declaredMime || UPLOAD_MIME_EXTENSIONS.get(detectedMime) !== (extension === '.jpeg' ? '.jpg' : extension)) {
    const error = new Error('Image content does not match its declared type.');
    error.statusCode = 400;
    throw error;
  }

  return { bytes, mimeType: detectedMime, extension: UPLOAD_MIME_EXTENSIONS.get(detectedMime) };
}

async function storeImageUpload(uploadDirectory, fileName, mimeType, content) {
  const image = decodeImageUpload(fileName, mimeType, content);
  await mkdir(uploadDirectory, { recursive: true, mode: 0o700 });
  const storedName = `${randomUUID()}${image.extension}`;
  const filePath = join(uploadDirectory, storedName);
  await writeFile(filePath, image.bytes, { flag: 'wx', mode: 0o600 });
  return { storedName, filePath, mimeType: image.mimeType, sizeBytes: image.bytes.length };
}

function getSessionToken(req) {
  const cookies = req.headers.cookie || '';
  const sessionCookie = cookies
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('planti_session='));
  return sessionCookie ? sessionCookie.slice('planti_session='.length) : null;
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function requireAdmin(pool) {
  return async (req, res, next) => {
    const token = getSessionToken(req);
    if (!token) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      let session;
      if (pool) {
        const { rows } = await pool.query(
          `SELECT u.id::text, u.email, u.role
             FROM admin_sessions s
             JOIN admin_users u ON u.id = s.admin_user_id
            WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.is_active = TRUE`,
          [hashSessionToken(token)]
        );
        session = rows[0];
      } else {
        session = loginSessions.get(token);
        if (session && Date.now() - Date.parse(session.createdAt) >= SESSION_TTL_MS) {
          loginSessions.delete(token);
          session = null;
        }
      }

      if (!session) return res.status(401).json({ error: 'Unauthorized.' });
      if (!['admin', 'superadmin'].includes(session.role)) {
        return res.status(403).json({ error: 'Forbidden.' });
      }
      req.admin = session;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export function createApp({
  pool = null,
  uploadDirectory = fileURLToPath(new URL('../../uploads/', import.meta.url)),
} = {}) {
  const app = express();
  const adminGuard = requireAdmin(pool);

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
  const publicOrderLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many order lookups. Please try again shortly.' },
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

  app.get(['/health', '/api/health'], (_req, res) => {
    res.json({ ok: true, service: 'planti-lovers-api', env: config.nodeEnv });
  });

  app.get('/api/products', asyncHandler(async (_req, res) => {
    const items = pool ? await loadDemoPlants(pool) : productCatalog;
    res.json({ items: items.map((product) => ({ ...product, id: product.slug })) });
  }));

  app.get('/api/products/:slug', asyncHandler(async (req, res) => {
    const catalog = pool ? await loadDemoPlants(pool) : productCatalog;
    const product = catalog.find(
      (item) => item.slug === req.params.slug
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    return res.json({ item: { ...product, id: product.slug } });
  }));

  app.get('/api/categories', asyncHandler(async (_req, res) => {
    if (pool) {
      const { rows } = await pool.query(
        `SELECT DISTINCT c.name
           FROM categories c JOIN products p ON p.category_id = c.id
          WHERE p.status = 'active' ORDER BY c.name`
      );
      return res.json({ items: rows.map((row) => row.name) });
    }
    return res.json({ items: [...new Set(productCatalog.map((product) => product.category))] });
  }));

  app.post('/api/orders', asyncHandler(async (req, res) => {
    const { items, customerName } = req.body || {};

    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      return res.status(400).json({ error: 'Cart items are required.' });
    }
    if (customerName !== undefined && (typeof customerName !== 'string' || customerName.trim().length > 120)) {
      return res.status(400).json({ error: 'Customer name must be 120 characters or fewer.' });
    }

    const catalog = pool ? await loadDemoPlants(pool) : productCatalog;
    const requestedQuantities = new Map();
    const snapshotItems = items.map((item) => {
      const quantity = Number(item.quantity || 0);
      const product = catalog.find(
        (entry) => String(entry.slug) === String(item.productId) || String(entry.id) === String(item.productId)
      );

      if (!product) {
        const error = new Error('Product not found.');
        error.statusCode = 400;
        throw error;
      }

      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 10000) {
        const error = new Error('Quantity must be a positive integer.');
        error.statusCode = 400;
        throw error;
      }
      const requested = (requestedQuantities.get(product.id) || 0) + quantity;
      requestedQuantities.set(product.id, requested);
      if (Number.isFinite(Number(product.stock)) && requested > Number(product.stock)) {
        const error = new Error(`Only ${Number(product.stock)} units of ${product.name} are available.`);
        error.statusCode = 400;
        throw error;
      }

      const unitPrice = toMoney(product.price);
      const subtotal = centsToMoney(moneyToCents(unitPrice) * BigInt(quantity));

      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity,
        unitPrice,
        subtotal,
      };
    });

    const subtotal = snapshotItems.reduce(
      (sum, item) => sum + moneyToCents(item.subtotal), 0n
    );
    if (subtotal > 999999999999n) {
      return res.status(400).json({ error: 'Quotation total exceeds the supported range.' });
    }
    const publicOrderNumberBase = createPublicOrderBase();
    const order = {
      id: randomUUID(),
      publicOrderNumberBase,
      documentType: 'PED',
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'unspecified',
      customerName: customerName || 'Guest',
      shippingStatus: 'not_requested',
      shippingCarrier: null,
      trackingNumber: null,
      shippedAt: null,
      deliveredAt: null,
      shippingNotes: null,
      subtotal: centsToMoney(subtotal),
      total: centsToMoney(subtotal),
      items: snapshotItems,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await persistOrder(pool, order);
    orders.push(order);
    await appendAuditLog({
      pool,
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
  }));

  app.get('/api/orders/:publicOrderNumber', publicOrderLimiter, (req, res) => {
    const order = findOrderByPublicNumber(req.params.publicOrderNumber);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    return res.json(serialiseOrder(order));
  });

  app.post('/api/orders/:publicOrderNumber/payment-proof', asyncHandler(async (req, res) => {
    const { fileName, mimeType, content } = req.body || {};
    const order = findOrderByPublicNumber(req.params.publicOrderNumber);

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (!fileName || !mimeType || !content) {
      return res.status(400).json({ error: 'Invalid or unsafe file upload.' });
    }

    const stored = await storeImageUpload(uploadDirectory, fileName, mimeType, content);

    const proof = {
      id: randomUUID(),
      orderId: order.id,
      fileName,
      storedName: stored.storedName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      filePath: stored.filePath,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
    };

    const previousPaymentStatus = order.paymentStatus;
    order.paymentStatus = 'pending_review';
    order.paymentMethod = 'transfer';
    order.updatedAt = new Date().toISOString();
    try {
      if (pool) {
        await pool.query(
          `INSERT INTO payment_proofs (
             id, order_id, file_name, file_path, mime_type, size_bytes,
             uploaded_by, status, original_file_name
           ) VALUES ($1, $2, $3, $4, $5, $6, 'customer', $7, $8)`,
          [proof.id, order.id, stored.storedName, stored.filePath, stored.mimeType,
            stored.sizeBytes, proof.status, fileName]
        );
      } else {
        paymentProofs.push(proof);
      }
      await persistOrder(pool, order);
    } catch (error) {
      await unlink(stored.filePath).catch(() => {});
      if (pool) await pool.query('DELETE FROM payment_proofs WHERE id = $1', [proof.id]).catch(() => {});
      order.paymentStatus = previousPaymentStatus;
      throw error;
    }

    await appendAuditLog({
      pool,
      entityType: 'payment_proofs',
      entityId: proof.id,
      action: 'uploaded',
      actor: 'customer',
      previousState: { paymentStatus: previousPaymentStatus },
      newState: { orderId: order.id, fileName, paymentStatus: order.paymentStatus },
      details: { mimeType },
    });

    return res.status(201).json({
      message: 'Payment proof received.',
      publicOrderNumber: buildPublicOrderNumber(order),
      fileName,
      paymentStatus: 'pending_review',
      proof: {
        id: proof.id,
        fileName: proof.fileName,
        mimeType: proof.mimeType,
        sizeBytes: proof.sizeBytes,
        status: proof.status,
        createdAt: proof.createdAt,
      },
    });
  }));

  app.post('/api/admin/login', loginLimiter, asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: 'Email and password are required.' });
    }

    let admin;
    if (pool) {
      const { rows } = await pool.query(
        `SELECT id::text, email, password_hash, role
           FROM admin_users
          WHERE lower(email) = lower($1) AND is_active = TRUE`,
        [String(email)]
      );
      admin = rows[0]
        ? { id: rows[0].id, email: rows[0].email, passwordHash: rows[0].password_hash, role: rows[0].role }
        : null;
    } else {
      admin = adminUsers.find(
        (user) => user.email.toLowerCase() === String(email).toLowerCase()
      );
    }
    if (!pool && adminUsers.length === 0) {
      return res.status(503).json({ error: 'Admin credentials are not configured.' });
    }
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
    const createdAt = new Date();
    if (pool) {
      await pool.query('DELETE FROM admin_sessions WHERE expires_at <= NOW()');
      await pool.query(
        `INSERT INTO admin_sessions (token_hash, admin_user_id, expires_at)
         VALUES ($1, $2, $3)`,
        [hashSessionToken(token), admin.id, new Date(createdAt.getTime() + SESSION_TTL_MS)]
      );
    } else {
      loginSessions.set(token, {
        email: admin.email,
        role: admin.role,
        createdAt: createdAt.toISOString(),
      });
    }

    res.setHeader(
      'Set-Cookie',
      `planti_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${config.nodeEnv === 'production' ? '; Secure' : ''}`
    );
    await appendAuditLog({
      pool,
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
  }));

  app.post('/api/admin/logout', adminGuard, asyncHandler(async (req, res) => {
    const token = getSessionToken(req);
    if (token && pool) {
      await pool.query('DELETE FROM admin_sessions WHERE token_hash = $1', [hashSessionToken(token)]);
    } else if (token) {
      loginSessions.delete(token);
    }

    res.setHeader(
      'Set-Cookie',
      `planti_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${config.nodeEnv === 'production' ? '; Secure' : ''}`
    );
    await appendAuditLog({
      pool,
      entityType: 'admin_users',
      entityId: req.admin.email,
      action: 'logout',
      actor: req.admin.email,
      previousState: { email: req.admin.email },
      newState: null,
      details: { result: 'success' },
    });

    return res.json({ message: 'Logged out.' });
  }));

  app.get('/api/admin/orders/:id', adminGuard, (req, res) => {
    const order = findOrderByIdOrCode(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    return res.json({ order: serialiseOrder(order, { includePrivate: true }) });
  });

  app.patch('/api/admin/orders/:id', adminGuard, asyncHandler(async (req, res) => {
    const order = findOrderByIdOrCode(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const previous = { ...order };
    const updates = req.body || {};
    if (order.status === 'archived' || updates.status === 'archived') {
      return res.status(409).json({ error: 'Use the archive and restore actions to manage historical orders.' });
    }
    if (['shippingStatus', 'shippingCarrier', 'trackingNumber', 'shippedAt', 'deliveredAt', 'shippingNotes'].some((key) => updates[key] !== undefined)) {
      return res.status(400).json({ error: 'Use the dedicated shipping endpoint to update shipment details.' });
    }
    if (updates.status && !['pending', 'paid', 'processing', 'shipping', 'delivered', 'cancelled', 'archived'].includes(updates.status)) {
      return res.status(400).json({ error: 'Invalid order status.' });
    }
    if (updates.paymentStatus && !['pending', 'pending_review', 'approved', 'rejected', 'refunded'].includes(updates.paymentStatus)) {
      return res.status(400).json({ error: 'Invalid payment status.' });
    }
    if (updates.paymentMethod && !['cash', 'transfer', 'other', 'unspecified'].includes(updates.paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method.' });
    }
    if (updates.documentType && !['PED', 'ORD'].includes(updates.documentType)) {
      return res.status(400).json({ error: 'Invalid document type.' });
    }

    Object.assign(order, {
      status: updates.status || order.status,
      paymentStatus: updates.paymentStatus || order.paymentStatus,
      paymentMethod: updates.paymentMethod || order.paymentMethod || 'unspecified',
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
      if (order.status === 'pending') order.status = 'paid';
    }

    await persistOrder(pool, order);
    if (pool && ['approved', 'rejected'].includes(updates.paymentStatus)) {
      await pool.query(
        `UPDATE payment_proofs SET status = $1
          WHERE order_id = $2 AND status = 'pending_review'`,
        [updates.paymentStatus, order.id]
      );
    } else if (!pool && ['approved', 'rejected'].includes(updates.paymentStatus)) {
      paymentProofs.filter((proof) => proof.orderId === order.id && proof.status === 'pending_review')
        .forEach((proof) => { proof.status = updates.paymentStatus; });
    }

    await appendAuditLog({
      pool,
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
      ...serialiseOrder(order, { includePrivate: true }),
    });
  }));

  app.patch('/api/admin/orders/:id/shipping', adminGuard, asyncHandler(async (req, res) => {
    const order = findOrderByIdOrCode(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const previous = { ...order };
    const {
      shippingStatus,
      shippingCarrier,
      shippingService,
      trackingNumber,
      shippedAt,
      deliveredAt,
      shippingNotes,
      postalCodeSnapshot,
      rateVersion,
      rateOriginal,
      rateFinal,
      shippingManualOverride,
      shippingCurrency,
      shippingWeight,
    } = req.body || {};

    if (
      shippingStatus &&
      !['not_requested', 'pending', 'shipped', 'delivered'].includes(
        shippingStatus
      )
    ) {
      return res.status(400).json({ error: 'Invalid shipping status.' });
    }

    if (shippingStatus === 'delivered' && !(shippingCarrier || order.shippingCarrier)) {
      return res.status(400).json({ error: 'Carrier is required before delivery.' });
    }
    if (shippingStatus === 'shipped' && (!(shippingCarrier || order.shippingCarrier) || !(trackingNumber || order.trackingNumber))) {
      return res.status(400).json({ error: 'Carrier and tracking number are required before marking an order shipped.' });
    }
    if (shippingStatus === 'delivered' && order.shippingStatus !== 'shipped' && order.shippingStatus !== 'delivered') {
      return res.status(409).json({ error: 'Mark the order shipped before marking it delivered.' });
    }
    if (postalCodeSnapshot != null && !/^\d{5}$/.test(String(postalCodeSnapshot))) {
      return res.status(400).json({ error: 'Postal code must contain five digits.' });
    }
    if (shippingNotes != null && String(shippingNotes).length > 1000) {
      return res.status(400).json({ error: 'Shipping notes cannot exceed 1000 characters.' });
    }
    if (shippingManualOverride != null && typeof shippingManualOverride !== 'boolean') {
      return res.status(400).json({ error: 'Manual override must be a boolean.' });
    }
    if (shippingCurrency != null && !/^[A-Z]{3}$/.test(String(shippingCurrency).toUpperCase())) {
      return res.status(400).json({ error: 'Shipping currency must be a three-letter code.' });
    }
    if (shippingWeight !== undefined && (!Number.isFinite(Number(shippingWeight)) || Number(shippingWeight) < 0)) {
      return res.status(400).json({ error: 'Shipping weight must be a non-negative number.' });
    }
    for (const id of [req.body.providerId, req.body.serviceId, req.body.rateImportId]) {
      if (id != null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id))) {
        return res.status(400).json({ error: 'Shipping rate identifiers must be valid UUIDs.' });
      }
    }

    order.shippingStatus = shippingStatus || order.shippingStatus;
    order.shippingCarrier = shippingCarrier ?? order.shippingCarrier;
    order.shippingService = shippingService ?? order.shippingService;
    order.trackingNumber = trackingNumber ?? order.trackingNumber;
    order.shippedAt = shippedAt ?? (shippingStatus === 'shipped' ? order.shippedAt || new Date().toISOString() : order.shippedAt);
    order.deliveredAt = deliveredAt ?? (shippingStatus === 'delivered' ? new Date().toISOString() : order.deliveredAt);
    order.shippingNotes = shippingNotes ?? order.shippingNotes;
    order.postalCodeSnapshot = postalCodeSnapshot ?? order.postalCodeSnapshot;
    order.shippingProviderId = req.body.providerId === undefined ? order.shippingProviderId : req.body.providerId;
    order.shippingServiceId = req.body.serviceId === undefined ? order.shippingServiceId : req.body.serviceId;
    order.shippingRateImportId = req.body.rateImportId === undefined ? order.shippingRateImportId : req.body.rateImportId;
    order.rateVersion = rateVersion ?? order.rateVersion;
    order.rateOriginal = rateOriginal === undefined ? order.rateOriginal : toMoney(rateOriginal);
    order.rateFinal = rateFinal === undefined ? order.rateFinal : toMoney(rateFinal);
    order.shippingManualOverride = shippingManualOverride ?? order.shippingManualOverride;
    order.shippingCurrency = shippingCurrency ?? order.shippingCurrency ?? 'MXN';
    order.shippingWeight = shippingWeight ?? order.shippingWeight;
    if (rateFinal !== undefined) {
      order.total = centsToMoney(moneyToCents(order.subtotal) + moneyToCents(order.rateFinal));
    }
    order.updatedAt = new Date().toISOString();

    await persistOrder(pool, order);

    await appendAuditLog({
      pool,
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
      ...serialiseOrder(order, { includePrivate: true }),
    });
  }));

  app.patch('/api/admin/orders/:id/archive', adminGuard, asyncHandler(async (req, res) => {
    const order = findOrderByIdOrCode(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    if (!['pending', 'cancelled'].includes(order.status) || ['approved', 'refunded'].includes(order.paymentStatus)) {
      return res.status(409).json({ error: 'Only unpaid inactive orders can be moved to history.' });
    }

    const previous = { ...order };
    order.archivedPreviousStatus = order.status === 'archived'
      ? order.archivedPreviousStatus || 'pending'
      : order.status;
    order.status = 'archived';
    order.updatedAt = new Date().toISOString();
    order.archived = true;
    order.archivedReason = req.body?.archivedReason || 'inactive';

    await persistOrder(pool, order);

    await appendAuditLog({
      pool,
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
      ...serialiseOrder(order, { includePrivate: true }),
    });
  }));

  app.patch('/api/admin/orders/:id/restore', adminGuard, asyncHandler(async (req, res) => {
    const order = findOrderByIdOrCode(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const previous = { ...order };
    order.status = order.archivedPreviousStatus || 'pending';
    order.updatedAt = new Date().toISOString();
    order.archived = false;
    delete order.archivedReason;
    delete order.archivedPreviousStatus;

    await persistOrder(pool, order);

    await appendAuditLog({
      pool,
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
      ...serialiseOrder(order, { includePrivate: true }),
    });
  }));

  app.get('/api/admin/settings/order-archive', adminGuard, asyncHandler(async (_req, res) => {
    if (!pool) return res.json({ days: orderArchiveDays });
    const { rows } = await pool.query(
      `SELECT value FROM app_settings WHERE key = 'order_archive_days'`
    );
    return res.json({ days: Number(rows[0]?.value ?? 30) });
  }));

  app.patch('/api/admin/settings/order-archive', adminGuard, asyncHandler(async (req, res) => {
    const days = Number(req.body?.days);
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      return res.status(400).json({ error: 'Archive period must be a whole number from 1 to 3650 days.' });
    }
    if (!pool) orderArchiveDays = days;
    if (pool) {
      await pool.query(
        `INSERT INTO app_settings (key, value, updated_by, updated_at)
         VALUES ('order_archive_days', $1::jsonb, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value,
           updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
        [JSON.stringify(days), req.admin.email]
      );
    }
    await appendAuditLog({
      pool,
      entityType: 'app_settings',
      entityId: null,
      action: 'order_archive_period_updated',
      actor: req.admin.email,
      previousState: null,
      newState: { days },
      details: { days },
    });
    return res.json({ message: 'Archive period updated.', days });
  }));

  app.get('/api/admin/orders/:id/evidence', adminGuard, asyncHandler(async (req, res) => {
    const order = findOrderByIdOrCode(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (pool) {
      const { rows } = await pool.query(
        `SELECT id::text, original_file_name, mime_type, size_bytes, context,
                uploaded_by, created_at
           FROM shipping_evidence
          WHERE order_id = $1 ORDER BY created_at`,
        [order.id]
      );
      return res.json({ evidence: rows.map((row) => ({
        id: row.id,
        fileName: row.original_file_name,
        mimeType: row.mime_type,
        sizeBytes: Number(row.size_bytes),
        context: row.context,
        uploadedBy: row.uploaded_by,
        createdAt: new Date(row.created_at).toISOString(),
      })) });
    }
    return res.json({ evidence: orderEvidence
      .filter((entry) => entry.orderId === order.id)
      .map(({ id, fileName, mimeType, sizeBytes, context, uploadedBy, createdAt }) =>
        ({ id, fileName, mimeType, sizeBytes, context, uploadedBy, createdAt })) });
  }));

  app.get('/api/admin/orders/:id/evidence/:evidenceId/file', adminGuard, asyncHandler(async (req, res, next) => {
    const order = findOrderByIdOrCode(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    let evidence;
    if (pool) {
      const { rows } = await pool.query(
        `SELECT file_path, mime_type, original_file_name
           FROM shipping_evidence WHERE id = $1 AND order_id = $2`,
        [req.params.evidenceId, order.id]
      );
      evidence = rows[0];
    } else {
      evidence = orderEvidence.find((entry) =>
        entry.id === req.params.evidenceId && entry.orderId === order.id
      );
    }
    if (!evidence) return res.status(404).json({ error: 'Evidence not found.' });
    res.set('Content-Type', evidence.mime_type || evidence.mimeType);
    res.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(evidence.original_file_name || evidence.fileName)}`);
    res.set('X-Content-Type-Options', 'nosniff');
    return res.sendFile(evidence.file_path || evidence.filePath, (error) => {
      if (error) next(error);
    });
  }));

  app.get('/api/admin/orders/:id/payment-proofs', adminGuard, asyncHandler(async (req, res) => {
    const order = findOrderByIdOrCode(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (pool) {
      const { rows } = await pool.query(
        `SELECT id::text, original_file_name, mime_type, size_bytes, status, uploaded_by, created_at
           FROM payment_proofs WHERE order_id = $1 ORDER BY created_at`,
        [order.id]
      );
      return res.json({ proofs: rows.map((row) => ({
        id: row.id,
        fileName: row.original_file_name,
        mimeType: row.mime_type,
        sizeBytes: Number(row.size_bytes),
        status: row.status,
        uploadedBy: row.uploaded_by,
        createdAt: new Date(row.created_at).toISOString(),
      })) });
    }
    return res.json({ proofs: paymentProofs
      .filter((proof) => proof.orderId === order.id)
      .map(({ id, fileName, mimeType, sizeBytes, status, createdAt }) =>
        ({ id, fileName, mimeType, sizeBytes, status, createdAt })) });
  }));

  app.get('/api/admin/orders/:id/payment-proofs/:proofId/file', adminGuard, asyncHandler(async (req, res, next) => {
    const order = findOrderByIdOrCode(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    let proof;
    if (pool) {
      const { rows } = await pool.query(
        `SELECT file_path, mime_type, original_file_name
           FROM payment_proofs WHERE id = $1 AND order_id = $2`,
        [req.params.proofId, order.id]
      );
      proof = rows[0];
    } else {
      proof = paymentProofs.find((entry) =>
        entry.id === req.params.proofId && entry.orderId === order.id
      );
    }
    if (!proof) return res.status(404).json({ error: 'Payment proof not found.' });
    res.set('Content-Type', proof.mime_type || proof.mimeType);
    res.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(proof.original_file_name || proof.fileName)}`);
    res.set('X-Content-Type-Options', 'nosniff');
    return res.sendFile(proof.file_path || proof.filePath, (error) => {
      if (error) next(error);
    });
  }));

  app.patch('/api/admin/orders/:id/payment-proofs/:proofId', adminGuard, asyncHandler(async (req, res) => {
    const order = findOrderByIdOrCode(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    const { status } = req.body || {};
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Proof status must be approved or rejected.' });
    }

    let proof;
    if (pool) {
      const { rows } = await pool.query(
        `UPDATE payment_proofs SET status = $1
          WHERE id = $2 AND order_id = $3
          RETURNING id::text, original_file_name, status`,
        [status, req.params.proofId, order.id]
      );
      proof = rows[0];
    } else {
      proof = paymentProofs.find((entry) =>
        entry.id === req.params.proofId && entry.orderId === order.id
      );
      if (proof) proof.status = status;
    }
    if (!proof) return res.status(404).json({ error: 'Payment proof not found.' });

    const previous = { paymentStatus: order.paymentStatus, documentType: order.documentType, status: order.status };
    order.paymentStatus = status;
    if (status === 'approved') {
      order.documentType = 'ORD';
      if (order.status === 'pending') order.status = 'paid';
    }
    order.updatedAt = new Date().toISOString();
    await persistOrder(pool, order);
    await appendAuditLog({
      pool,
      entityType: 'payment_proofs',
      entityId: order.id,
      action: `proof_${status}`,
      actor: req.admin.email,
      previousState: previous,
      newState: { paymentStatus: order.paymentStatus, documentType: order.documentType, status: order.status },
      details: { proofId: proof.id, fileName: proof.original_file_name || proof.fileName },
    });
    return res.json({ message: 'Payment proof reviewed.', status, ...serialiseOrder(order, { includePrivate: true }) });
  }));

  app.post('/api/admin/orders/:id/evidence', adminGuard, asyncHandler(async (req, res) => {
    const order = findOrderByIdOrCode(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const { fileName, mimeType, content, context } = req.body || {};
    if (!fileName || !mimeType || !content || !context) {
      return res.status(400).json({ error: 'fileName, mimeType, content and context are required.' });
    }

    const stored = await storeImageUpload(uploadDirectory, fileName, mimeType, content);

    const evidence = {
      id: randomUUID(),
      orderId: order.id,
      fileName,
      storedName: stored.storedName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      filePath: stored.filePath,
      context,
      uploadedBy: req.admin.email,
      createdAt: new Date().toISOString(),
    };

    try {
      if (pool) {
        await pool.query(
          `INSERT INTO shipping_evidence (
             id, order_id, file_name, file_path, mime_type, size_bytes,
             context, uploaded_by, original_file_name
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [evidence.id, order.id, stored.storedName, stored.filePath,
            stored.mimeType, stored.sizeBytes, context, req.admin.email, fileName]
        );
      } else {
        orderEvidence.push(evidence);
      }
    } catch (error) {
      await unlink(stored.filePath).catch(() => {});
      throw error;
    }
    await appendAuditLog({
      pool,
      entityType: 'shipping_evidence',
      entityId: order.id,
      action: 'evidence_uploaded',
      actor: req.admin.email,
      previousState: null,
      newState: { orderId: order.id, fileName, context },
      details: { mimeType, uploadedBy: req.admin.email },
    });
    const trail = auditLogs.filter((entry) =>
      entry.entityId === order.id || entry.details?.orderId === order.id
    );

    return res.status(201).json({
      message: 'Evidence uploaded successfully.',
      evidence: {
        id: evidence.id,
        fileName: evidence.fileName,
        mimeType: evidence.mimeType,
        sizeBytes: evidence.sizeBytes,
        context: evidence.context,
        uploadedBy: evidence.uploadedBy,
        createdAt: evidence.createdAt,
      },
      auditTrail: trail.slice(-5),
    });
  }));

  app.post('/api/admin/shipping-rates/import', adminGuard, asyncHandler(async (req, res) => {
    const { version, provider, csvContent, entries: requestEntries } = req.body || {};
    const entries = Array.isArray(requestEntries)
      ? requestEntries
      : parseShippingRateCsv(csvContent);

    if (!String(version || '').trim() || String(version).length > 120 || !String(provider || '').trim() || String(provider).length > 160 || !Array.isArray(entries) || entries.length === 0 || entries.length > 50000) {
      return res.status(400).json({ error: 'A valid version, provider and 1 to 50000 rate entries are required.' });
    }
    if (entries.some((entry) => !entry || typeof entry !== 'object' || Array.isArray(entry))) {
      return res.status(400).json({ error: 'Each shipping rate entry must be an object.' });
    }

    const normalizedEntries = entries.map((entry) => ({
      postalCode: String(entry.postalCode || '').trim(),
      service: String(entry?.service || '').trim(),
      zone: String(entry.zone || 'default').trim(),
      weightMin: Number(entry.weightMin ?? 0),
      weightMax: Number(entry.weightMax ?? 99999999),
      price: toMoney(entry.price),
      currency: String(entry.currency || 'MXN').trim().toUpperCase(),
    }));
    if (normalizedEntries.some((entry) =>
      !/^\d{5}$/.test(entry.postalCode) || !entry.service || entry.service.length > 160 || !entry.zone || entry.zone.length > 60 ||
      !Number.isFinite(entry.weightMin) || !Number.isFinite(entry.weightMax) ||
      entry.weightMin < 0 || entry.weightMax < entry.weightMin || entry.weightMax > 99999999.99 ||
      !/^[A-Z]{3}$/.test(entry.currency)
    )) {
      return res.status(400).json({ error: 'Shipping rate entries contain invalid postal codes, service, weight, zone or currency.' });
    }

    const sourceFileName = String(req.body.sourceFileName || (csvContent ? 'rates.csv' : 'api-json')).slice(0, 255);
    const sourceHash = createHash('sha256').update(csvContent || JSON.stringify(normalizedEntries)).digest('hex');
    const record = {
      id: `shipping-v-${randomToken(10)}`,
      version,
      provider,
      entries: normalizedEntries,
      createdAt: new Date().toISOString(),
    };

    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const providerCode = String(provider).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'provider';
        const providerResult = await client.query(
          `INSERT INTO shipping_providers (name, code)
           VALUES ($1, $2)
           ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [provider, providerCode]
        );
        const importResult = await client.query(
          `INSERT INTO shipping_rate_imports (
             version_name, provider_id, source_file_name, source_hash, imported_by, status
           ) VALUES ($1, $2, $3, $4, $5, 'active')
           RETURNING id::text`,
          [version, providerResult.rows[0].id, sourceFileName, sourceHash, req.admin.email]
        );
        const importId = importResult.rows[0].id;

        for (const entry of normalizedEntries) {
          const serviceCode = entry.service.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'service';
          const serviceResult = await client.query(
            `INSERT INTO shipping_services (provider_id, name, code)
             VALUES ($1, $2, $3)
             ON CONFLICT (provider_id, code) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [providerResult.rows[0].id, entry.service, serviceCode]
          );
          await client.query(
            `INSERT INTO shipping_rates (
               rate_import_id, service_id, postal_code, zone,
               weight_min, weight_max, price, currency
             ) VALUES ($1, $2, $3, $4, $5, $6, $7::numeric, $8)
             ON CONFLICT (rate_import_id, service_id, postal_code, zone)
             DO UPDATE SET weight_min = EXCLUDED.weight_min,
                           weight_max = EXCLUDED.weight_max,
                           price = EXCLUDED.price,
                           currency = EXCLUDED.currency`,
            [importId, serviceResult.rows[0].id, entry.postalCode, entry.zone,
              entry.weightMin, entry.weightMax, entry.price, entry.currency]
          );
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else {
      shippingRateVersions.push(record);
    }
    await appendAuditLog({
      pool,
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
  }));

  app.post('/api/admin/shipping-rates/quote', adminGuard, asyncHandler(async (req, res) => {
    const { postalCode, service, weight = 0, currency = 'MXN' } = req.body || {};
    if (!/^\d{5}$/.test(String(postalCode || '').trim()) || !String(service || '').trim() ||
        !Number.isFinite(Number(weight)) || Number(weight) < 0) {
      return res.status(400).json({ error: 'A five-digit postal code, service and non-negative weight are required.' });
    }
    if (pool) {
      const { rows } = await pool.query(
        `SELECT ri.id::text AS rate_import_id, s.id::text AS service_id,
                p.id::text AS provider_id, ri.version_name AS version,
                p.name AS provider, s.name AS service, r.postal_code,
                r.currency, r.price::text AS price
           FROM shipping_rates r
           JOIN shipping_rate_imports ri ON ri.id = r.rate_import_id
           JOIN shipping_services s ON s.id = r.service_id
           JOIN shipping_providers p ON p.id = s.provider_id
          WHERE r.postal_code = $1 AND (s.name = $2 OR s.code = $2)
            AND ri.status = 'active'
            AND r.weight_min <= $3 AND r.weight_max >= $3
          ORDER BY ri.imported_at DESC
          LIMIT 1`,
        [String(postalCode).trim(), String(service).trim(), Number(weight)]
      );
      if (!rows[0]) {
        return res.status(404).json({ error: 'No shipping rate found for this postal code and service.' });
      }
      return res.json({ ...rows[0], postalCode: String(rows[0].postal_code).trim(), currency: rows[0].currency || currency, weight: Number(weight) });
    }

    const versionRecord = shippingRateVersions.findLast(
      (entry) =>
        entry.entries.some(
          (item) =>
            item.postalCode === String(postalCode || '').trim() &&
            item.service === String(service || '').trim() &&
            Number(item.weightMin) <= Number(weight) && Number(item.weightMax) >= Number(weight)
        )
    );

    if (!versionRecord) {
      return res.status(404).json({ error: 'No shipping rate found for this postal code and service.' });
    }

    const selected = versionRecord.entries.find(
      (item) =>
        item.postalCode === String(postalCode || '').trim() &&
        item.service === String(service || '').trim() &&
        Number(item.weightMin) <= Number(weight) && Number(item.weightMax) >= Number(weight)
    );

    return res.json({
      version: versionRecord.version,
      provider: versionRecord.provider,
      service,
      postalCode,
      currency: selected.currency || currency,
      price: selected ? selected.price : '0.00',
    });
  }));

  app.get('/api/admin/orders', adminGuard, asyncHandler(async (req, res) => {
    await autoArchiveStaleOrders(pool);
    const scope = req.query.scope || 'all';
    const list = scope === 'active'
      ? orders.filter((order) => !order.archived)
      : scope === 'archived'
        ? orders.filter((order) => order.archived)
        : orders;

    res.json({ orders: list.map((order) => serialiseOrder(order, { includePrivate: true })) });
  }));

  app.post('/api/admin/products', adminGuard, asyncHandler(async (req, res) => {
    const { name, slug, sku, category, price } = req.body || {};

    if (typeof name !== 'string' || !name.trim() || typeof sku !== 'string' || !sku.trim() ||
        typeof category !== 'string' || !category.trim() || price === undefined) {
      return res
        .status(400)
        .json({ error: 'name, sku, category and price are required.' });
    }
    const productSlug = slug || slugify(name);
    const image = validateProductImage(req.body.image);
    const stock = req.body.stock === undefined ? 0 : req.body.stock;
    if (!Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ error: 'Stock must be a non-negative integer.' });
    }
    if (String(name).length > 180 || String(sku).length > 90 || !productSlug || String(productSlug).length > 180) {
      return res.status(400).json({ error: 'Product name, SKU or slug is invalid.' });
    }

    let product;
    if (pool) {
      const categoryRow = await findOrCreateCategory(pool, category);
      const { rows } = await pool.query(
        `INSERT INTO products (
           category_id, slug, name, sku, price, stock_quantity, status,
           image_url, description, care_level, plant_size,
           light_requirement, pet_friendly
         ) VALUES ($1, $2, $3, $4, $5::numeric, $6, 'active', $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          categoryRow.id,
          productSlug,
          name,
          sku,
          toMoney(price),
          stock,
          image || 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=80',
          req.body.description || '',
          String(req.body.care || 'Media').toLowerCase(),
          req.body.size || null,
          req.body.light || null,
          req.body.petFriendly === true,
        ]
      );
      const { rows: categoryRows } = await pool.query('SELECT name FROM categories WHERE id = $1', [categoryRow.id]);
      product = mapDemoPlant({ ...rows[0], category: categoryRows[0]?.name, stock: rows[0].stock_quantity });
    } else {
      product = {
        id: `product-${randomToken(10)}`,
        name,
        slug: productSlug,
        sku,
        category,
        price: toMoney(price),
        image:
          image || 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=80',
        createdAt: new Date().toISOString(),
      };
      productCatalog.push(product);
    }
    await appendAuditLog({
      pool,
      entityType: 'products',
      entityId: product.id,
      action: 'created',
      actor: req.admin.email,
      previousState: null,
      newState: { ...product },
      details: { createdBy: req.admin.email },
    });

    return res.status(201).json({ message: 'Product created.', product });
  }));

  app.patch('/api/admin/products/:id', adminGuard, asyncHandler(async (req, res) => {
    let product;
    const updates = req.body || {};
    const allowedFields = new Set(['name', 'slug', 'sku', 'category', 'price', 'description', 'image', 'stock', 'care', 'size', 'light', 'petFriendly']);
    if (Object.keys(updates).some((key) => !allowedFields.has(key))) {
      return res.status(400).json({ error: 'Product update contains unsupported fields.' });
    }
    if (updates.image !== undefined) updates.image = validateProductImage(updates.image);
    if (updates.price !== undefined) updates.price = toMoney(updates.price);
    if (updates.stock !== undefined && (!Number.isInteger(updates.stock) || updates.stock < 0)) {
      return res.status(400).json({ error: 'Stock must be a non-negative integer.' });
    }
    if (updates.name !== undefined && (typeof updates.name !== 'string' || !updates.name.trim() || updates.name.length > 180)) {
      return res.status(400).json({ error: 'Product name is invalid.' });
    }
    if (updates.sku !== undefined && (typeof updates.sku !== 'string' || !updates.sku.trim() || updates.sku.length > 90)) {
      return res.status(400).json({ error: 'Product SKU is invalid.' });
    }
    if (updates.slug !== undefined && (!slugify(updates.slug) || String(updates.slug).length > 180)) {
      return res.status(400).json({ error: 'Product slug is invalid.' });
    }
    if (updates.petFriendly !== undefined && typeof updates.petFriendly !== 'boolean') {
      return res.status(400).json({ error: 'Pet-friendly flag must be a boolean.' });
    }
    if (updates.category !== undefined && (typeof updates.category !== 'string' || !updates.category.trim() || updates.category.length > 120)) {
      return res.status(400).json({ error: 'Product category is invalid.' });
    }
    if (pool) {
      const { rows: currentRows } = await pool.query(
        `SELECT p.*, c.name AS category FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.id::text = $1 AND p.status <> 'archived'`,
        [req.params.id]
      );
      const previousProduct = currentRows[0] ? mapDemoPlant({
        ...currentRows[0], stock: currentRows[0].stock_quantity,
      }) : null;
      if (!previousProduct) return res.status(404).json({ error: 'Product not found.' });
      let categoryId = null;
      if (updates.category !== undefined) categoryId = (await findOrCreateCategory(pool, updates.category)).id;
      const { rows } = await pool.query(
        `UPDATE products SET
           category_id = COALESCE($2, category_id),
           name = COALESCE($3, name),
           slug = COALESCE($4, slug),
           sku = COALESCE($5, sku),
           price = COALESCE($6::numeric, price),
           description = COALESCE($7, description),
           image_url = COALESCE($8, image_url),
           stock_quantity = COALESCE($9, stock_quantity),
           care_level = COALESCE($10, care_level),
           plant_size = COALESCE($11, plant_size),
           light_requirement = COALESCE($12, light_requirement),
           pet_friendly = COALESCE($13, pet_friendly),
           updated_at = NOW()
         WHERE id::text = $1 AND status <> 'archived'
         RETURNING *`,
        [
          req.params.id,
          categoryId,
          updates.name ?? null,
          updates.slug ?? null,
          updates.sku ?? null,
          updates.price ?? null,
          updates.description ?? null,
          updates.image ?? null,
          updates.stock ?? null,
          updates.care?.toLowerCase() ?? null,
          updates.size ?? null,
          updates.light ?? null,
          updates.petFriendly ?? null,
        ]
      );
      if (rows[0]) {
        const { rows: categories } = await pool.query(
          `SELECT c.name FROM categories c WHERE c.id = $1`, [rows[0].category_id]
        );
        product = mapDemoPlant({ ...rows[0], category: categories[0]?.name, stock: rows[0].stock_quantity });
      }
      req.previousProduct = previousProduct;
    } else {
      product = productCatalog.find((entry) => entry.id === req.params.id);
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    if (!pool) {
      Object.assign(product, updates);
    }

    await appendAuditLog({
      pool,
      entityType: 'products',
      entityId: product.id,
      action: 'updated',
      actor: req.admin.email,
      previousState: pool ? req.previousProduct : { id: product.id },
      newState: { ...product },
      details: { updatedBy: req.admin.email },
    });

    return res.json({ message: 'Product updated.', product });
  }));

  app.delete('/api/admin/products/:id', adminGuard, asyncHandler(async (req, res) => {
    let removedProduct;
    if (pool) {
      const { rows } = await pool.query(
        `UPDATE products SET status = 'archived', updated_at = NOW()
          WHERE id::text = $1 AND status <> 'archived' RETURNING *`,
        [req.params.id]
      );
      if (rows[0]) {
        const { rows: categories } = await pool.query('SELECT name FROM categories WHERE id = $1', [rows[0].category_id]);
        removedProduct = mapDemoPlant({ ...rows[0], category: categories[0]?.name, stock: rows[0].stock_quantity });
      }
    } else {
      const index = productCatalog.findIndex(
        (entry) => entry.id === req.params.id
      );
      removedProduct = index === -1 ? null : productCatalog.splice(index, 1)[0];
    }
    if (!removedProduct) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    await appendAuditLog({
      pool,
      entityType: 'products',
      entityId: removedProduct.id,
      action: 'deleted',
      actor: req.admin.email,
      previousState: { ...removedProduct },
      newState: null,
      details: { deletedBy: req.admin.email },
    });

    return res.json({ message: 'Product deleted.', product: removedProduct });
  }));

  app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.originalUrl}` });
  });

  app.use((error, _req, res, _next) => {
    void _next;
    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    if (config.nodeEnv === 'production' || statusCode >= 500) {
      return res.status(statusCode).json({ error: statusCode === 500 ? 'Internal server error.' : error.message });
    }
    return res.status(statusCode).json({ error: error.message || 'Invalid request.' });
  });

  return app;
}

export async function startServer(port = config.port) {
  if (config.nodeEnv === 'production') {
    const required = ['DATABASE_URL', 'SESSION_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
    const missing = required.filter((name) => !process.env[name]);
    if (missing.length) throw new Error(`Missing production environment values: ${missing.join(', ')}`);
    if (process.env.SESSION_SECRET.length < 32 || process.env.ADMIN_PASSWORD.length < 12) {
      throw new Error('Production session secret or administrator password is too short.');
    }
  }
  if (databasePool) {
    await initializeDatabase(databasePool);
  }

  const app = createApp({ pool: databasePool });
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
  startServer().catch((error) => {
    if (config.nodeEnv === 'production') console.error('API startup failed. Check production configuration and database availability.');
    else console.error('API startup failed:', error);
    process.exitCode = 1;
  });
}
