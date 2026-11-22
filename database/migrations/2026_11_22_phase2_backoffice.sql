-- Bookify Phase 2 back-office migration (MariaDB 10.4+)
-- Additive and re-runnable. Existing user and application rows are preserved.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_status ENUM('active', 'suspended') NOT NULL DEFAULT 'active' AFTER role;

CREATE TABLE IF NOT EXISTS book_listings (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title               VARCHAR(255) NOT NULL,
  author              VARCHAR(255) NOT NULL,
  description         TEXT NULL,
  cover_image_path    VARCHAR(500) NULL,
  category            VARCHAR(100) NOT NULL,
  price               DECIMAL(10,2) NOT NULL,
  `condition`         ENUM('New', 'Pre-owned') NOT NULL,
  `format`            ENUM('Physical', 'E-book') NOT NULL,
  `source`            ENUM('seller', 'bookify') NOT NULL,
  seller_id           INT UNSIGNED NULL,
  created_by          INT UNSIGNED NOT NULL,
  listing_status      ENUM('pending', 'approved', 'rejected', 'suspended') NOT NULL DEFAULT 'pending',
  publication_status  ENUM('draft', 'published', 'unpublished') NOT NULL DEFAULT 'draft',
  availability        ENUM('available', 'unavailable') NOT NULL DEFAULT 'available',
  moderation_reason   TEXT NULL,
  reviewed_by         INT UNSIGNED NULL,
  reviewed_at         DATETIME NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_book_listings_visibility (listing_status, publication_status, availability),
  KEY idx_book_listings_source (`source`),
  KEY idx_book_listings_seller (seller_id),
  KEY idx_book_listings_created (created_at),
  KEY idx_book_listings_category (category),
  CONSTRAINT fk_book_listings_seller FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_book_listings_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_book_listings_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id     INT UNSIGNED NULL,
  action       VARCHAR(80) NOT NULL,
  target_type  VARCHAR(50) NOT NULL,
  target_id    INT UNSIGNED NULL,
  details_json LONGTEXT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_admin_audit_actor (actor_id),
  KEY idx_admin_audit_target (target_type, target_id),
  KEY idx_admin_audit_created (created_at),
  CONSTRAINT fk_admin_audit_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
