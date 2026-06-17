-- ═══════════════════════════════════════════════════════════
--  GharFix — Supabase PostgreSQL Schema
--  Run this in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ─── Enable UUID extension ────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 50),
  email         TEXT NOT NULL UNIQUE,
  password      TEXT NOT NULL,
  phone         TEXT,
  city          TEXT CHECK (city IN ('Gujranwala', 'Lahore', 'Faisalabad')) DEFAULT 'Gujranwala',
  role          TEXT CHECK (role IN ('customer', 'provider', 'admin')) DEFAULT 'customer',
  avatar        TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROVIDERS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS providers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  category        TEXT NOT NULL CHECK (category IN (
                    'Plumbing','Electrical','Carpentry','Painting',
                    'Deep Cleaning','Handyman','Bathroom','AC Service'
                  )),
  bio             TEXT CHECK (char_length(bio) <= 500),
  experience      INTEGER DEFAULT 0 CHECK (experience >= 0),
  skills          TEXT[] DEFAULT '{}',
  city            TEXT CHECK (city IN ('Gujranwala', 'Lahore', 'Faisalabad')) NOT NULL,
  area            TEXT,
  is_verified     BOOLEAN DEFAULT FALSE,
  is_available    BOOLEAN DEFAULT TRUE,
  average_rating  NUMERIC(3,1) DEFAULT 0 CHECK (average_rating BETWEEN 0 AND 5),
  total_reviews   INTEGER DEFAULT 0,
  total_jobs      INTEGER DEFAULT 0,
  hourly_rate     NUMERIC(10,2),
  currency        TEXT DEFAULT 'PKR',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_providers_city_category ON providers(city, category);
CREATE INDEX IF NOT EXISTS idx_providers_rating ON providers(average_rating DESC);

-- ─── BOOKINGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service         TEXT NOT NULL CHECK (service IN (
                    'Plumbing','Electrical','Carpentry','Painting',
                    'Deep Cleaning','Handyman','Bathroom','AC Service'
                  )),
  description     TEXT NOT NULL CHECK (char_length(description) <= 1000),
  address         TEXT NOT NULL,
  city            TEXT CHECK (city IN ('Gujranwala', 'Lahore', 'Faisalabad')) NOT NULL,
  scheduled_date  DATE NOT NULL,
  scheduled_time  TEXT NOT NULL,
  status          TEXT CHECK (status IN ('pending','confirmed','in-progress','completed','cancelled'))
                  DEFAULT 'pending',
  total_amount    NUMERIC(10,2) DEFAULT 0,
  payment_status  TEXT CHECK (payment_status IN ('unpaid','paid')) DEFAULT 'unpaid',
  cancel_reason   TEXT,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── REVIEWS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id   UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id  UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT CHECK (char_length(comment) <= 500),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Auto-update updated_at ───────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER providers_updated_at
  BEFORE UPDATE ON providers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Auto-recalculate provider rating on review insert/delete ──
CREATE OR REPLACE FUNCTION recalculate_provider_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_r NUMERIC(3,1);
  cnt   INTEGER;
BEGIN
  SELECT
    ROUND(AVG(rating)::NUMERIC, 1),
    COUNT(*)
  INTO avg_r, cnt
  FROM reviews
  WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id);

  UPDATE providers
  SET average_rating = COALESCE(avg_r, 0),
      total_reviews  = cnt
  WHERE id = COALESCE(NEW.provider_id, OLD.provider_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER reviews_rating_update
  AFTER INSERT OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION recalculate_provider_rating();
