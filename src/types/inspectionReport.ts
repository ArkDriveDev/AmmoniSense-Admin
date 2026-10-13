import { InspectionTagDetails, ViolationCategory } from './schema';

export type NH3Status = 'SAFE' | 'WARNING' | 'CRITICAL';

export interface ReportSchedule {
  id: number;
  schedule_name: string;
  scheduled_date: string;
  scheduled_time?: string | null;
  status?: string | null;
  created_by?: string | null;
  notes?: string | null;
}

export interface ReportSite {
  id: number;
  site_name: string;
  site_code: string;
  site_type?: string | null;
  address?: string | null;
}

export interface ReportViolation {
  tag_id: number;
  tag_name: string;
  violation_category: ViolationCategory | string;
  severity?: string | null;
  status?: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  photo_thumbnail_url: string | null;
}

export interface ReportReading {
  tag_id: number;
  tag_name: string;
  ammonia: number | null;
  nh3Status: NH3Status;
  reading_at: string | null;
}

export interface ReportStats {
  totalTags: number;
  violationCount: number;
  criticalCount: number;
  highestPpm: number | null;
  averagePpm: number | null;
}

export interface InspectionReportData {
  schedule: ReportSchedule;
  site: ReportSite;
  tags: InspectionTagDetails[];
  violations: ReportViolation[];
  readings: ReportReading[];
  stats: ReportStats;
  inspectorName: string;
  adminName: string;
}
