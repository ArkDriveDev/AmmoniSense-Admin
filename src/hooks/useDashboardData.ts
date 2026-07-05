import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function useDashboardData() {
  const [stats, setStats] = useState({
    piggeries: 0,
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
      // 1. Get basic stats
      const [piggeriesRes, devicesRes, alertsRes, clientsRes, sensorRes] = await Promise.all([
        supabase.from('piggeries').select('id', { count: 'exact', head: true }),
        supabase.from('devices').select('id', { count: 'exact', head: true }),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('sensor_data').select('id', { count: 'exact', head: true })
      ]);

      setStats({
        piggeries: piggeriesRes.count || 0,
        devices: devicesRes.count || 0,
        alerts: alertsRes.count || 0,
        clients: clientsRes.count || 0,
        sensorReadings: sensorRes.count || 0
      });

      // 2. Fetch ammonia trend data (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: ammoniaData } = await supabase
        .from('sensor_data')
        .select('ammonia, created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // 3. Fetch alert severity distribution
      const { data: severityData } = await supabase
        .from('alerts')
        .select('severity');

      // 4. Fetch alert trend (last 7 days)
      const { data: alertTrendData } = await supabase
        .from('alerts')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString());

      // 5. Fetch device status distribution
      const { data: deviceStatusData } = await supabase
        .from('devices')
        .select('status');

      // 6. Fetch top alerting devices (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: topDevices } = await supabase
        .from('alerts')
        .select('device_uid')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .limit(1000);

      // 7. Fetch clients with most piggeries
      const { data: clientPiggeries } = await supabase
        .from('piggeries')
        .select('clients(full_name)');

      // Process data for charts
      const processedData = processChartData(
        ammoniaData || [],
        severityData || [],
        alertTrendData || [],
        deviceStatusData || [],
        topDevices || [],
        clientPiggeries || []
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
    clientPiggeries: any[]
  ) => {
    const ammoniaTrend = processAmmoniaTrend(ammoniaData);
    const alertSeverity = processAlertSeverity(severityData);
    const alertTrend = processAlertTrend(alertTrendData);
    const deviceStatus = processDeviceStatus(deviceStatusData);
    const topAlertingDevices = processTopDevices(topDevices);
    const clientsPiggeries = processClientPiggeries(clientPiggeries);

    return {
      ammoniaTrend,
      alertSeverity,
      alertTrend,
      deviceStatus,
      topAlertingDevices,
      clientsPiggeries
    };
  };

  const processAmmoniaTrend = (data: any[]) => {
    const grouped: Record<string, number[]> = {};
    
    data.forEach((item) => {
      const date = new Date(item.created_at).toLocaleDateString();
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item.ammonia || 0);
    });

    const labels = Object.keys(grouped).slice(-7);
    const values = labels.map((key) => {
      const avg = grouped[key].reduce((a, b) => a + b, 0) / grouped[key].length;
      return Math.round(avg);
    });

    return {
      labels,
      datasets: [{
        label: 'Average Ammonia (ppm)',
        data: values,
        borderColor: '#3880ff',
        backgroundColor: 'rgba(56, 128, 255, 0.2)',
        fill: true,
        tension: 0.4,
      }],
    };
  };

  const processAlertSeverity = (data: any[]) => {
    const severe = data.filter((d) => d.severity === 'SEVERE').length;
    const moderate = data.filter((d) => d.severity === 'MODERATE').length;
    const low = data.filter((d) => d.severity === 'LOW').length;

    return {
      labels: ['SEVERE', 'MODERATE', 'LOW'],
      datasets: [{
        data: [severe, moderate, low],
        backgroundColor: ['#eb445a', '#ffc409', '#2dd36f'],
        borderColor: ['#eb445a', '#ffc409', '#2dd36f'],
        borderWidth: 1,
      }],
    };
  };

  const processAlertTrend = (data: any[]) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = days.map(() => 0);

    data.forEach((item) => {
      const day = new Date(item.created_at).getDay();
      counts[day] += 1;
    });

    return {
      labels: days,
      datasets: [{
        label: 'Alerts',
        data: counts,
        backgroundColor: '#ffc409',
        borderColor: '#ffc409',
        borderWidth: 1,
      }],
    };
  };

  const processDeviceStatus = (data: any[]) => {
    const active = data.filter((d) => d.status === 'ACTIVE').length;
    const inactive = data.filter((d) => d.status === 'INACTIVE').length;
    const pending = data.filter((d) => d.status === 'PENDING' || !d.status).length;

    return {
      labels: ['ACTIVE', 'INACTIVE', 'PENDING'],
      datasets: [{
        data: [active, inactive, pending],
        backgroundColor: ['#2dd36f', '#eb445a', '#ffc409'],
        borderColor: ['#2dd36f', '#eb445a', '#ffc409'],
        borderWidth: 1,
      }],
    };
  };

  const processTopDevices = (data: any[]) => {
    const deviceCounts: Record<string, number> = {};
    data.forEach((item) => {
      const uid = item.device_uid || 'Unknown';
      deviceCounts[uid] = (deviceCounts[uid] || 0) + 1;
    });

    const sorted = Object.entries(deviceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      labels: sorted.map(([uid]) => uid),
      datasets: [{
        label: 'Alerts',
        data: sorted.map(([, count]) => count),
        backgroundColor: '#3880ff',
        borderColor: '#3880ff',
        borderWidth: 1,
      }],
    };
  };

  const processClientPiggeries = (data: any[]) => {
    const clientCounts: Record<string, number> = {};
    data.forEach((item: any) => {
      const name = item.clients?.full_name || 'Unknown';
      clientCounts[name] = (clientCounts[name] || 0) + 1;
    });

    const sorted = Object.entries(clientCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      labels: sorted.map(([name]) => name),
      datasets: [{
        label: 'Piggeries',
        data: sorted.map(([, count]) => count),
        backgroundColor: '#3dc2ff',
        borderColor: '#3dc2ff',
        borderWidth: 1,
      }],
    };
  };

  return { stats, chartData, loading, refresh: fetchDashboardData };
}