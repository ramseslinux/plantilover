ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(180) NOT NULL DEFAULT 'Cliente',
  ADD COLUMN IF NOT EXISTS archived_reason TEXT,
  ADD COLUMN IF NOT EXISTS archived_from_status VARCHAR(40);

CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
  ON orders(status, created_at DESC);
