-- ============================================
-- Migration: Add Slug, Category, Source Template
-- Version: 2024-12-23
-- SQLite Compatible (no UNIQUE in ALTER TABLE)
-- ============================================

-- Add slug column (UNIQUE will be enforced by index)
ALTER TABLE templates ADD COLUMN slug TEXT;

-- Add category column for template filtering
ALTER TABLE templates ADD COLUMN category TEXT DEFAULT 'wedding';

-- Add source_template_id for tracking cloned templates
ALTER TABLE templates ADD COLUMN source_template_id TEXT;

-- Create unique index for slug (enforces uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_slug ON templates(slug);

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);

-- Create index for source template lookups
CREATE INDEX IF NOT EXISTS idx_templates_source ON templates(source_template_id);
