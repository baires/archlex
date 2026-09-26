ALTER TABLE shares ADD COLUMN source_hash TEXT;
CREATE UNIQUE INDEX idx_shares_source_hash ON shares (source_hash);
