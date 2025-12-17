-- Add indexes to improve query performance and prevent timeouts

-- Index for template_sections fetch by template_id
CREATE INDEX IF NOT EXISTS idx_template_sections_template_id ON template_sections(template_id);

-- Index for template_elements fetch by section_id
-- This is critical for preventing "statement timeout" errors when loading a template
CREATE INDEX IF NOT EXISTS idx_template_elements_section_id ON template_elements(section_id);

-- Index for rsvp_responses fetch by template_id
CREATE INDEX IF NOT EXISTS idx_rsvp_responses_template_id ON rsvp_responses(template_id);
