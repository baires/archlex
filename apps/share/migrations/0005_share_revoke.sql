ALTER TABLE shares ADD COLUMN revoke_hash TEXT;
DROP INDEX idx_shares_source_hash;
CREATE INDEX idx_shares_source_hash ON shares (source_hash);
