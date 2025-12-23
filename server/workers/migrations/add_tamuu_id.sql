-- Add tamuu_id column for unique user identification
ALTER TABLE users ADD COLUMN tamuu_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_tamuu_id ON users(tamuu_id);
