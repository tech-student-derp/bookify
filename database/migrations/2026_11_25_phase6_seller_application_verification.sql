-- Phase 6: seller application contact and private identity document references.
-- Additive: existing seller applications remain intact and these fields stay NULL
-- for legacy records. Apply manually; application code does not execute migrations.
--
-- Future policy: require at least three days of active platform usage before
-- approval. This is intentionally not enforced for the upcoming presentation and
-- is not an administrator review waiting period.

ALTER TABLE seller_applications
  ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) NULL AFTER user_id,
  ADD COLUMN IF NOT EXISTS id_document_key VARCHAR(80) NULL AFTER phone_number;

CREATE UNIQUE INDEX IF NOT EXISTS uq_seller_applications_id_document_key
  ON seller_applications (id_document_key);
