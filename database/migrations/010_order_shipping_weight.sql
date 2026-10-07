ALTER TABLE order_shipping
  ADD COLUMN IF NOT EXISTS weight_snapshot NUMERIC(10,2);
