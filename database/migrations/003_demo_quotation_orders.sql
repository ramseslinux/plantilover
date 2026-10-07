CREATE TABLE IF NOT EXISTS demo_quotation_orders (
  id VARCHAR(80) PRIMARY KEY,
  public_order_number_base VARCHAR(32) NOT NULL UNIQUE,
  document_type VARCHAR(10) NOT NULL DEFAULT 'PED',
  customer_name VARCHAR(180) NOT NULL,
  order_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_demo_quotation_orders_created_at
  ON demo_quotation_orders(created_at DESC);
