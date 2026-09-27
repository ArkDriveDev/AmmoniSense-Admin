-- =========================================================================
-- MIGRATION: Create / Replace Inspection Views
-- Date: 2026-09-27
-- Description:
-- 1. inspection_tag_details: Full inspection tag telemetry, photos, GPS, schedules & creator info
-- 2. inspection_schedule_summary: Schedule aggregate stats (tags, photos, ammonia, criticals) without assigned_to
-- 3. inspection_site_summary: Site aggregate stats (active sites, schedules, tags, photos, ammonia, criticals)
-- =========================================================================

-- Drop existing views if needed to allow column changes
DROP VIEW IF EXISTS public.inspection_tag_details CASCADE;
DROP VIEW IF EXISTS public.inspection_schedule_summary CASCADE;
DROP VIEW IF EXISTS public.inspection_site_summary CASCADE;

-- 1. VIEW: public.inspection_tag_details
CREATE VIEW public.inspection_tag_details AS
SELECT
  t.id AS tag_id,
  t.tag_name,
  t.inspection_site_id,
  t.inspection_schedule_id,
  t.sensor_data_id,
  t.latitude AS tag_latitude,
  t.longitude AS tag_longitude,
  t.photo_url,
  t.photo_thumbnail_url,
  t.photo_storage_path,
  t.photo_thumbnail_storage_path,
  t.created_at,
  t.notes,
  t.offline_temp_id,
  t.created_by,
  sd.ammonia,
  sd.temperature,
  sd.humidity,