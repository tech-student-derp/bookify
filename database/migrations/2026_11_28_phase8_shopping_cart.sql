-- Phase 8: persistent customer shopping cart. This does not reserve or deduct inventory.
-- Requires the Phase 2 book_listings table and users table.

CREATE TABLE IF NOT EXISTS cart_items (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NOT NULL,
  listing_id  INT UNSIGNED NOT NULL,
  quantity    INT UNSIGNED NOT NULL DEFAULT 1,
  added_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cart_items_customer_listing (customer_id, listing_id),
  KEY idx_cart_items_listing (listing_id),
  CONSTRAINT fk_cart_items_customer FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_listing FOREIGN KEY (listing_id) REFERENCES book_listings (id) ON DELETE CASCADE,
  CONSTRAINT chk_cart_items_quantity CHECK (quantity >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
