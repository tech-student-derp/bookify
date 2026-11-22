-- Bookify Phase 4: per-user back-office notification state and preferences.
-- Additive and safe to rerun. Apply Phase 2 and Phase 3 migrations first.
-- Notifications themselves are read from real application records; this migration
-- stores per-operator notification state and adds an explicit delivery completion timestamp.

ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS delivered_at DATETIME NULL AFTER assigned_at;

CREATE TABLE IF NOT EXISTS backoffice_notification_reads (
  user_id          INT UNSIGNED NOT NULL,
  notification_key VARCHAR(191) NOT NULL,
  read_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, notification_key),
  KEY idx_notification_reads_time (user_id, read_at),
  CONSTRAINT fk_notification_reads_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS backoffice_notification_preferences (
  user_id           INT UNSIGNED NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  enabled           TINYINT(1) NOT NULL DEFAULT 1,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, notification_type),
  CONSTRAINT fk_notification_preferences_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
