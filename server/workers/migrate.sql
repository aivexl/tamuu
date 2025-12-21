-- Manual Migration to add missing columns for Transactions and Animations
-- This is needed because CREATE TABLE IF NOT EXISTS doesn't update existing tables

-- Add columns to template_sections if they don't exist
-- Note: SQLite matches by column name. We use 'batch' approach for D1.

ALTER TABLE template_sections ADD COLUMN animation_trigger TEXT DEFAULT 'scroll';
ALTER TABLE template_sections ADD COLUMN transition_effect TEXT DEFAULT 'none';
ALTER TABLE template_sections ADD COLUMN transition_duration INTEGER DEFAULT 1000;
ALTER TABLE template_sections ADD COLUMN transition_trigger TEXT DEFAULT 'scroll';

-- Add animation_trigger to template_elements (IMPORTANT for element-level animation settings)
ALTER TABLE template_elements ADD COLUMN animation_trigger TEXT DEFAULT 'scroll';

-- Element level loop animation support (just in case)
-- ALTER TABLE template_elements ADD COLUMN loop_animation TEXT; 

-- User Permission Columns for Dashboard
ALTER TABLE template_elements ADD COLUMN can_edit_position INTEGER DEFAULT 0;
ALTER TABLE template_elements ADD COLUMN can_edit_content INTEGER DEFAULT 0;
ALTER TABLE template_elements ADD COLUMN is_content_protected INTEGER DEFAULT 0;
ALTER TABLE template_elements ADD COLUMN show_copy_button INTEGER DEFAULT 0;

-- Advanced Animation Fields (Particle Overlay & Ken Burns)
ALTER TABLE template_sections ADD COLUMN particle_type TEXT DEFAULT 'none';
ALTER TABLE template_sections ADD COLUMN ken_burns_enabled INTEGER DEFAULT 0;

-- Parallax Factor for 3D Mouse Tracking  
ALTER TABLE template_elements ADD COLUMN parallax_factor REAL DEFAULT 0;

-- Zoom Animation Configuration (Section-Level)
ALTER TABLE template_sections ADD COLUMN zoom_config TEXT;

-- Elements-Level (Legacy/Cleanup - column may exist but is no longer used)
ALTER TABLE template_elements ADD COLUMN zoom_config TEXT;

-- Lottie Animation Configuration (for generic Lottie elements)
ALTER TABLE template_elements ADD COLUMN lottie_config TEXT;
