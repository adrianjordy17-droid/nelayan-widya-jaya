-- ============================================================
-- UD. Nelayan Widya Jaya — Supabase Schema
-- Run this in your Supabase SQL editor to bootstrap the database
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES (extends auth.users with role & display name)
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 'staff');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 2. CLIENTS (database klien)
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  type        TEXT DEFAULT 'Perorangan',
  contact     TEXT,
  phone       TEXT,
  address     TEXT,
  rating      INT DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  active      BOOLEAN DEFAULT true,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 3. PRODUCTS / STOCK (stok ikan)
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  qty         NUMERIC(10,2) DEFAULT 0,
  unit        TEXT DEFAULT 'kg',
  min_qty     NUMERIC(10,2) DEFAULT 10,
  price       NUMERIC(12,2) NOT NULL DEFAULT 0,
  location    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 4. ORDERS (order penjualan)
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.orders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_no    TEXT UNIQUE NOT NULL,
  client_id   UUID REFERENCES public.clients(id),
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','proses','selesai','batal')),
  total       NUMERIC(14,2) DEFAULT 0,
  catatan     TEXT,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  qty         NUMERIC(10,2) NOT NULL,
  unit        TEXT DEFAULT 'kg',
  price       NUMERIC(12,2) NOT NULL,
  subtotal    NUMERIC(14,2) GENERATED ALWAYS AS (qty * price) STORED
);

-- Auto-generate order number
CREATE OR REPLACE FUNCTION public.generate_order_no()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_no := 'ORD-' || TO_CHAR(now(), 'YYYYMM') || '-' || LPAD(nextval('order_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS order_seq START 1;
CREATE TRIGGER set_order_no BEFORE INSERT ON public.orders
  FOR EACH ROW WHEN (NEW.order_no IS NULL)
  EXECUTE PROCEDURE public.generate_order_no();

-- ────────────────────────────────────────────────────────────
-- 5. ATTENDANCE (absensi selfie)
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.attendance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.profiles(id),
  type        TEXT DEFAULT 'masuk' CHECK (type IN ('masuk', 'keluar')),
  check_time  TIMESTAMPTZ DEFAULT now(),
  photo_url   TEXT,
  status      TEXT DEFAULT 'hadir' CHECK (status IN ('hadir', 'telat', 'absen')),
  latitude    NUMERIC(10,6),
  longitude   NUMERIC(10,6),
  notes       TEXT
);

-- ────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Everyone can see their own profile; owner/admin see all
CREATE POLICY "profiles_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_admin_read" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
  );

-- Authenticated users read clients & products
CREATE POLICY "clients_authenticated_read" ON public.clients
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "clients_admin_write" ON public.clients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
  );

CREATE POLICY "products_authenticated_read" ON public.products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "products_write" ON public.products
  FOR ALL USING (auth.role() = 'authenticated');

-- Orders: all authenticated can read; staff can insert
CREATE POLICY "orders_authenticated" ON public.orders
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "order_items_authenticated" ON public.order_items
  FOR ALL USING (auth.role() = 'authenticated');

-- Attendance: users see own; admin/owner see all
CREATE POLICY "attendance_own" ON public.attendance
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "attendance_insert_own" ON public.attendance
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "attendance_admin_read" ON public.attendance
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
  );

-- ────────────────────────────────────────────────────────────
-- 7. SEED DEMO USERS (run AFTER creating users in Supabase Auth)
-- Replace UUIDs with actual user IDs from auth.users
-- ────────────────────────────────────────────────────────────
-- UPDATE public.profiles SET name = 'Jordy', role = 'owner' WHERE id = '<jordy-uuid>';
-- UPDATE public.profiles SET name = 'April', role = 'admin' WHERE id = '<april-uuid>';
-- UPDATE public.profiles SET name = 'Bimbim', role = 'staff' WHERE id = '<bimbim-uuid>';
-- UPDATE public.profiles SET name = 'Wowo', role = 'staff' WHERE id = '<wowo-uuid>';
