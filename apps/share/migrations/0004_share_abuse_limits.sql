ALTER TABLE post_limits ADD COLUMN bytes_used INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_post_limits_window_start ON post_limits (window_start);
