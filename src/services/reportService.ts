import { supabase } from './supabase';
import { InspectionTagDetails } from '../types/schema';
import { InspectionReportData, ReportSchedule, ReportSite, ReportViolation, ReportReading } from '../types/inspectionReport';
import { getNH3Status } from '../utils/reportUtils';

export async function fetchInspectionReportData(scheduleId: number): Promise<InspectionReportData> {
  // 1. Current user profile for admin reviewer name
  const { data: authData } = await supabase.auth.getUser();
  let adminName = 'MENRO Admin';
  if (authData.user?.id) {
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', authData.user.id)
      .single();
    if (adminProfile?.full_name) adminName = adminProfile.full_name;
  }

  // 2. Schedule and joined site
  const { data: scheduleRow, error: schedErr } = await supabase
    .from('inspection_schedules')
    .select('id, schedule_name, scheduled_date, scheduled_time, status, created_by, notes, inspection_sites(id, site_name, site_code, site_type, address)')
    .eq('id', scheduleId)
    .single();

  if (schedErr || !scheduleRow) {
    throw schedErr ?? new Error('Schedule not found');
  }

  const schedule: ReportSchedule = {
    id: scheduleRow.id, schedule_name: scheduleRow.schedule_name,
    scheduled_date: scheduleRow.scheduled_date, scheduled_time: scheduleRow.scheduled_time,
    status: scheduleRow.status, created_by: scheduleRow.created_by, notes: scheduleRow.notes,
  };

  const rawSite = (scheduleRow.inspection_sites as unknown) as {
    id: number; site_name: string; site_code: string; site_type?: string | null; address?: string | null;
  } | null;

  const site: ReportSite = rawSite
    ? { id: rawSite.id, site_name: rawSite.site_name, site_code: rawSite.site_code, site_type: rawSite.site_type ?? null, address: rawSite.address ?? null }
    : { id: 0, site_name: 'Unknown Site', site_code: 'N/A' };

  // 3. Inspector name
  let inspectorName = 'Inspector';
  if (scheduleRow.created_by) {
    const { data: inspProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', scheduleRow.created_by)
      .single();
    if (inspProfile?.full_name) inspectorName = inspProfile.full_name;
  }

  // 4. Tags: query inspection_tags directly so violation_category is captured even with no ppm
  let tags: InspectionTagDetails[] = [];
  const { data: tagRows, error: tagErr } = await supabase
    .from('inspection_tags')
    .select('*, sensor_data(id, ammonia, status, created_at)')
    .eq('inspection_schedule_id', scheduleId)
    .order('created_at', { ascending: true });

  if (!tagErr && tagRows && tagRows.length > 0) {
    tags = tagRows.map((t: any) => {
      const s = Array.isArray(t.sensor_data) ? t.sensor_data[0] : t.sensor_data;
      return {
        tag_id: t.id, tag_name: t.tag_name,
        inspection_site_id: t.inspection_site_id, inspection_schedule_id: t.inspection_schedule_id,
        sensor_data_id: t.sensor_data_id, tag_latitude: t.latitude, tag_longitude: t.longitude,
        photo_url: t.photo_url, photo_thumbnail_url: t.photo_thumbnail_url, created_at: t.created_at,
        notes: t.notes, violation_category: t.violation_category ?? null, created_by: t.created_by,
        ammonia: s?.ammonia ?? null, status: s?.status ?? (t.violation_category ? 'NON-COMPLIANT' : 'NORMAL'),
        reading_at: s?.created_at ?? null,
      } as InspectionTagDetails;
    });
  } else {
    const { data: viewRows } = await supabase.from('inspection_tag_details').select('*').eq('inspection_schedule_id', scheduleId).order('created_at', { ascending: true });
    tags = (viewRows as InspectionTagDetails[]) ?? [];
  }
  if (inspectorName === 'Inspector' && tags[0]?.created_by_name) {
    inspectorName = tags[0].created_by_name;
  }

  // 5. Violations, Readings & Stats
  const violations: ReportViolation[] = tags.filter((t) => !!t.violation_category && t.violation_category.trim() !== '').map((t) => ({
    tag_id: t.tag_id,
    tag_name: t.tag_name,
    violation_category: t.violation_category as string,
    severity: t.status ?? null,
    status: t.status ?? null,
    latitude: t.tag_latitude ?? t.reading_latitude ?? null,
    longitude: t.tag_longitude ?? t.reading_longitude ?? null,
    notes: t.notes,
    photo_thumbnail_url: t.photo_thumbnail_url,
  }));

  const readings: ReportReading[] = tags.map((t) => ({
    tag_id: t.tag_id,
    tag_name: t.tag_name,
    ammonia: t.ammonia,
    nh3Status: getNH3Status(t.ammonia),
    reading_at: t.reading_at ?? t.created_at,
  })).sort((a, b) => (a.reading_at && b.reading_at ? new Date(a.reading_at).getTime() - new Date(b.reading_at).getTime() : 0));

  const validPpm = readings.filter((r) => r.ammonia !== null).map((r) => r.ammonia as number);
  const criticalCount = readings.filter((r) => r.nh3Status === 'CRITICAL').length;
  const highestPpm = validPpm.length > 0 ? Math.max(...validPpm) : null;
  const averagePpm = validPpm.length > 0 ? validPpm.reduce((a, b) => a + b, 0) / validPpm.length : null;

  return {
    schedule, site, tags, violations, readings,
    stats: { totalTags: tags.length, violationCount: violations.length, criticalCount, highestPpm, averagePpm },
    inspectorName, adminName,
  };
}
