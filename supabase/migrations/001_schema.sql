-- ─── Enable Extensions ────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- for fuzzy text search
CREATE EXTENSION IF NOT EXISTS "unaccent";      -- for accent-insensitive search

-- ─── Profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id                TEXT PRIMARY KEY,  -- clerk user id
  email             TEXT NOT NULL UNIQUE,
  full_name         TEXT,
  phone             TEXT,
  avatar_url        TEXT,
  instagram_handle  TEXT,
  date_of_birth     DATE,
  gender            TEXT CHECK (gender IN ('female', 'male', 'other')),
  role              TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Categories ───────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url   TEXT,
  parent_id   UUID REFERENCES categories(id),
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  description         TEXT NOT NULL DEFAULT '',
  short_description   TEXT,
  category_id         UUID NOT NULL REFERENCES categories(id),
  images              TEXT[] DEFAULT '{}',
  price               INTEGER NOT NULL,         -- paise
  compare_price       INTEGER,                  -- original MRP in paise
  cost_price          INTEGER,
  sku                 TEXT NOT NULL UNIQUE,
  tags                TEXT[] DEFAULT '{}',
  material            TEXT,
  care_instructions   TEXT,
  origin              TEXT DEFAULT 'India',
  is_active           BOOLEAN DEFAULT true,
  is_featured         BOOLEAN DEFAULT false,
  weight_grams        INTEGER DEFAULT 300,
  instagram_post_ids  TEXT[] DEFAULT '{}',
  ai_description      TEXT,
  vector_id           TEXT,
  total_stock         INTEGER DEFAULT 0,
  rating_avg          NUMERIC(3,2) DEFAULT 0,
  rating_count        INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Full text search index
CREATE INDEX products_fts ON products USING GIN (
  to_tsvector('english', name || ' ' || description || ' ' || array_to_string(tags, ' '))
);
CREATE INDEX products_tags ON products USING GIN (tags);
CREATE INDEX products_category ON products (category_id);
CREATE INDEX products_active ON products (is_active, is_featured);

-- ─── Product Variants ─────────────────────────────────────────────────────────
CREATE TABLE product_variants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size            TEXT NOT NULL,
  color           TEXT NOT NULL,
  color_hex       TEXT,
  stock           INTEGER NOT NULL DEFAULT 0,
  sku             TEXT NOT NULL UNIQUE,
  price_modifier  INTEGER DEFAULT 0,  -- paise added to base price
  images          TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX variants_product ON product_variants (product_id);

-- ─── Addresses ────────────────────────────────────────────────────────────────
CREATE TABLE addresses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label       TEXT DEFAULT 'home' CHECK (label IN ('home', 'work', 'other')),
  full_name   TEXT NOT NULL,
  phone       TEXT NOT NULL,
  line1       TEXT NOT NULL,
  line2       TEXT,
  city        TEXT NOT NULL,
  state       TEXT NOT NULL,
  pincode     TEXT NOT NULL,
  is_default  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX addresses_user ON addresses (user_id);

-- ─── Coupons ──────────────────────────────────────────────────────────────────
CREATE TABLE coupons (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             TEXT NOT NULL UNIQUE,
  type             TEXT NOT NULL CHECK (type IN ('percentage', 'flat')),
  value            INTEGER NOT NULL,
  min_order_value  INTEGER,
  max_discount     INTEGER,
  usage_limit      INTEGER,
  used_count       INTEGER DEFAULT 0,
  valid_from       TIMESTAMPTZ NOT NULL,
  valid_until      TIMESTAMPTZ NOT NULL,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Orders ───────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number              TEXT NOT NULL UNIQUE,
  user_id                   TEXT NOT NULL REFERENCES profiles(id),
  status                    TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending','confirmed','processing','shipped',
               'out_for_delivery','delivered','cancelled',
               'return_requested','returned')
  ),
  payment_status            TEXT NOT NULL DEFAULT 'pending' CHECK (
    payment_status IN ('pending','paid','failed','refunded','partially_refunded')
  ),
  payment_method            TEXT NOT NULL CHECK (payment_method IN ('stripe','cod')),
  stripe_payment_intent_id  TEXT,
  stripe_payment_link       TEXT,
  subtotal                  INTEGER NOT NULL,
  discount                  INTEGER DEFAULT 0,
  shipping_charge           INTEGER DEFAULT 0,
  tax                       INTEGER DEFAULT 0,
  total                     INTEGER NOT NULL,
  coupon_code               TEXT,
  shipping_address          JSONB NOT NULL,
  billing_address           JSONB NOT NULL,
  shiprocket_order_id       TEXT,
  shiprocket_shipment_id    TEXT,
  awb_code                  TEXT,
  courier_name              TEXT,
  tracking_url              TEXT,
  notes                     TEXT,
  instagram_source          TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX orders_user ON orders (user_id);
CREATE INDEX orders_status ON orders (status);
CREATE INDEX orders_created ON orders (created_at DESC);

-- Order number sequence
CREATE SEQUENCE order_number_seq START 10001;
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'ZR' || LPAD(nextval('order_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- ─── Order Items ──────────────────────────────────────────────────────────────
CREATE TABLE order_items (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES products(id),
  variant_id     UUID REFERENCES product_variants(id),
  product_name   TEXT NOT NULL,
  variant_label  TEXT,
  image_url      TEXT NOT NULL,
  quantity       INTEGER NOT NULL,
  price          INTEGER NOT NULL,  -- paise at time of purchase
  total          INTEGER NOT NULL
);

CREATE INDEX order_items_order ON order_items (order_id);

-- ─── Cart Items ───────────────────────────────────────────────────────────────
CREATE TABLE cart_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id  UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id, variant_id)
);

CREATE INDEX cart_user ON cart_items (user_id);

-- ─── Wishlists ────────────────────────────────────────────────────────────────
CREATE TABLE wishlists (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX wishlist_user ON wishlists (user_id);

-- ─── Reviews ──────────────────────────────────────────────────────────────────
CREATE TABLE reviews (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id            UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id               TEXT NOT NULL REFERENCES profiles(id),
  order_id              UUID REFERENCES orders(id),
  rating                INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title                 TEXT,
  body                  TEXT,
  images                TEXT[] DEFAULT '{}',
  is_verified_purchase  BOOLEAN DEFAULT false,
  is_approved           BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX reviews_product ON reviews (product_id, is_approved);

-- ─── Auto-update ratings ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET
    rating_avg = (SELECT AVG(rating) FROM reviews WHERE product_id = NEW.product_id AND is_approved = true),
    rating_count = (SELECT COUNT(*) FROM reviews WHERE product_id = NEW.product_id AND is_approved = true)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_product_rating
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- ─── Auto-update total_stock ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET
    total_stock = (SELECT COALESCE(SUM(stock), 0) FROM product_variants WHERE product_id = NEW.product_id)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_product_stock
  AFTER INSERT OR UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid()::TEXT);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid()::TEXT);
CREATE POLICY "Service role full access to profiles" ON profiles USING (auth.role() = 'service_role');

-- Addresses
CREATE POLICY "Users manage own addresses" ON addresses USING (user_id = auth.uid()::TEXT);
CREATE POLICY "Service role full access to addresses" ON addresses USING (auth.role() = 'service_role');

-- Cart
CREATE POLICY "Users manage own cart" ON cart_items USING (user_id = auth.uid()::TEXT);
CREATE POLICY "Service role full access to cart" ON cart_items USING (auth.role() = 'service_role');

-- Wishlist
CREATE POLICY "Users manage own wishlist" ON wishlists USING (user_id = auth.uid()::TEXT);
CREATE POLICY "Service role full access to wishlists" ON wishlists USING (auth.role() = 'service_role');

-- Orders
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (user_id = auth.uid()::TEXT);
CREATE POLICY "Service role full access to orders" ON orders USING (auth.role() = 'service_role');

-- Order items
CREATE POLICY "Users can view items of own orders" ON order_items FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()::TEXT));
CREATE POLICY "Service role full access to order_items" ON order_items USING (auth.role() = 'service_role');

-- Reviews
CREATE POLICY "Anyone can view approved reviews" ON reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Users manage own reviews" ON reviews FOR INSERT WITH CHECK (user_id = auth.uid()::TEXT);
CREATE POLICY "Service role full access to reviews" ON reviews USING (auth.role() = 'service_role');

-- Products & Categories (public read)
CREATE POLICY "Public read products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admin manage products" ON products USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::TEXT AND role = 'admin')
);

-- ─── Seed Data: Categories ────────────────────────────────────────────────────
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Kurtas & Suits', 'kurtas-suits', 1),
  ('Sarees', 'sarees', 2),
  ('Lehengas', 'lehengas', 3),
  ('Western Wear', 'western-wear', 4),
  ('Dresses', 'dresses', 5),
  ('Tops & Tunics', 'tops-tunics', 6),
  ('Palazzos & Pants', 'palazzos-pants', 7),
  ('Dupattas & Stoles', 'dupattas-stoles', 8),
  ('Co-ord Sets', 'coord-sets', 9),
  ('Occasionwear', 'occasionwear', 10);
