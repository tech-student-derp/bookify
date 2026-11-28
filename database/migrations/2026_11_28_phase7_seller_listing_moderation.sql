-- Phase 7: seller listing drafts, review states, metadata, and private image records.
-- Requires the Phase 2, Phase 5, and 2026_11_25 seller listing migrations.
-- Additive: existing legacy `pending` values and listing records are preserved.

ALTER TABLE book_listings
  ADD COLUMN IF NOT EXISTS publisher VARCHAR(255) NULL AFTER author,
  ADD COLUMN IF NOT EXISTS language VARCHAR(100) NULL AFTER category,
  ADD COLUMN IF NOT EXISTS ebook_file_format ENUM('PDF', 'EPUB') NULL AFTER ebook_file_path,
  ADD COLUMN IF NOT EXISTS ebook_authorized_at DATETIME NULL AFTER ebook_file_format,
  ADD COLUMN IF NOT EXISTS submitted_at DATETIME NULL AFTER ebook_authorized_at;

ALTER TABLE book_listings
  MODIFY COLUMN listing_status ENUM(
    'pending', 'draft', 'pending_review', 'approved', 'rejected', 'needs_revision', 'suspended'
  ) NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS book_listing_media (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  listing_id  INT UNSIGNED NOT NULL,
  media_type  ENUM('back_cover', 'additional', 'interior_preview') NOT NULL,
  file_path   VARCHAR(500) NOT NULL,
  sort_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_book_listing_media_listing_type (listing_id, media_type, sort_order),
  CONSTRAINT fk_book_listing_media_listing
    FOREIGN KEY (listing_id) REFERENCES book_listings (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
