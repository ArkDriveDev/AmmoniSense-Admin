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
  scheduled_time?: string | null; // HH:MM:SS
  status?: ScheduleStatus;
  started_at?: string | null;
  completed_at?: string | null;
  offline_temp_id?: string | null;
  created_at?: string;
  created_by?: string | null;
  updated_at?: string;
  notes?: string | null;
}

// 3. Table: inspection_tags
export type TagStatus = 'NORMAL' | 'WARNING' | 'HIGH' | 'CRITICAL';

export interface InspectionTag {
  id: number;
  tag_name: string;
  inspection_schedule_id?: number | null;
  inspection_site_id?: number | null;
  ammonia?: number | null; // PPM
  temperature?: number | null; // °C
  humidity?: number | null; // %
  battery?: number | null; // %
  status?: TagStatus | string | null;
  latitude?: number | null;
  longitude?: number | null;
  device_uid?: string | null;
  photo_url?: string | null;
  photo_thumbnail_url?: string | null;
  inspection_photo_id?: number | null;
  notes?: string | null;
  offline_temp_id?: string | null;
  created_at?: string;
  created_by?: string | null;
}

// 4. Table: devices
export type DeviceStatus = 'ACTIVE' | 'INACTIVE' | 'OFFLINE' | 'MAINTENANCE';

export interface Device {
  id: number;
  device_uid: string;
  device_name?: string | null;
  status?: DeviceStatus | string | null;
  inspection_site_id?: number | null;
  firmware_version?: string | null;
  battery_level?: number | null;
  last_ping_at?: string | null;
  installed_at?: string | null;
  auto_registered?: boolean;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  connection_count?: number | null;
  last_connected_by?: string | null;
  offline_temp_id?: string | null;
  created_at?: string;
  created_by?: string | null;
  // Relational join convenience
  inspection_sites?: {
    id: number;
    site_name: string;
    site_code: string;
  } | null;
}

// 5. Table: inspection_photos
export interface InspectionPhoto {
  id: number;
  sensor_data_id?: number | null;
  inspection_site_id?: number | null;