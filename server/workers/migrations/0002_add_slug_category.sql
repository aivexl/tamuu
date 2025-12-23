-- ============================================
-- Migration: Add Slug, Category, Source Template
-- Version: 2024-12-23
-- ============================================

-- Add slug column (unique, for public URL access)
ALTER TABLE templates ADD COLUMN slug TEXT UNIQUE;

-- Add category column for template filtering
-- Categories: wedding, kids, birthday, aqiqah, tasmiyah, khitan, umum, seminar,
--             christmas, newyear, syukuran, islami, party, dinner, school, graduation, other
ALTER TABLE templates ADD COLUMN category TEXT DEFAULT 'wedding';

-- Add source_template_id for tracking cloned templates (user templates point to master)
ALTER TABLE templates ADD COLUMN source_template_id TEXT REFERENCES templates(id) ON DELETE SET NULL;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_templates_slug ON templates(slug);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_source ON templates(source_template_id);
