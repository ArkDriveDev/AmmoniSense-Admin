import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function useDashboardData() {
  const [stats, setStats] = useState({
    livestock: 0,
    devices: 0,
    alerts: 0,
    clients: 0,
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
      // Get stats
      const [livestockRes, devicesRes, alertsRes, clientsRes, sensorRes] = await Promise.all([
        supabase.from('livestock').select('id', { count: 'exact', head: true }),
        supabase.from('devices').select('id', { count: 'exact', head: true }),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('sensor_data').select('id', { count: 'exact', head: true })
      ]);

      setStats({
        livestock: livestockRes.count || 0,
        devices: devicesRes.count || 0,
        alerts: alertsRes.count || 0,
        clients: clientsRes.count || 0,
        sensorReadings: sensorRes.count || 0
      });

      // Fetch ammonia trend data - NO DATE FILTER (get all data)
      const { data: ammoniaData, error: ammoniaError } = await supabase
        .from('sensor_data')
        .select('ammonia, created_at')
        .order('created_at', { ascending: true });

      console.log('Ammonia Data (raw):', ammoniaData);
      console.log('Ammonia Data count:', ammoniaData?.length || 0);

      // Fetch alert severity distribution
      const { data: severityData } = await supabase
        .from('alerts')
        .select('severity');

      // Fetch alert trend - NO DATE FILTER
      const { data: alertTrendData } = await supabase
        .from('alerts')
        .select('created_at');

      // Fetch device status distribution
      const { data: deviceStatusData } = await supabase
        .from('devices')
        .select('status');

      // Fetch top alerting devices
      const { data: topDevices } = await supabase
        .from('alerts')
        .select('device_uid')
        .limit(1000);

      // Fetch clients with most livestock
      const { data: clientLivestock } = await supabase
        .from('livestock')
        .select('clients(full_name)');

      // Process data for charts
      const processedData = processChartData(
        ammoniaData || [],
        severityData || [],
        alertTrendData || [],
        deviceStatusData || [],
        topDevices || [],
        clientLivestock || []
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
    clientLivestock: any[]
  ) => {
    // ============================================
    // Process Ammonia Trend
    // ============================================
    const grouped: Record<string, number[]> = {};
    
    if (ammoniaData && ammoniaData.length > 0) {
      ammoniaData.forEach((item) => {
        if (item.ammonia !== null && item.ammonia !== undefined) {
          const date = new Date(item.created_at);
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

    console.log('Ammonia labels:', labels);
    console.log('Ammonia values:', values);

    const ammoniaTrend = {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [{
        label: 'Average Ammonia (ppm)',
        data: values.length > 0 ? values : [0],
        borderColor: '#3880ff',
        backgroundColor: 'rgba(56, 128, 255, 0.2)',
        fill: true,
        tension: 0.4,
      }],
    };

    // ============================================
    // Process Alert Severity
    // ============================================
    const severe = severityData?.filter((d) => d.severity === 'SEVERE').length || 0;
    const moderate = severityData?.filter((d) => d.severity === 'MODERATE').length || 0;
    const low = severityData?.filter((d) => d.severity === 'LOW').length || 0;

    const alertSeverity = {
      labels: ['SEVERE', 'MODERATE', 'LOW'],
      datasets: [{
        data: [severe, moderate, low],
        backgroundColor: ['#eb445a', '#ffc409', '#2dd36f'],
        borderColor: ['#eb445a', '#ffc409', '#2dd36f'],
        borderWidth: 1,
      }],
    };

    // ============================================
    // Process Alert Trend
    // ============================================
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = days.map(() => 0);

    alertTrendData?.forEach((item) => {
      const day = new Date(item.created_at).getDay();
      counts[day] += 1;
    });

    const alertTrend = {
      labels: days,
      datasets: [{
        label: 'Alerts',
        data: counts,
        backgroundColor: '#ffc409',
        borderColor: '#ffc409',
        borderWidth: 1,
      }],
    };

    // ============================================
    // Process Device Status
    // ============================================
    const active = deviceStatusData?.filter((d) => d.status === 'ACTIVE').length || 0;
    const inactive = deviceStatusData?.filter((d) => d.status === 'INACTIVE').length || 0;
    const pending = deviceStatusData?.filter((d) => d.status === 'PENDING' || !d.status).length || 0;

    const deviceStatus = {
      labels: ['ACTIVE', 'INACTIVE', 'PENDING'],
      datasets: [{
        data: [active, inactive, pending],
        backgroundColor: ['#2dd36f', '#eb445a', '#ffc409'],
        borderColor: ['#2dd36f', '#eb445a', '#ffc409'],
        borderWidth: 1,
      }],
    };

    // ============================================
    // Process Top Alerting Devices
    // ============================================
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
        label: 'Alerts',
        data: sortedDevices.map(([, count]) => count),
        backgroundColor: '#3880ff',
        borderColor: '#3880ff',
        borderWidth: 1,
      }],
    };

    // ============================================
    // Process Clients with Most Livestock
    // ============================================
    const clientCounts: Record<string, number> = {};
    clientLivestock?.forEach((item: any) => {
      const name = item.clients?.full_name || 'Unknown';
      clientCounts[name] = (clientCounts[name] || 0) + 1;
    });

    const sortedClients = Object.entries(clientCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const clientsLivestock = {
      labels: sortedClients.map(([name]) => name),
      datasets: [{
        label: 'Livestock',
        data: sortedClients.map(([, count]) => count),
        backgroundColor: '#3dc2ff',
        borderColor: '#3dc2ff',
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