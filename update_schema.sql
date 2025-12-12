-- Add transformation columns to template_elements table
ALTER TABLE template_elements 
ADD COLUMN IF NOT EXISTS rotation numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS flip_horizontal boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS flip_vertical boolean DEFAULT false;

-- Comment on columns
COMMENT ON COLUMN template_elements.rotation IS 'Rotation in degrees (0-360)';
COMMENT ON COLUMN template_elements.flip_horizontal IS 'Mirror horizontally';
COMMENT ON COLUMN template_elements.flip_vertical IS 'Mirror vertically';

-- Add status column to templates table for publish/draft status
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

-- Comment on status column
COMMENT ON COLUMN templates.status IS 'Template status: draft or published';

-- Add loop_animation column to template_elements table for continuous looping animations
ALTER TABLE template_elements 
ADD COLUMN IF NOT EXISTS loop_animation text;

-- Comment on loop_animation column
COMMENT ON COLUMN template_elements.loop_animation IS 'Continuous looping animation type (sway, float, pulse, etc.)';
