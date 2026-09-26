CREATE TABLE post_limits (
  ip TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (ip, window_start)
);
