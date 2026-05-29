-- ============================================================
-- OITAKU IMPORT — database/schema.sql
-- Run this once on your Railway Postgres instance
-- Command: psql $DATABASE_URL -f database/schema.sql
-- ============================================================

-- Listings table (cached car data from all sources)
CREATE TABLE IF NOT EXISTS listings (
  id           SERIAL PRIMARY KEY,
  external_id  VARCHAR(255) UNIQUE NOT NULL,
  name         VARCHAR(500),
  brand        VARCHAR(100),
  model        VARCHAR(200),
  year         INTEGER,
  km           INTEGER,
  price        INTEGER,          -- EUR
  local_price  VARCHAR(50),      -- ¥ or ₩ formatted
  grade        VARCHAR(10),
  source       VARCHAR(50),      -- 'encar', 'yahoo-jp', etc.
  country      CHAR(2),          -- 'jp' or 'kr'
  type         VARCHAR(20),      -- 'auction' or 'occasion'
  volant       VARCHAR(10),      -- 'right' or 'left'
  trans        VARCHAR(50),
  carbu        VARCHAR(50),
  cv           INTEGER,
  image_url    TEXT,
  listing_url  TEXT,
  fetched_at   TIMESTAMP DEFAULT NOW(),
  created_at   TIMESTAMP DEFAULT NOW()
);

-- Index for fast search queries
CREATE INDEX IF NOT EXISTS idx_listings_brand    ON listings(brand);
CREATE INDEX IF NOT EXISTS idx_listings_source   ON listings(source);
CREATE INDEX IF NOT EXISTS idx_listings_year     ON listings(year);
CREATE INDEX IF NOT EXISTS idx_listings_price    ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_fetched  ON listings(fetched_at);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_listings_fts ON listings USING gin(
  to_tsvector('english', coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(model,''))
);

-- Alerts table (save user search alerts)
CREATE TABLE IF NOT EXISTS alerts (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255),
  query      VARCHAR(500),
  brand      VARCHAR(100),
  model      VARCHAR(200),
  year_min   INTEGER,
  year_max   INTEGER,
  km_max     INTEGER,
  budget_max INTEGER,
  volant     VARCHAR(10),
  sources    TEXT[],
  active     BOOLEAN DEFAULT TRUE,
  last_sent  TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Favorites table (server-side persistence for favorites)
CREATE TABLE IF NOT EXISTS favorites (
  id          SERIAL PRIMARY KEY,
  session_id  VARCHAR(255),
  external_id VARCHAR(255),
  saved_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_favorites_session ON favorites(session_id);

-- Cleanup old listings (older than 48h) — run periodically
-- DELETE FROM listings WHERE fetched_at < NOW() - INTERVAL '48 hours';
