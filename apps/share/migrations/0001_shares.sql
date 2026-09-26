CREATE TABLE shares (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_shares_expires_at ON shares (expires_at);
