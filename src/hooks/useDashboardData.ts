import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

export interface ChartDataset {
  label?: string;
  data: number[];
  borderColor?: string | string[];
  backgroundColor?: string | string[];
  fill?: boolean;
  tension?: number;
  borderWidth?: number;
}

export interface ChartDataGroup {
  labels: string[];
  datasets: ChartDataset[];
}

export interface DashboardCharts {
  ammoniaTrend: ChartDataGroup;
  alertSeverity: ChartDataGroup;
  alertTrend: ChartDataGroup;
  deviceStatus: ChartDataGroup;
  topAlertingDevices: ChartDataGroup;
  clientsLivestock: ChartDataGroup;
  scheduleStatus: ChartDataGroup;
}

export function useDashboardData() {
  const [stats, setStats] = useState({
    sites: 0,
    schedules: 0,
    devices: 0,
    alerts: 0,
    tags: 0,
  });
  const [chartData, setChartData] = useState<DashboardCharts | null>(null);
  const [loading, setLoading] = useState(true);

  const processChartData = (
    ammoniaData: { ammonia?: number | null; created_at?: string }[],
    severityData: { status?: string | null; ammonia?: number | null }[],
    alertTrendData: { created_at?: string; status?: string | null; ammonia?: number | null }[],
    deviceStatusData: { status?: string | null }[],
    topDevices: { device_uid?: string | null }[],
    siteSummaryData: { site_name?: string | null; avg_ammonia?: number | null; tag_count?: number }[],
    scheduleStatusData: { status?: string | null }[]
  ): DashboardCharts => {
    // 1. Ammonia Trend
    const grouped: Record<string, number[]> = {};

    if (ammoniaData && ammoniaData.length > 0) {
      ammoniaData.forEach((item) => {
        if (item.ammonia !== null && item.ammonia !== undefined) {
          const date = new Date(item.created_at || Date.now());
          const dateKey = date.toISOString().split('T')[0];
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push(item.ammonia);
        }
      });
    }

    const sortedDates = Object.keys(grouped).sort();
    const labels = sortedDates;
    const values = labels.map((key) => {
      const avg = grouped[key].reduce((a, b) => a + b, 0) / grouped[key].length;
      return Math.round(avg * 10) / 10;
    });

    const ammoniaTrend: ChartDataGroup = {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [{
        label: 'Average Ammonia (PPM)',
        data: values.length > 0 ? values : [0],
        borderColor: '#1a365d',
        backgroundColor: 'rgba(26, 54, 93, 0.2)',
        fill: true,
        tension: 0.4,
      }],
    };

    // 2. Alert Severity
    const critical = severityData?.filter((d) => (d.status || '').toUpperCase() === 'CRITICAL' || (d.ammonia || 0) > 50).length || 0;
    const high = severityData?.filter((d) => (d.status || '').toUpperCase() === 'HIGH' || ((d.ammonia || 0) > 35 && (d.ammonia || 0) <= 50)).length || 0;
    const warning = severityData?.filter((d) => (d.status || '').toUpperCase() === 'WARNING' || ((d.ammonia || 0) > 25 && (d.ammonia || 0) <= 35)).length || 0;
    const normal = severityData?.filter((d) => (d.status || '').toUpperCase() === 'NORMAL' || (d.ammonia !== null && d.ammonia !== undefined && d.ammonia <= 25)).length || 0;

    const alertSeverity: ChartDataGroup = {
      labels: ['CRITICAL (>50 PPM)', 'HIGH (35-50 PPM)', 'WARNING (25-35 PPM)', 'NORMAL (<=25 PPM)'],
      datasets: [{
        data: [critical, high, warning, normal],
        backgroundColor: ['#dc2626', '#ea580c', '#f59e0b', '#2d7d46'],
        borderColor: ['#dc2626', '#ea580c', '#f59e0b', '#2d7d46'],
        borderWidth: 1,
      }],
    };

    // 3. Alert Trend by Day of Week
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = days.map(() => 0);

    alertTrendData?.forEach((item) => {
      if (item.created_at) {
        const day = new Date(item.created_at).getDay();
        counts[day] += 1;
      }
    });

    const alertTrend: ChartDataGroup = {
      labels: days,
      datasets: [{
        label: 'Alerts Logged',
        data: counts,
        backgroundColor: '#f59e0b',
        borderColor: '#f59e0b',
        borderWidth: 1,
      }],
    };

    // 4. Device Status
    const active = deviceStatusData?.filter((d) => (d.status || '').toUpperCase() === 'ACTIVE').length || 0;
    const inactive = deviceStatusData?.filter((d) => ['INACTIVE', 'OFFLINE'].includes((d.status || '').toUpperCase())).length || 0;
    const maintenance = deviceStatusData?.filter((d) => (d.status || '').toUpperCase() === 'MAINTENANCE' || !d.status).length || 0;

    const deviceStatus: ChartDataGroup = {
      labels: ['ACTIVE', 'INACTIVE / OFFLINE', 'MAINTENANCE'],
      datasets: [{
        data: [active, inactive, maintenance],
        backgroundColor: ['#2d7d46', '#dc2626', '#f59e0b'],
        borderColor: ['#2d7d46', '#dc2626', '#f59e0b'],
        borderWidth: 1,
      }],
    };

    // 5. Top Alerting Devices
    const deviceCounts: Record<string, number> = {};
    topDevices?.forEach((item) => {
      const uid = item.device_uid || 'Unknown';
      deviceCounts[uid] = (deviceCounts[uid] || 0) + 1;
    });

    const sortedDevices = Object.entries(deviceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topAlertingDevices: ChartDataGroup = {
      labels: sortedDevices.map(([uid]) => uid),
      datasets: [{
        label: 'High Ammonia Readings',
        data: sortedDevices.map(([, count]) => count),
        backgroundColor: '#1a365d',
        borderColor: '#1a365d',
        borderWidth: 1,
      }],
    };

    // 6. Top Sites by Ammonia Level
    const siteLabels = siteSummaryData.map((s) => s.site_name || 'Site');
    const siteAmmonia = siteSummaryData.map((s) => s.avg_ammonia || 0);

    const clientsLivestock: ChartDataGroup = {
      labels: siteLabels.length > 0 ? siteLabels : ['No Sites'],
      datasets: [{
        label: 'Avg Ammonia (PPM)',
        data: siteAmmonia.length > 0 ? siteAmmonia : [0],
        backgroundColor: '#2d7d46',
        borderColor: '#2d7d46',
        borderWidth: 1,
      }],
    };

    // 7. Schedule Status Distribution
    const scheduled = scheduleStatusData?.filter((s) => (s.status || '').toUpperCase() === 'SCHEDULED').length || 0;
    const inProgress = scheduleStatusData?.filter((s) => (s.status || '').toUpperCase() === 'IN_PROGRESS').length || 0;
    const completed = scheduleStatusData?.filter((s) => (s.status || '').toUpperCase() === 'COMPLETED').length || 0;
    const cancelled = scheduleStatusData?.filter((s) => (s.status || '').toUpperCase() === 'CANCELLED').length || 0;

    const scheduleStatus: ChartDataGroup = {
      labels: ['SCHEDULED', 'IN PROGRESS', 'COMPLETED', 'CANCELLED'],
      datasets: [{
        data: [scheduled, inProgress, completed, cancelled],
        backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#64748b'],
        borderWidth: 1,
      }],
    };

    return {
      ammoniaTrend,
      alertSeverity,
      alertTrend,
      deviceStatus,
      topAlertingDevices,
      clientsLivestock,
      scheduleStatus,
    };
  };

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get stats from official schema tables: inspection_sites, inspection_schedules, devices, inspection_tags
      const [sitesRes, schedulesRes, devicesRes, tagsRes, alertsRes] = await Promise.all([
        supabase.from('inspection_sites').select('id', { count: 'exact', head: true }),
        supabase.from('inspection_schedules').select('id', { count: 'exact', head: true }),
        supabase.from('devices').select('id', { count: 'exact', head: true }),
        supabase.from('inspection_tags').select('id', { count: 'exact', head: true }),
        supabase.from('inspection_tags').select('id', { count: 'exact', head: true }).or('status.eq.CRITICAL,status.eq.HIGH,status.eq.WARNING,ammonia.gt.25'),
      ]);

      setStats({
  return { stats, chartData, loading, refresh: fetchDashboardData };
}