-- Bookify email verification hardening.
-- The users verification fields already exist in database/bookify.sql:
-- is_verified, verified_at, verification_token (SHA-256 digest),
-- verification_token_expires_at, and resend_requested_at. Do not recreate them
-- or rewrite is_verified values; this preserves existing verified accounts.
--
-- Add the IP-level request window used alongside resend_requested_at's
-- per-account cooldown. Safe to apply more than once.

CREATE TABLE IF NOT EXISTS email_verification_rate_limits (
  ip_hash            CHAR(64) NOT NULL,
  window_started_at  DATETIME NOT NULL,
  request_count      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash),
  KEY idx_email_verification_rate_window (window_started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
