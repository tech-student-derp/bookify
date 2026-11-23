-- Bookify Phase 5: Seller Ecosystem migration (MariaDB 10.4+)
-- Additive and re-runnable. Existing records in users, book_listings, orders, and order_items are preserved.
-- Apply Phase 2, Phase 3, and Phase 4 migrations first.
--
-- Change Log (v1.4 Final Safety Review):
-- 1. Idempotent Inventory Initialization: Replaced blanket UPDATE on unavailable listings with a safe 3-step sequence:
--    a) Add stock_quantity as nullable (NULL DEFAULT NULL).
--    b) Initialize existing 'available' listings to 1, and 'unavailable' listings to 0 (only where stock_quantity IS NULL).
--    c) Enforce NOT NULL DEFAULT 1.
--    Rerun guarantee: On subsequent runs, rows already have non-null stock_quantity, so legitimate stock counts
--    (including items with stock_quantity > 0 that are temporarily marked 'unavailable') are NEVER overwritten.
-- 2. Format Snapshot Backfill: Step-based backfill populates format_snapshot from book_listings.format only where
--    format_snapshot IS NULL. No blanket fallback to 'Physical'; unresolvable orphans cause NOT NULL to halt.
-- 3. Digital-Only Seller Profiles: Courier pickup address fields in seller_profiles remain NULLABLE to support e-book sellers.
-- 4. Historical Commission Disambiguation: commission_rate, commission_amount, and seller_net_amount remain
--    NULL DEFAULT NULL for clear legacy record separation.
-- 5. Merchant Record Preservation: seller_profiles maintains ON DELETE RESTRICT on user_id.

-- ── 1. Book listing inventory & digital references ───────────────────────────
-- Step A: Add stock_quantity as nullable to distinguish unmigrated rows from legitimate post-migration inventory counts.
ALTER TABLE book_listings
  ADD COLUMN IF NOT EXISTS stock_quantity INT UNSIGNED NULL DEFAULT NULL AFTER availability;

-- Step B: Reconcile pre-existing inventory: available listings receive 1 copy; unavailable listings receive 0.
-- On rerun, stock_quantity is already non-null, ensuring legitimate post-migration stock values are never overwritten.
UPDATE book_listings
SET stock_quantity = 1
WHERE stock_quantity IS NULL AND availability = 'available';

UPDATE book_listings
SET stock_quantity = 0
WHERE stock_quantity IS NULL AND availability = 'unavailable';

-- Step C: Enforce NOT NULL and establish DEFAULT 1 for all future listing inserts.
ALTER TABLE book_listings
  MODIFY COLUMN stock_quantity INT UNSIGNED NOT NULL DEFAULT 1;

-- Add ebook_file_path for digital e-book storage references (nullable, only populated for E-books).
ALTER TABLE book_listings
  ADD COLUMN IF NOT EXISTS ebook_file_path VARCHAR(500) NULL AFTER cover_image_path;

-- ── 2. Seller-specific order item fulfillment, format & commission snapshots ──
-- Step A: Add format_snapshot as nullable to allow migration-safe backfill without assuming all items are physical.
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS format_snapshot ENUM('Physical', 'E-book') NULL DEFAULT NULL AFTER author_snapshot;

-- Step B: Backfill format_snapshot strictly from the referenced book listing format.
-- Precondition: Production environments must ensure no orphan records exist where book_listing_id or format is NULL.
UPDATE order_items oi
JOIN book_listings b ON b.id = oi.book_listing_id
SET oi.format_snapshot = b.format
WHERE oi.format_snapshot IS NULL AND b.format IS NOT NULL;

-- Step C: Enforce NOT NULL and establish DEFAULT 'Physical' for future order lines.
ALTER TABLE order_items
  MODIFY COLUMN format_snapshot ENUM('Physical', 'E-book') NOT NULL DEFAULT 'Physical';

-- Track item-level seller confirmation and fulfillment (including digital access grant).
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS fulfillment_status ENUM('pending', 'confirmed', 'declined', 'dispatched', 'access_granted') NOT NULL DEFAULT 'pending' AFTER unit_price;

-- Historical commission rate applied at time of purchase. NULL indicates legacy or non-commissioned transaction.
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) NULL DEFAULT NULL AFTER fulfillment_status;

-- Historical platform commission amount in PHP currency. NULL indicates legacy transaction.
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) NULL DEFAULT NULL AFTER commission_rate;

-- Historical seller net earnings amount in PHP currency. NULL indicates legacy transaction.
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS seller_net_amount DECIMAL(10,2) NULL DEFAULT NULL AFTER commission_amount;

-- Composite index for fast querying of seller items by fulfillment status.
CREATE INDEX IF NOT EXISTS idx_order_items_seller_fulfillment
  ON order_items (seller_id, fulfillment_status);

-- ── 3. Seller Store Profiles ──────────────────────────────────────────────────
-- One-to-one extension of users table for approved sellers.
-- Uses ON DELETE RESTRICT to preserve merchant legal, transaction, and dispute records.
-- Courier pickup address fields are NULLABLE to support digital-only (E-book) sellers.
CREATE TABLE IF NOT EXISTS seller_profiles (
  user_id               INT UNSIGNED NOT NULL,
  store_name            VARCHAR(150) NOT NULL,
  bio                   TEXT NULL,
  logo_path             VARCHAR(500) NULL,
  banner_path           VARCHAR(500) NULL,
  pickup_address_line   VARCHAR(255) NULL,
  pickup_barangay       VARCHAR(120) NULL,
  pickup_city           VARCHAR(120) NULL,
  pickup_province       VARCHAR(120) NULL,
  pickup_region         VARCHAR(120) NULL,
  pickup_postal_code    VARCHAR(12) NULL,
  pickup_contact        VARCHAR(20) NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_seller_profiles_store_name (store_name),
  KEY idx_seller_profiles_region_city (pickup_region, pickup_city),
  CONSTRAINT fk_seller_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
