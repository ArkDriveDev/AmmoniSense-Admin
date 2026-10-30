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
    .select('id, schedule_name, scheduled_date, scheduled_time, status, confirmed, created_by, notes, inspection_sites(id, site_name, site_code, site_type, address)')
    .eq('id', scheduleId)
    .single();

  if (schedErr || !scheduleRow) {
    throw schedErr ?? new Error('Schedule not found');
  }

  const schedule: ReportSchedule = {
    id: scheduleRow.id,
    schedule_name: scheduleRow.schedule_name,
    scheduled_date: scheduleRow.scheduled_date,
    scheduled_time: scheduleRow.scheduled_time,
    status: scheduleRow.status,
    confirmed: scheduleRow.confirmed ?? false,
    created_by: scheduleRow.created_by,
    notes: scheduleRow.notes,
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

  // 4. Tags: query inspection_tags directly without ambiguous embedded joins
  let tags: InspectionTagDetails[] = [];
  const { data: tagRows, error: tagErr } = await supabase
    .from('inspection_tags')
    .select('*')
    .eq('inspection_schedule_id', scheduleId)
    .order('created_at', { ascending: true });

  if (!tagErr && tagRows && tagRows.length > 0) {
    // Collect all tag IDs and linked sensor_data_ids
    const tagIds = tagRows.map((t: any) => t.id).filter(Boolean);
    const sDataIds = tagRows.map((t: any) => t.sensor_data_id).filter(Boolean);

    // Fetch matching sensor readings by inspection_tag_id OR sensor_data.id
    let sensorDataList: any[] = [];
    const orClauses: string[] = [];
    if (tagIds.length > 0) orClauses.push(`inspection_tag_id.in.(${tagIds.join(',')})`);
    if (sDataIds.length > 0) orClauses.push(`id.in.(${sDataIds.join(',')})`);

    if (orClauses.length > 0) {
      try {
        const { data: sRows, error: sErr } = await supabase
          .from('sensor_data')
          .select('*')
          .or(orClauses.join(','))
          .order('created_at', { ascending: false });

        if (!sErr && sRows) {
          sensorDataList = sRows;
        }
      } catch (err) {
        console.warn('Could not fetch sensor_data for tags:', err);
      }
    }

    tags = tagRows.map((t: any) => {
      // Find matching sensor_data: priority to exact sensor_data_id, then latest by inspection_tag_id
      const matching = sensorDataList.filter((sd) => sd.id === t.sensor_data_id || sd.inspection_tag_id === t.id);
      const s = matching.find((sd) => sd.id === t.sensor_data_id) || matching[0];

      return {
        tag_id: t.id,
        tag_name: t.tag_name,
        inspection_site_id: t.inspection_site_id,
        inspection_schedule_id: t.inspection_schedule_id,
        sensor_data_id: t.sensor_data_id || s?.id || null,
        session_id: t.session_id || s?.session_id || null,
        tag_latitude: t.latitude,
        tag_longitude: t.longitude,
        photo_url: t.photo_url,
        photo_thumbnail_url: t.photo_thumbnail_url,
        photo_storage_path: t.photo_storage_path,
        photo_thumbnail_storage_path: t.photo_thumbnail_storage_path,
        created_at: t.created_at,
        notes: t.notes,
        violation_category: t.violation_category ?? null,
        created_by: t.created_by,
        ammonia: s?.ammonia !== null && s?.ammonia !== undefined ? Number(s.ammonia) : null,
        temperature: s?.temperature !== null && s?.temperature !== undefined ? Number(s.temperature) : null,
        humidity: s?.humidity !== null && s?.humidity !== undefined ? Number(s.humidity) : null,
        battery: s?.battery !== null && s?.battery !== undefined ? Number(s.battery) : null,
        status: s?.status ?? (t.violation_category ? 'NON-COMPLIANT' : 'NORMAL'),
        reading_latitude: s?.latitude ?? null,
        reading_longitude: s?.longitude ?? null,
        reading_at: s?.created_at ?? s?.submitted_at ?? null,
        device_uid: s?.device_uid ?? null,
      } as InspectionTagDetails;
    });
  } else {
    const { data: viewRows } = await supabase
      .from('inspection_tag_details')
      .select('*')
      .eq('inspection_schedule_id', scheduleId)
      .order('created_at', { ascending: true });
    tags = (viewRows as InspectionTagDetails[]) ?? [];
  }

  if (inspectorName === 'Inspector' && tags[0]?.created_by_name) {
    inspectorName = tags[0].created_by_name;
  }

  // 5. Violations, Readings & Stats
  // A tag is a violation if it has an explicit violation_category OR an ammonia exceedance (>25 PPM / Critical / High)
  const violations: ReportViolation[] = tags
    .filter((t) => {
      const hasExplicitViolation = !!t.violation_category && t.violation_category.trim() !== '';
      const nh3 = t.ammonia !== null && t.ammonia !== undefined ? Number(t.ammonia) : null;
      const isExceedance = (nh3 !== null && nh3 > 25) || ['CRITICAL', 'HIGH', 'WARNING', 'NON-COMPLIANT'].includes((t.status || '').toUpperCase());
      return hasExplicitViolation || isExceedance;
    })
    .map((t) => {
      const hasExplicitViolation = !!t.violation_category && t.violation_category.trim() !== '';
      const nh3 = t.ammonia !== null && t.ammonia !== undefined ? Number(t.ammonia) : null;

      // Default category if not set on tag but triggered by sensor ammonia reading
      const category: string = hasExplicitViolation
        ? (t.violation_category as string)
        : 'FOUL_ODOR';

      const isCritical = (t.status || '').toUpperCase() === 'CRITICAL' || (nh3 !== null && nh3 > 50) || ['ILLEGAL_DUMPING', 'OPEN_BURNING', 'WATER_POLLUTION', 'WASTEWATER_DISCHARGE'].includes(category);
      const isHigh = (t.status || '').toUpperCase() === 'HIGH' || (nh3 !== null && nh3 > 35) || ['FOUL_ODOR', 'IMPROPER_WASTE_DISPOSAL', 'MANURE_PILING'].includes(category);
      const severity = isCritical ? 'CRITICAL' : isHigh ? 'HIGH' : 'WARNING';

      return {
        tag_id: t.tag_id,
        tag_name: t.tag_name,
        violation_category: category,
        severity: t.status || severity,
        status: t.status || severity,
        latitude: t.tag_latitude ?? t.reading_latitude ?? null,
        longitude: t.tag_longitude ?? t.reading_longitude ?? null,
        notes: t.notes || (nh3 !== null && !hasExplicitViolation ? `Sensor Exceedance Detected: ${nh3.toFixed(1)} PPM` : null),
        photo_thumbnail_url: t.photo_thumbnail_url || t.photo_url || null,
      };
    });

  const readings: ReportReading[] = tags
    .filter((t) => t.ammonia !== null && t.ammonia !== undefined)
    .map((t) => ({
      tag_id: t.tag_id,
      tag_name: t.tag_name,
      ammonia: t.ammonia,
      nh3Status: getNH3Status(t.ammonia),
      reading_at: t.reading_at ?? t.created_at,
    }))
    .sort((a, b) => (a.reading_at && b.reading_at ? new Date(a.reading_at).getTime() - new Date(b.reading_at).getTime() : 0));

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
