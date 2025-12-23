-- Add missing user_id column to templates table
-- Migration: Add user_id
ALTER TABLE templates ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
