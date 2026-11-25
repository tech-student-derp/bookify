-- Seller listing management additions.
-- Requires the Phase 2 back-office and Phase 5 seller ecosystem migrations.
-- Additive, preserves existing listing values and does not alter seller moderation fields.

ALTER TABLE book_listings
  ADD COLUMN IF NOT EXISTS isbn VARCHAR(20) NULL AFTER category,
  ADD COLUMN IF NOT EXISTS archived_at DATETIME NULL AFTER moderation_reason;

ALTER TABLE book_listings
  MODIFY COLUMN `condition` ENUM('New', 'Like New', 'Very Good', 'Good', 'Acceptable', 'Pre-owned') NOT NULL;

CREATE INDEX IF NOT EXISTS idx_book_listings_isbn ON book_listings (isbn);
CREATE INDEX IF NOT EXISTS idx_book_listings_seller_archive ON book_listings (seller_id, archived_at, updated_at);
