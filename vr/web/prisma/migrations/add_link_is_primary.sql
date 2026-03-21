-- Migration: Add is_primary column to uplift_links
-- This migration is ADDITIVE ONLY - no destructive changes
-- Run against production database: psql $DATABASE_URL -f prisma/migrations/add_link_is_primary.sql

-- Add is_primary column to mark one link as the primary/featured link
ALTER TABLE uplift_links ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

-- Add caption column to models for optional caption text
ALTER TABLE uplift_models ADD COLUMN IF NOT EXISTS caption VARCHAR(160);
