import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

export interface SiteAnalyticsData {
  id: number;
  site_name: string;
  site_code?: string;
  site_type: 'Piggery' | 'Ambient' | 'Industrial' | string;
  address: string;
  latitude: number;
  longitude: number;
  area_size_hectares: number;
  owner_name: string;
  owner_contact?: string;
  owner_email?: string;
  
  // Latest reading info
  latest_ammonia: number | null;
  latest_temperature: number | null;
  latest_humidity: number | null;
  last_reading_at: string | null;
  alert_status: 'normal' | 'warning' | 'critical';
  
  // Device & activity stats
  device_status: 'Online' | 'Offline';
  active_device_count: number;
  devices: {
    id: number;
    device_uid: string;
    status: string;
    firmware_version?: string;
    installed_at?: string;
  }[];
  
  reading_count_7days: number;
  trend_7days: { date: string; ammonia: number }[];
  recent_readings: {
    id: number;
    device_uid: string;
    ammonia: number;
    temperature: number;
    humidity: number;
    status: string;
    grid_cell_id?: string;
    created_at: string;
    photo_url?: string;
  }[];
}
