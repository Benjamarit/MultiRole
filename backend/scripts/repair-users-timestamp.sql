-- Run against the configured MySQL database. Keeps all accounts and passwords.
-- Older schemas cannot add a NOT NULL timestamp directly when rows already exist.
SET @add_timestamp = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'updated_at') = 0,
  'ALTER TABLE users ADD COLUMN updated_at DATETIME(6) NULL',
  'SELECT 1');
PREPARE add_timestamp FROM @add_timestamp;
EXECUTE add_timestamp;
DEALLOCATE PREPARE add_timestamp;
UPDATE users SET updated_at = COALESCE(created_at, CURRENT_TIMESTAMP(6)) WHERE updated_at IS NULL;
ALTER TABLE users MODIFY COLUMN updated_at DATETIME(6) NOT NULL;
