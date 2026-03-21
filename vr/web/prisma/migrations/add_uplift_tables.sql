-- Migration: Add Uplift feature tables
-- This migration is ADDITIVE ONLY - no destructive changes
-- Run against production database: psql $DATABASE_URL -f prisma/migrations/add_uplift_tables.sql

-- UpliftProfile: Extended profile info for the new link-in-bio style page
CREATE TABLE IF NOT EXISTS uplift_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bio VARCHAR(160),
    tagline VARCHAR(100),
    theme VARCHAR(50) DEFAULT 'dark',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_uplift_profiles_user_id ON uplift_profiles(user_id);

-- UpliftLinks: Custom link buttons for profile
CREATE TABLE IF NOT EXISTS uplift_links (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uplift_links_user_id ON uplift_links(user_id);
CREATE INDEX IF NOT EXISTS idx_uplift_links_sort_order ON uplift_links(user_id, sort_order);

-- UpliftModels: 3D models for profiles (references existing scenes or new uploads)
CREATE TABLE IF NOT EXISTS uplift_models (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    is_featured BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uplift_models_user_id ON uplift_models(user_id);
CREATE INDEX IF NOT EXISTS idx_uplift_models_featured ON uplift_models(user_id, is_featured);

-- ShortLinks: Branded short links (vr.dev/username/slug → destination)
CREATE TABLE IF NOT EXISTS short_links (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug VARCHAR(50) NOT NULL,
    destination_url VARCHAR(1000) NOT NULL,
    title VARCHAR(100),
    click_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_short_links_user_slug ON short_links(user_id, slug);

-- AnalyticsEvents: Track profile views, link clicks, model views
CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'profile_view', 'link_click', 'model_view', 'vr_launch'
    target_id VARCHAR(100), -- link id, model id, etc.
    target_type VARCHAR(50), -- 'link', 'model', 'profile'
    referrer VARCHAR(500),
    user_agent VARCHAR(500),
    ip_hash VARCHAR(64), -- Hashed IP for unique visitor tracking
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_type_date ON analytics_events(user_id, event_type, created_at);
