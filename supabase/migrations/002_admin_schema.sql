-- ============================================================
-- Migration 002 — Admin schema: roles, stock, suppliers,
--                 clients, statuses, quotes, projects
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. PROFILES — add role field
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer'
  CHECK (role IN ('customer', 'agent', 'admin'));

-- Update handle_new_user trigger to include role
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  );
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. PRODUCT VARIANTS — add stock_infinite
-- ============================================================
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS stock_infinite BOOLEAN NOT NULL DEFAULT TRUE;

-- ============================================================
-- 3. SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  contact_name TEXT,
  phone        TEXT,
  email        TEXT,
  website      TEXT,
  notes        TEXT,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Link products to suppliers (FK, nullable)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

-- ============================================================
-- 4. CLIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  contact_name TEXT,
  phone        TEXT,
  email        TEXT,
  company      TEXT,
  rfc          TEXT,
  notes        TEXT,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. PRODUCTION STATUSES (configurable)
-- ============================================================
CREATE TABLE IF NOT EXISTS production_statuses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  color      TEXT NOT NULL DEFAULT '#6B7280',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO production_statuses (name, color, sort_order) VALUES
  ('En Compras',             '#6366F1', 1),
  ('En Recolección',         '#8B5CF6', 2),
  ('Por Iniciar Producción', '#F59E0B', 3),
  ('En Producción',          '#EF4444', 4),
  ('Producción Lista',       '#3B82F6', 5),
  ('Envío en tránsito',      '#06B6D4', 6),
  ('Entregado',              '#22C55E', 7)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 6. QUOTES (cotizaciones compartibles)
-- ============================================================
CREATE TABLE IF NOT EXISTS quotes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token          TEXT UNIQUE,
  agent_id       UUID NOT NULL REFERENCES auth.users(id),
  client_id      UUID REFERENCES clients(id) ON DELETE SET NULL,
  items          JSONB NOT NULL DEFAULT '[]',
  notes          TEXT,
  customer_email TEXT,
  status         TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'viewed', 'converted', 'expired')),
  expires_at     TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generate_quote_token()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  candidate TEXT;
  chars     TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i         INTEGER;
BEGIN
  IF NEW.token IS NOT NULL THEN RETURN NEW; END IF;
  LOOP
    candidate := 'MRCH-Q-';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM quotes WHERE token = candidate);
  END LOOP;
  NEW.token := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_token ON quotes;
CREATE TRIGGER trg_quote_token
  BEFORE INSERT ON quotes
  FOR EACH ROW EXECUTE FUNCTION generate_quote_token();

-- ============================================================
-- 7. PROJECTS (seguimiento de producción)
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS project_number_seq START 1;

CREATE TABLE IF NOT EXISTS projects (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number        TEXT UNIQUE,
  order_id              UUID REFERENCES orders(id) ON DELETE SET NULL,
  quote_id              UUID REFERENCES quotes(id) ON DELETE SET NULL,
  agent_id              UUID REFERENCES auth.users(id),
  client_id             UUID REFERENCES clients(id) ON DELETE SET NULL,
  status_id             UUID REFERENCES production_statuses(id),
  product_description   TEXT,
  total_amount          DECIMAL(10,2) DEFAULT 0,
  notes                 TEXT,
  approved_at           TIMESTAMPTZ,
  scheduled_delivery_at TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  client_name TEXT;
  prod_desc   TEXT;
  next_num    INTEGER;
  parts       TEXT;
BEGIN
  IF NEW.project_number IS NOT NULL THEN RETURN NEW; END IF;

  SELECT name INTO client_name FROM clients WHERE id = NEW.client_id;
  prod_desc := NEW.product_description;

  next_num := nextval('project_number_seq');

  parts := 'MERCHY_'
    || upper(regexp_replace(COALESCE(client_name, 'CLIENTE'), '[^A-Za-z0-9]+', '_', 'g'));

  IF prod_desc IS NOT NULL AND prod_desc <> '' THEN
    parts := parts || '_'
      || upper(regexp_replace(prod_desc, '[^A-Za-z0-9]+', '_', 'g'));
  END IF;

  parts := parts || '_' || lpad(next_num::text, 3, '0');

  NEW.project_number := parts;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_number ON projects;
CREATE TRIGGER trg_project_number
  BEFORE INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION generate_project_number();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 8. RLS
-- ============================================================
ALTER TABLE suppliers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects           ENABLE ROW LEVEL SECURITY;

-- Public read for suppliers/clients/statuses (auth users only)
CREATE POLICY "agents_read_suppliers"  ON suppliers          FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "agents_write_suppliers" ON suppliers          USING (auth.role() = 'authenticated');
CREATE POLICY "agents_read_clients"    ON clients            FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "agents_write_clients"   ON clients            USING (auth.role() = 'authenticated');
CREATE POLICY "anyone_read_statuses"   ON production_statuses FOR SELECT USING (true);
CREATE POLICY "agents_write_statuses"  ON production_statuses USING (auth.role() = 'authenticated');

-- Quotes: agents see their own; public can read by token
CREATE POLICY "quotes_agent_own"   ON quotes FOR SELECT USING (auth.uid() = agent_id);
CREATE POLICY "quotes_public_token" ON quotes FOR SELECT USING (true);
CREATE POLICY "quotes_agent_insert" ON quotes FOR INSERT WITH CHECK (auth.uid() = agent_id);
CREATE POLICY "quotes_agent_update" ON quotes FOR UPDATE USING (auth.uid() = agent_id);

-- Projects: authenticated users
CREATE POLICY "projects_auth_read"  ON projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "projects_auth_write" ON projects USING (auth.role() = 'authenticated');

-- ============================================================
-- NOTE: Create Supabase Storage bucket manually:
--   Name: product-images
--   Public: true
--   Allowed MIME types: image/jpeg, image/png, image/webp
-- ============================================================
