-- Convert pending email verification from link tokens to one-time six-digit codes.
-- Existing verified flags and account roles are preserved. Legacy unverified link
-- hashes are cleared so users can request a code; they are not marked verified.

ALTER TABLE users
  MODIFY COLUMN verification_token VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS verification_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER verification_token_expires_at;

UPDATE users
SET verification_token = NULL,
    verification_token_expires_at = NULL,
    verification_attempts = 0
WHERE is_verified = 0
  AND verification_token IS NOT NULL
  AND CHAR_LENGTH(verification_token) = 64;
