import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function useDashboardData() {
  const [stats, setStats] = useState({
    livestock: 0, // Monitoring Sites
    devices: 0,
    alerts: 0,
    clients: 0, // Site Owners
    sensorReadings: 0
  });
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Get stats from official schema tables (monitoring_sites, devices, site_owners, sensor_data)
      const [sitesRes, devicesRes, ownersRes, sensorRes, warningSensorRes] = await Promise.all([
        supabase.from('monitoring_sites').select('id', { count: 'exact', head: true }),
        supabase.from('devices').select('id', { count: 'exact', head: true }),
        supabase.from('site_owners').select('id', { count: 'exact', head: true }),
        supabase.from('sensor_data').select('id', { count: 'exact', head: true }),
        supabase.from('sensor_data').select('id', { count: 'exact', head: true }).or('status.eq.warning,status.eq.critical,ammonia.gt.25')
      ]);

      setStats({
        livestock: sitesRes.count || 0,
        devices: devicesRes.count || 0,
        alerts: warningSensorRes.count || 0,
        clients: ownersRes.count || 0,
        sensorReadings: sensorRes.count || 0
      });

      // 2. Fetch ammonia trend data
      const { data: ammoniaData } = await supabase
        .from('sensor_data')
        .select('ammonia, created_at')
        .order('created_at', { ascending: true })
        .limit(1000);

      // 3. Fetch alert severity / status distribution from sensor_data
      const { data: severityData } = await supabase
        .from('sensor_data')
        .select('status, ammonia');

      // 4. Fetch reading timestamp trend
      const { data: alertTrendData } = await supabase
        .from('sensor_data')
        .select('created_at, status, ammonia')
        .or('status.eq.warning,status.eq.critical,ammonia.gt.25');

      // 5. Fetch device status distribution
      const { data: deviceStatusData } = await supabase
        .from('devices')
        .select('status');

      // 6. Fetch top alerting devices from sensor_data
      const { data: topDevices } = await supabase
        .from('sensor_data')
        .select('device_uid')
        .or('status.eq.warning,status.eq.critical,ammonia.gt.25')
        .limit(1000);

      // 7. Fetch owners with monitoring sites
      const { data: clientSites } = await supabase
        .from('monitoring_sites')
        .select('site_owners(owner_name)');

      // Process data for charts
      const processedData = processChartData(
        ammoniaData || [],
        severityData || [],
        alertTrendData || [],
        deviceStatusData || [],
        topDevices || [],
        clientSites || []
      );

      setChartData(processedData);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (
    ammoniaData: any[],
    severityData: any[],
    alertTrendData: any[],
    deviceStatusData: any[],
    topDevices: any[],
    clientSites: any[]
  ) => {
    // Ammonia Trend
    const grouped: Record<string, number[]> = {};
    
    if (ammoniaData && ammoniaData.length > 0) {
      ammoniaData.forEach((item) => {
        if (item.ammonia !== null && item.ammonia !== undefined) {
          const date = new Date(item.created_at || item.submitted_at || Date.now());
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

    const ammoniaTrend = {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [{
        label: 'Average Ammonia (ppm)',
        data: values.length > 0 ? values : [0],
        borderColor: '#1a365d',
        backgroundColor: 'rgba(26, 54, 93, 0.2)',
        fill: true,
        tension: 0.4,
      }],
    };

    // Alert Severity
    const severe = severityData?.filter((d) => d.status === 'critical' || d.ammonia > 50).length || 0;
    const moderate = severityData?.filter((d) => (d.status === 'warning' || (d.ammonia > 25 && d.ammonia <= 50))).length || 0;
    const low = severityData?.filter((d) => d.status === 'normal' || d.ammonia <= 25).length || 0;

    const alertSeverity = {
      labels: ['CRITICAL (>50 ppm)', 'WARNING (25-50 ppm)', 'NORMAL (<25 ppm)'],
      datasets: [{
        data: [severe, moderate, low],
        backgroundColor: ['#dc2626', '#f59e0b', '#2d7d46'],
        borderColor: ['#dc2626', '#f59e0b', '#2d7d46'],
        borderWidth: 1,
      }],
    };

    // Alert Trend
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = days.map(() => 0);

    alertTrendData?.forEach((item) => {
      const day = new Date(item.created_at).getDay();
      counts[day] += 1;
    });

    const alertTrend = {
      labels: days,
      datasets: [{
        label: 'Alerts Logged',
        data: counts,
        backgroundColor: '#f59e0b',
        borderColor: '#f59e0b',
        borderWidth: 1,
      }],
    };

    // Device Status
    const active = deviceStatusData?.filter((d) => d.status === 'ACTIVE').length || 0;
    const inactive = deviceStatusData?.filter((d) => d.status === 'INACTIVE' || d.status === 'OFFLINE').length || 0;
    const maintenance = deviceStatusData?.filter((d) => d.status === 'MAINTENANCE' || !d.status).length || 0;

    const deviceStatus = {
      labels: ['ACTIVE', 'INACTIVE/OFFLINE', 'MAINTENANCE'],
      datasets: [{
        data: [active, inactive, maintenance],
        backgroundColor: ['#2d7d46', '#dc2626', '#f59e0b'],
        borderColor: ['#2d7d46', '#dc2626', '#f59e0b'],
        borderWidth: 1,
      }],
    };

    // Top Alerting Devices
    const deviceCounts: Record<string, number> = {};
    topDevices?.forEach((item) => {
      const uid = item.device_uid || 'Unknown';
      deviceCounts[uid] = (deviceCounts[uid] || 0) + 1;
    });

    const sortedDevices = Object.entries(deviceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topAlertingDevices = {
      labels: sortedDevices.map(([uid]) => uid),
      datasets: [{
        label: 'High Ammonia Alerts',
        data: sortedDevices.map(([, count]) => count),
        backgroundColor: '#1a365d',
        borderColor: '#1a365d',
        borderWidth: 1,
      }],
    };

    // Site Owners with Most Sites
    const ownerCounts: Record<string, number> = {};
    clientSites?.forEach((item: any) => {
      const name = item.site_owners?.owner_name || 'Unassigned';
      ownerCounts[name] = (ownerCounts[name] || 0) + 1;
    });

    const sortedOwners = Object.entries(ownerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const clientsLivestock = {
      labels: sortedOwners.map(([name]) => name),
      datasets: [{
        label: 'Monitoring Sites',
        data: sortedOwners.map(([, count]) => count),
        backgroundColor: '#2d7d46',
        borderColor: '#2d7d46',
        borderWidth: 1,
      }],
    };

    return {
      ammoniaTrend,
      alertSeverity,
      alertTrend,
      deviceStatus,
      topAlertingDevices,
      clientsLivestock
    };
  };

  return { stats, chartData, loading, refresh: fetchDashboardData };
}