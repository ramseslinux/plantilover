CREATE TABLE IF NOT EXISTS demo_plants (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(120) UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  sku VARCHAR(60) UNIQUE NOT NULL,
  category VARCHAR(60) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  care_level VARCHAR(30) DEFAULT 'media',
  plant_size VARCHAR(40),
  light_requirement VARCHAR(80),
  pet_friendly BOOLEAN NOT NULL DEFAULT FALSE,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE demo_plants ADD COLUMN IF NOT EXISTS plant_size VARCHAR(40);
ALTER TABLE demo_plants ADD COLUMN IF NOT EXISTS light_requirement VARCHAR(80);
ALTER TABLE demo_plants ADD COLUMN IF NOT EXISTS pet_friendly BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO demo_plants (slug, name, sku, category, price, stock, care_level, plant_size, light_requirement, pet_friendly, image_url, description)
VALUES
  ('monstera-deliciosa', 'Monstera Deliciosa', 'PL-MON-01', 'Interior', 450.00, 18, 'media', '65 cm', 'Luz indirecta', FALSE, 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=80', 'Costilla de Adán. Follaje tropical con hojas grandes y luminosas para espacios de estilo moderno.'),
  ('sansevieria-trifasciata', 'Sansevieria Trifasciata', 'PL-SAN-08', 'Interior', 280.00, 24, 'baja', '55 cm', 'Luz indirecta', FALSE, 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80', 'Lengua de Suegra, resistente y de poco riego; ideal para interiores.'),
  ('pothos-aurum', 'Pothos Dorado', 'PL-POT-12', 'Colgantes', 220.00, 32, 'baja', '40 cm', 'Luz indirecta', FALSE, 'https://images.unsplash.com/photo-1512428813834-c702c7702b78?auto=format&fit=crop&w=900&q=80', 'Planta colgante y purificadora con hojas variegadas que aportan movimiento y color.'),
  ('calathea-orbifolia', 'Calathea Orbifolia', 'PL-CAL-03', 'Interior', 360.00, 12, 'media', '45 cm', 'Luz indirecta', TRUE, 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=900&q=80', 'Hojas grandes y texturizadas para crear una atmósfera elegante y relajante.'),
  ('ficus-lyrata', 'Ficus Lyrata', 'PL-FIC-04', 'Interior', 680.00, 9, 'media', '90 cm', 'Luz brillante', FALSE, 'https://images.unsplash.com/photo-1463320726281-696a485928c7?auto=format&fit=crop&w=900&q=80', 'Excelente para salas grandes o oficinas con buena luminosidad indirecta.'),
  ('aloe-vera', 'Aloe Vera', 'PL-006', 'Medicinal', 140.00, 28, 'baja', '25 cm', 'Luz brillante', FALSE, 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=900&q=80', 'Planta fácil de cuidar con propiedades decorativas y funcionales.'),
  ('zamioculcas-zamiifolia', 'Zamioculcas', 'PL-007', 'Bajo mantenimiento', 230.00, 16, 'baja', '50 cm', 'Poca luz', FALSE, 'https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?auto=format&fit=crop&w=900&q=80', 'Larga vida útil y aspecto muy limpio, ideal para departamentos y oficinas.'),
  ('heliconia-rostrata', 'Heliconia Rostrata', 'PL-008', 'Exterior', 390.00, 11, 'alta', '80 cm', 'Sol directo', FALSE, 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=80', 'Gran presencia exterior con flores llamativas y follaje tropical.'),
  ('dracaena-marginata', 'Dracaena Marginata', 'PL-009', 'Interior', 260.00, 20, 'media', '75 cm', 'Luz brillante', FALSE, 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=900&q=80', 'Perfil elegante y vertical para espacios minimalistas y modernos.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  sku = EXCLUDED.sku,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  care_level = EXCLUDED.care_level,
  plant_size = EXCLUDED.plant_size,
  light_requirement = EXCLUDED.light_requirement,
  pet_friendly = EXCLUDED.pet_friendly,
  image_url = EXCLUDED.image_url,
  description = EXCLUDED.description;
