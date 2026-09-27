-- =========================================================================
-- MIGRATION: Rename Monitoring Sites to Inspection Sites
-- Date: 2026-09-22
-- Description:
-- 1. Renames public.monitoring_sites to public.inspection_sites
-- 2. Renames foreign key site_id to inspection_site_id in devices, odor_zones, site_locations
-- 3. Updates foreign key constraints, indexes, triggers, and RLS policies
-- 4. Creates a backward-compatible view public.monitoring_sites
-- =========================================================================

-- 1. RENAME TABLE
ALTER TABLE IF EXISTS public.monitoring_sites RENAME TO inspection_sites;

-- 2. RENAME FOREIGN KEY COLUMNS
DO $$ 
BEGIN
  -- In devices
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'site_id') THEN
    ALTER TABLE public.devices RENAME COLUMN site_id TO inspection_site_id;
  END IF;

  -- In odor_zones
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'odor_zones' AND column_name = 'site_id') THEN
    ALTER TABLE public.odor_zones RENAME COLUMN site_id TO inspection_site_id;
  END IF;

  -- In site_locations
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_locations' AND column_name = 'site_id') THEN
    ALTER TABLE public.site_locations RENAME COLUMN site_id TO inspection_site_id;
  END IF;
END $$;

-- 3. RENAME CONSTRAINTS (IF EXIST)
DO $$
BEGIN