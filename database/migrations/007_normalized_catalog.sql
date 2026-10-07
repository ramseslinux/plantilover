ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS care_level VARCHAR(30) NOT NULL DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS plant_size VARCHAR(40),
  ADD COLUMN IF NOT EXISTS light_requirement VARCHAR(80),
  ADD COLUMN IF NOT EXISTS pet_friendly BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO categories (name, slug)
SELECT DISTINCT category,
       trim(both '-' FROM regexp_replace(lower(category), '[^a-z0-9]+', '-', 'g'))
  FROM demo_plants
 WHERE trim(category) <> ''
ON CONFLICT DO NOTHING;

INSERT INTO products (
  category_id, name, slug, sku, description, price, stock_quantity, status,
  image_url, care_level, plant_size, light_requirement, pet_friendly
)
SELECT c.id, p.name, p.slug, p.sku, p.description, p.price, p.stock, 'active',
       p.image_url, COALESCE(p.care_level, 'media'), p.plant_size,
       p.light_requirement, p.pet_friendly
  FROM demo_plants p
  LEFT JOIN categories c
    ON c.slug = trim(both '-' FROM regexp_replace(lower(p.category), '[^a-z0-9]+', '-', 'g'))
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_products_category_status
  ON products(category_id, status);

CREATE INDEX IF NOT EXISTS idx_products_name
  ON products(name);
