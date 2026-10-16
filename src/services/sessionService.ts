import { supabase } from './supabase';
import { SensorData, InspectionTag, InspectionSite } from '../types/schema';
import { AMMONIA_THRESHOLDS } from '../constants/thresholds';

export interface SessionMetrics {
  count: number;
  minPpm: number;
  avgPpm: number;
  maxPpm: number;
  criticalCount: number;
  warningCount: number;
  safeCount: number;
  startTime: string | null;
  endTime: string | null;
  durationSeconds: number;
  durationFormatted: string;
  avgTemp: number | null;
  avgHumidity: number | null;
}

export interface SessionDataResult {
  sessionId: string | null;
  readings: SensorData[];
  metrics: SessionMetrics;
  tag: InspectionTag | null;
  site: InspectionSite | null;
}

export function computeSessionMetrics(readings: SensorData[]): SessionMetrics {
  if (!readings || readings.length === 0) {
    return {
      count: 0,
      minPpm: 0,
      avgPpm: 0,
      maxPpm: 0,
      criticalCount: 0,
      warningCount: 0,
      safeCount: 0,
      startTime: null,
      endTime: null,
      durationSeconds: 0,
      durationFormatted: '0m 00s',
      avgTemp: null,
      avgHumidity: null,
    };
  }

  const validPpmReadings = readings
    .map((r) => (r.ammonia !== null && r.ammonia !== undefined ? Number(r.ammonia) : null))
    .filter((v): v is number => v !== null && !isNaN(v));

  const minPpm = validPpmReadings.length > 0 ? Math.min(...validPpmReadings) : 0;
  const maxPpm = validPpmReadings.length > 0 ? Math.max(...validPpmReadings) : 0;
  const avgPpm =
    validPpmReadings.length > 0
      ? validPpmReadings.reduce((sum, v) => sum + v, 0) / validPpmReadings.length
      : 0;

  const criticalCount = validPpmReadings.filter((v) => v >= AMMONIA_THRESHOLDS.WARNING_MAX).length;
  const warningCount = validPpmReadings.filter(
    (v) => v >= AMMONIA_THRESHOLDS.SAFE_MAX && v < AMMONIA_THRESHOLDS.WARNING_MAX
  ).length;
  const safeCount = validPpmReadings.filter((v) => v < AMMONIA_THRESHOLDS.SAFE_MAX).length;

  const validTemps = readings
    .map((r) => (r.temperature !== null && r.temperature !== undefined ? Number(r.temperature) : null))
    .filter((v): v is number => v !== null && !isNaN(v));
  const avgTemp =
    validTemps.length > 0 ? validTemps.reduce((sum, v) => sum + v, 0) / validTemps.length : null;

  const validHum = readings
    .map((r) => (r.humidity !== null && r.humidity !== undefined ? Number(r.humidity) : null))
    .filter((v): v is number => v !== null && !isNaN(v));
  const avgHumidity =
    validHum.length > 0 ? validHum.reduce((sum, v) => sum + v, 0) / validHum.length : null;

  const firstReading = readings[0];
  const lastReading = readings[readings.length - 1];
  const startTime = firstReading?.created_at || null;
  const endTime = lastReading?.created_at || null;

  let durationSeconds = 0;
  if (startTime && endTime) {
    const diffMs = new Date(endTime).getTime() - new Date(startTime).getTime();
    durationSeconds = Math.max(0, Math.round(diffMs / 1000));
  }

  const mins = Math.floor(durationSeconds / 60);
  const secs = durationSeconds % 60;
  const durationFormatted = `${mins}m ${secs.toString().padStart(2, '0')}s`;

  return {
    count: readings.length,
    minPpm: Number(minPpm.toFixed(2)),
    avgPpm: Number(avgPpm.toFixed(2)),
    maxPpm: Number(maxPpm.toFixed(2)),
    criticalCount,
    warningCount,
    safeCount,
    startTime,
    endTime,
    durationSeconds,
    durationFormatted,
    avgTemp: avgTemp !== null ? Number(avgTemp.toFixed(1)) : null,
    avgHumidity: avgHumidity !== null ? Number(avgHumidity.toFixed(1)) : null,
  };
}

export async function fetchSessionData(params: {
  inspectionTagId?: number | null;
  sessionId?: string | null;
}): Promise<SessionDataResult> {
  const { inspectionTagId, sessionId } = params;

  let tag: InspectionTag | null = null;
  let site: InspectionSite | null = null;
  let resolvedSessionId: string | null = sessionId || null;

  // 1. Fetch tag and linked site if inspectionTagId is provided
  if (inspectionTagId) {
    try {
      const { data: tagData, error: tagErr } = await supabase
        .from('inspection_tags')
        .select(`
          *,
          inspection_sites (*)
        `)
        .eq('id', inspectionTagId)
        .maybeSingle();

      if (!tagErr && tagData) {
        tag = tagData as unknown as InspectionTag;
        if ((tagData as unknown as { inspection_sites?: InspectionSite }).inspection_sites) {
          site = (tagData as unknown as { inspection_sites: InspectionSite }).inspection_sites;
        }
        if (!resolvedSessionId && tag.session_id) {
          resolvedSessionId = tag.session_id;
        }
      }
    } catch (err) {
      console.warn('Error fetching tag for session:', err);
    }
  }

  // 2. Fetch sensor_data readings
  let readings: SensorData[] = [];

  if (resolvedSessionId) {
    const { data: sessionReadings, error: sessErr } = await supabase
      .from('sensor_data')
      .select('*')
      .eq('session_id', resolvedSessionId)
      .order('created_at', { ascending: true });

    if (!sessErr && sessionReadings && sessionReadings.length > 0) {
      readings = sessionReadings as SensorData[];
    }
  }

  // Fallback if no readings by session_id but inspectionTagId provided
  if (readings.length === 0 && inspectionTagId) {
    const { data: tagReadings, error: tagReadingsErr } = await supabase
      .from('sensor_data')
      .select('*')
      .eq('inspection_tag_id', inspectionTagId)
      .order('created_at', { ascending: true });

    if (!tagReadingsErr && tagReadings && tagReadings.length > 0) {
      readings = tagReadings as SensorData[];
      if (!resolvedSessionId && readings[0]?.session_id) {
        resolvedSessionId = readings[0].session_id;
      }
    }
  }

  // If tag wasn't loaded yet but readings have an inspection_tag_id
  if (!tag && readings.length > 0 && readings[0].inspection_tag_id) {
    try {
      const { data: tagData } = await supabase
        .from('inspection_tags')
        .select(`
          *,
          inspection_sites (*)
        `)
        .eq('id', readings[0].inspection_tag_id)
        .maybeSingle();

      if (tagData) {
        tag = tagData as unknown as InspectionTag;
        if ((tagData as unknown as { inspection_sites?: InspectionSite }).inspection_sites) {
          site = (tagData as unknown as { inspection_sites: InspectionSite }).inspection_sites;
        }
      }
    } catch (err) {
      console.warn('Error fetching tag from sensor readings:', err);
    }
  }

  const metrics = computeSessionMetrics(readings);

  return {
    sessionId: resolvedSessionId,
    readings,
    metrics,
    tag,
    site,
  };
}
