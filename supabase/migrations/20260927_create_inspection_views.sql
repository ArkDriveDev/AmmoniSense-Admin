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
  sd.battery,
  sd.status,
  sd.latitude AS reading_latitude,
  sd.longitude AS reading_longitude,
  sd.created_at AS reading_at,
  sd.device_uid,
  d.device_name,
  s.schedule_name,
  s.scheduled_date,
  ins.site_name,
  ins.site_code,
  p.full_name AS created_by_name
FROM
  inspection_tags t
  LEFT JOIN sensor_data sd ON sd.id = t.sensor_data_id
  LEFT JOIN devices d ON d.device_uid = sd.device_uid
  LEFT JOIN inspection_schedules s ON s.id = t.inspection_schedule_id
  LEFT JOIN inspection_sites ins ON ins.id = t.inspection_site_id
  LEFT JOIN profiles p ON p.id = t.created_by
ORDER BY
  t.created_at DESC;

-- 2. VIEW: public.inspection_schedule_summary
CREATE VIEW public.inspection_schedule_summary AS
SELECT
  s.id AS schedule_id,
  s.schedule_name,
  s.scheduled_date,
  s.status AS schedule_status,
  s.started_at,
  s.completed_at,
  ins.id AS inspection_site_id,
  ins.site_name,
  ins.site_code,
  COUNT(t.id) AS tag_count,