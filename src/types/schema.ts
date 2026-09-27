// ============================================================================
// AmmoniSense Database Schema & View Definitions
// Strictly matches the updated MENRO inspection schema
// ============================================================================

// 1. Table: inspection_sites
export interface InspectionSite {
  id: number;
  site_code: string;
  site_name: string;
  site_type?: string | null;
  current_latitude?: number | null;
  current_longitude?: number | null;
  address?: string | null;
  area_size_hectares?: number | null;
  site_photo_url?: string | null;
  site_photo_thumbnail?: string | null;
  site_photo_id?: number | null;
  offline_temp_id?: string | null;
  is_active?: boolean;
  created_at?: string;
  created_by?: string | null;
  updated_at?: string;
  updated_by?: string | null;
  notes?: string | null;
}

// 2. Table: inspection_schedules
export type ScheduleStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface InspectionSchedule {
  id: number;
  inspection_site_id: number;
  schedule_name: string;
  scheduled_date: string; // YYYY-MM-DD