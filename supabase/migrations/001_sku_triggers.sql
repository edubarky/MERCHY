-- ============================================================
-- Migration 001 — SKU auto-generation
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Add sku column to product_variants
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE;

-- ============================================================
-- FUNCTION: generate a unique product SKU (MRCH-XXXXXX)
-- ============================================================
CREATE OR REPLACE FUNCTION generate_product_sku()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  candidate TEXT;
  chars     TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i         INTEGER;
BEGIN
  -- Only generate if SKU was not provided manually
  IF NEW.sku IS NOT NULL AND NEW.sku <> '' THEN
    RETURN NEW;
  END IF;

  LOOP
    candidate := 'MRCH-';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    EXIT WHEN NOT EXISTS (SELECT 1 FROM products WHERE sku = candidate);
  END LOOP;

  NEW.sku := candidate;
  RETURN NEW;
END;
$$;

-- ============================================================
-- FUNCTION: generate variant SKU from parent product SKU
-- Format: {product_sku}-01, -02, -03 ...
-- ============================================================
CREATE OR REPLACE FUNCTION generate_variant_sku()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  parent_sku   TEXT;
  variant_count INTEGER;
  candidate    TEXT;
BEGIN
  IF NEW.sku IS NOT NULL AND NEW.sku <> '' THEN
    RETURN NEW;
  END IF;

  SELECT sku INTO parent_sku FROM products WHERE id = NEW.product_id;

  SELECT COUNT(*) INTO variant_count
    FROM product_variants
    WHERE product_id = NEW.product_id;

  -- Use count+1 as the next index, pad to 2 digits
  candidate := parent_sku || '-' || lpad((variant_count + 1)::text, 2, '0');

  -- Collision guard (edge case: deleted variants leave gaps)
  WHILE EXISTS (SELECT 1 FROM product_variants WHERE sku = candidate) LOOP
    variant_count := variant_count + 1;
    candidate := parent_sku || '-' || lpad((variant_count + 1)::text, 2, '0');
  END LOOP;

  NEW.sku := candidate;
  RETURN NEW;
END;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS trg_product_sku ON products;
CREATE TRIGGER trg_product_sku
  BEFORE INSERT ON products
  FOR EACH ROW EXECUTE FUNCTION generate_product_sku();

DROP TRIGGER IF EXISTS trg_variant_sku ON product_variants;
CREATE TRIGGER trg_variant_sku
  BEFORE INSERT ON product_variants
  FOR EACH ROW EXECUTE FUNCTION generate_variant_sku();
