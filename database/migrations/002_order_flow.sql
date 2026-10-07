ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_status VARCHAR(30) DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR(120),
  ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(120),
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipping_notes TEXT;

CREATE TABLE IF NOT EXISTS shipping_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  code VARCHAR(60) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES shipping_providers(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  code VARCHAR(80) NOT NULL,
  tracking_template TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_id, code)
);

CREATE TABLE IF NOT EXISTS shipping_rate_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_name VARCHAR(120) NOT NULL,
  provider_id UUID REFERENCES shipping_providers(id) ON DELETE SET NULL,
  source_file_name VARCHAR(255) NOT NULL,
  source_hash VARCHAR(128),
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  imported_by VARCHAR(180) NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'rejected'))
);

CREATE TABLE IF NOT EXISTS shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_import_id UUID NOT NULL REFERENCES shipping_rate_imports(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES shipping_services(id) ON DELETE CASCADE,
  postal_code CHAR(5) NOT NULL,
  zone VARCHAR(60) NOT NULL,
  weight_min NUMERIC(10,2) NOT NULL,
  weight_max NUMERIC(10,2) NOT NULL,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rate_import_id, service_id, postal_code, zone)
);

CREATE TABLE IF NOT EXISTS order_shipping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES shipping_providers(id) ON DELETE SET NULL,
  service_id UUID REFERENCES shipping_services(id) ON DELETE SET NULL,
  rate_import_id UUID REFERENCES shipping_rate_imports(id) ON DELETE SET NULL,
  postal_code_snapshot CHAR(5),
  rate_original NUMERIC(12,2),
  rate_final NUMERIC(12,2),
  is_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  tracking_number VARCHAR(120),
  shipping_status VARCHAR(30) NOT NULL DEFAULT 'not_requested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  context VARCHAR(80) NOT NULL,
  uploaded_by VARCHAR(180) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipping_rates_postal_code ON shipping_rates(postal_code);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_service_id ON shipping_rates(service_id);
CREATE INDEX IF NOT EXISTS idx_order_shipping_order_id ON order_shipping(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_evidence_order_id ON shipping_evidence(order_id);
