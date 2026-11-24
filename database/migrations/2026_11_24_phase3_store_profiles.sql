-- Bookify Phase 3: Store profile and image path persistence.
-- Additive and re-runnable. This is the Phase 3 dependency for SellerProfileController.php.
-- The same table remains in the Phase 5 ecosystem migration for compatibility with
-- installations that apply the seller ecosystem as a single later migration.

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
