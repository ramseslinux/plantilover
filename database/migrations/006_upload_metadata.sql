ALTER TABLE payment_proofs
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS original_file_name VARCHAR(255);

ALTER TABLE shipping_evidence
  ADD COLUMN IF NOT EXISTS original_file_name VARCHAR(255);
