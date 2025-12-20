-- Cloudflare D1 Schema for Tamuu Digital Invitation Platform
-- SQLite-compatible schema

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    avatar_url TEXT,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'premium', 'priority')),
    plan_expires_at TEXT,
    is_verified INTEGER DEFAULT 0,
    verification_token TEXT,
    reset_token TEXT,
    reset_token_expires TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    thumbnail TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    section_order TEXT DEFAULT '[]', -- JSON array of section types
    custom_sections TEXT DEFAULT '[]', -- JSON array of custom sections
    global_theme TEXT DEFAULT '{}', -- JSON object for theme config
    event_date TEXT, -- ISO date string
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);


-- ============================================
-- TEMPLATE SECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS template_sections (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    is_visible INTEGER DEFAULT 1, -- SQLite uses INTEGER for boolean
    background_color TEXT,
    background_url TEXT,
    overlay_opacity REAL DEFAULT 0,
    animation TEXT DEFAULT 'fade-in',
    page_title TEXT,
    animation_trigger TEXT DEFAULT 'scroll',
    transition_effect TEXT DEFAULT 'none',
    transition_duration INTEGER DEFAULT 1000,
    transition_trigger TEXT DEFAULT 'scroll',
    content TEXT, -- deprecated, moving to blocks BUT keeping for legacy simple sections
    open_invitation_config TEXT, -- JSON object
    particle_type TEXT DEFAULT 'none', -- 'none' | 'butterflies' | 'petals' | 'leaves' | 'sparkles'
    ken_burns_enabled INTEGER DEFAULT 0, -- Boolean as INTEGER for cinematic background zoom
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(template_id, type)
);

-- ============================================
-- TEMPLATE ELEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS template_elements (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    section_id TEXT NOT NULL REFERENCES template_sections(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    position_x REAL NOT NULL DEFAULT 0,
    position_y REAL NOT NULL DEFAULT 0,
    width REAL NOT NULL DEFAULT 100,
    height REAL NOT NULL DEFAULT 100,
    z_index INTEGER DEFAULT 0,
    animation TEXT DEFAULT 'fade-in',
    loop_animation TEXT,
    animation_delay INTEGER DEFAULT 0,
    animation_speed INTEGER DEFAULT 500,
    animation_duration INTEGER DEFAULT 1000,
    animation_trigger TEXT DEFAULT 'scroll',
    content TEXT,
    image_url TEXT,
    text_style TEXT, -- JSON object
    icon_style TEXT, -- JSON object
    countdown_config TEXT, -- JSON object
    rsvp_form_config TEXT, -- JSON object
    guest_wishes_config TEXT, -- JSON object
    open_invitation_config TEXT, -- JSON object
    rotation REAL DEFAULT 0,
    flip_horizontal INTEGER DEFAULT 0, -- Boolean as INTEGER
    flip_vertical INTEGER DEFAULT 0, -- Boolean as INTEGER
    motion_path_config TEXT, -- JSON object for custom paths
    can_edit_position INTEGER DEFAULT 0, -- User Permission
    can_edit_content INTEGER DEFAULT 0, -- User Permission
    is_content_protected INTEGER DEFAULT 0, -- User Permission
    show_copy_button INTEGER DEFAULT 0, -- User Permission
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- RSVP RESPONSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rsvp_responses (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    message TEXT,
    attendance TEXT CHECK (attendance IN ('hadir', 'tidak_hadir', 'ragu')),
    is_public INTEGER DEFAULT 1, -- Boolean as INTEGER
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_templates_updated_at ON templates(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);

CREATE INDEX IF NOT EXISTS idx_sections_template_id ON template_sections(template_id);
CREATE INDEX IF NOT EXISTS idx_sections_type ON template_sections(type);

CREATE INDEX IF NOT EXISTS idx_elements_section_id ON template_elements(section_id);
CREATE INDEX IF NOT EXISTS idx_elements_type ON template_elements(type);

CREATE INDEX IF NOT EXISTS idx_rsvp_template_id ON rsvp_responses(template_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_created_at ON rsvp_responses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
