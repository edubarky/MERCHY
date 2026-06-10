-- ============================================================
-- MERCHY — Supabase Schema
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ----------------------
-- Categories
-- ----------------------
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT,
  sort_order  INTEGER DEFAULT 0,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------
-- Products
-- ----------------------
CREATE TABLE products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku              TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  description      TEXT,
  category_id      UUID REFERENCES categories(id),
  composition      TEXT,
  sizes_available  TEXT[] DEFAULT '{}',
  costo            DECIMAL(10,2) NOT NULL,
  supplier         TEXT,
  supplier_link    TEXT,
  active           BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------
-- Product Variants (colors)
-- ----------------------
CREATE TABLE product_variants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_name  TEXT NOT NULL,
  color_hex   TEXT NOT NULL,
  images      TEXT[] DEFAULT '{}',
  stock       INTEGER DEFAULT 0,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------
-- Price Tiers (global — same for all products)
-- ----------------------
CREATE TABLE price_tiers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qty_min     INTEGER NOT NULL,
  qty_max     INTEGER,            -- NULL = unlimited (500+)
  margin_pct  DECIMAL(5,4) NOT NULL,
  label       TEXT NOT NULL,      -- '1-3', '4-9', etc.
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------
-- Print Techniques
-- price_table JSON structure:
-- [{"qty_min":1,"qty_max":9,"price_per_element":45.00}, ...]
-- ----------------------
CREATE TABLE print_techniques (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  price_table  JSONB NOT NULL DEFAULT '[]',
  active       BOOLEAN DEFAULT TRUE,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------
-- Profiles (extends auth.users)
-- ----------------------
CREATE TABLE profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name        TEXT,
  phone            TEXT,
  email            TEXT,
  rfc              TEXT,
  regimen_fiscal   TEXT,
  default_address  JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------
-- Saved Logos (auth users only)
-- ----------------------
CREATE TABLE saved_logos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url       TEXT NOT NULL,
  file_name      TEXT,
  file_size      INTEGER,
  thumbnail_url  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------
-- Cart Items (auth users only — guests use localStorage)
-- sizes_breakdown: {"variant_uuid": {"S":2,"M":3,"L":1}}
-- ----------------------
CREATE TABLE cart_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id              UUID NOT NULL REFERENCES products(id),
  variant_ids             UUID[] NOT NULL DEFAULT '{}',
  quantity                INTEGER NOT NULL DEFAULT 1,
  sizes_breakdown         JSONB DEFAULT '{}',
  technique_id            UUID REFERENCES print_techniques(id),
  customization_snapshot  JSONB,
  unit_price              DECIMAL(10,2),
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------
-- Orders
-- ----------------------
CREATE TABLE orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number       TEXT NOT NULL UNIQUE,
  user_id            UUID REFERENCES auth.users(id),
  status             TEXT NOT NULL DEFAULT 'pending',
  subtotal           DECIMAL(10,2) NOT NULL,
  shipping_cost      DECIMAL(10,2) NOT NULL DEFAULT 80.00,
  discount           DECIMAL(10,2) DEFAULT 0,
  total              DECIMAL(10,2) NOT NULL,
  contact_name       TEXT NOT NULL,
  contact_phone      TEXT NOT NULL,
  contact_email      TEXT NOT NULL,
  shipping_type      TEXT NOT NULL DEFAULT 'standard',
  shipping_address   JSONB NOT NULL,
  billing_data       JSONB,
  payment_method     TEXT,
  payment_reference  TEXT,
  payment_status     TEXT DEFAULT 'pending',
  discount_code      TEXT,
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------
-- Order Items
-- variants: [{"variant_id":"...","color_name":"...","color_hex":"...","qty":5,"sizes_breakdown":{"S":2,"M":3}}]
-- ----------------------
CREATE TABLE order_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id              UUID NOT NULL REFERENCES products(id),
  product_name            TEXT NOT NULL,
  product_sku             TEXT NOT NULL,
  variants                JSONB NOT NULL DEFAULT '[]',
  total_quantity          INTEGER NOT NULL,
  technique_id            UUID REFERENCES print_techniques(id),
  technique_name          TEXT,
  num_elements            INTEGER DEFAULT 0,
  customization_snapshot  JSONB,
  unit_price              DECIMAL(10,2) NOT NULL,
  total_price             DECIMAL(10,2) NOT NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------
-- Discount Codes
-- ----------------------
CREATE TABLE discount_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,
  type          TEXT NOT NULL DEFAULT 'percentage',
  value         DECIMAL(10,2) NOT NULL,
  min_order     DECIMAL(10,2) DEFAULT 0,
  max_uses      INTEGER,
  current_uses  INTEGER DEFAULT 0,
  active        BOOLEAN DEFAULT TRUE,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_logos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items    ENABLE ROW LEVEL SECURITY;

-- Profiles: users see/edit only their own
CREATE POLICY "profiles_own" ON profiles
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Saved logos: users see/edit only their own
CREATE POLICY "saved_logos_own" ON saved_logos
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Cart: users manage only their own cart
CREATE POLICY "cart_own" ON cart_items
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Orders: users see only their own orders; anon can insert (guest checkout)
CREATE POLICY "orders_own_read" ON orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_insert" ON orders
  FOR INSERT WITH CHECK (true);

-- Order items: visible if the parent order belongs to the user
CREATE POLICY "order_items_own" ON order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );

-- Public tables (read-only for everyone)
ALTER TABLE categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_tiers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_techniques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON categories       FOR SELECT USING (true);
CREATE POLICY "public_read" ON products         FOR SELECT USING (active = true);
CREATE POLICY "public_read" ON product_variants FOR SELECT USING (active = true);
CREATE POLICY "public_read" ON price_tiers      FOR SELECT USING (true);
CREATE POLICY "public_read" ON print_techniques FOR SELECT USING (active = true);

-- ============================================================
-- TRIGGER: auto-create profile on user signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SEED DATA
-- ============================================================

-- Categories
INSERT INTO categories (name, slug, icon, sort_order) VALUES
('Playeras',       'playeras',         '👕', 1),
('Sudaderas',      'sudaderas',        '🧥', 2),
('Gorras',         'gorras',           '🧢', 3),
('Termos y Bebidas','termos-y-bebidas','☕', 4),
('Mochilas',       'mochilas',         '🎒', 5),
('Deportivo',      'deportivo',        '⚽', 6);

-- Price Tiers (global)
INSERT INTO price_tiers (qty_min, qty_max, margin_pct, label) VALUES
(1,   3,    0.6000, '1-3'),
(4,   9,    0.5500, '4-9'),
(10,  19,   0.5000, '10-19'),
(20,  49,   0.4500, '20-49'),
(50,  99,   0.4000, '50-99'),
(100, 199,  0.3500, '100-199'),
(200, 499,  0.3000, '200-499'),
(500, NULL, 0.2800, '500+');

-- Print Techniques (placeholder prices — update when real data is ready)
INSERT INTO print_techniques (name, description, price_table, sort_order) VALUES
('DTF Textil', 'Transfer digital de alta resolución, colores ilimitados',
 '[{"qty_min":1,"qty_max":9,"price_per_element":45},{"qty_min":10,"qty_max":49,"price_per_element":35},{"qty_min":50,"qty_max":199,"price_per_element":25},{"qty_min":200,"qty_max":null,"price_per_element":18}]',
 1),
('DTG', 'Impresión directa a la prenda, detalle fotográfico',
 '[{"qty_min":1,"qty_max":9,"price_per_element":55},{"qty_min":10,"qty_max":49,"price_per_element":45},{"qty_min":50,"qty_max":199,"price_per_element":35},{"qty_min":200,"qty_max":null,"price_per_element":25}]',
 2),
('Serigrafía', 'Impresión en pantalla, ideal para diseños simples y grandes volúmenes',
 '[{"qty_min":1,"qty_max":9,"price_per_element":60},{"qty_min":10,"qty_max":49,"price_per_element":40},{"qty_min":50,"qty_max":199,"price_per_element":22},{"qty_min":200,"qty_max":null,"price_per_element":15}]',
 3),
('Bordado', 'Bordado computarizado, elegante y duradero',
 '[{"qty_min":1,"qty_max":9,"price_per_element":75},{"qty_min":10,"qty_max":49,"price_per_element":60},{"qty_min":50,"qty_max":199,"price_per_element":45},{"qty_min":200,"qty_max":null,"price_per_element":35}]',
 4);
