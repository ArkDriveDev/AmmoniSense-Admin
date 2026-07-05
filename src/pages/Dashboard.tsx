import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonGrid,
  IonRow,
  IonCol,
  IonSpinner,
  IonRefresher,
  IonCard,
  IonRefresherContent,
  IonCardContent,
  IonIcon
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import {
  businessOutline,
  hardwareChipOutline,
  alertCircleOutline,
  peopleOutline,
  barChartOutline
} from 'ionicons/icons';

// Import chart components
import {
  StatsCard,
  AmmoniaTrendChart,
  AlertSeverityChart,
  AlertTrendChart,
  DeviceStatusChart,
  TopAlertingDevicesChart,
  ClientsPiggeriesChart
} from '../components/charts';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    piggeries: 0,
    devices: 0,
    alerts: 0,
    clients: 0,
    sensorReadings: 0
  });

  const [chartData, setChartData] = useState({
    ammoniaTrend: {
      labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
      datasets: [
        {
          label: 'Average Ammonia (ppm)',
          data: [12, 15, 35, 45, 30, 18],
          borderColor: '#3880ff',
          backgroundColor: 'rgba(56, 128, 255, 0.2)',
          fill: true,
        },
      ],
    },
    alertSeverity: {
      labels: ['SEVERE', 'MODERATE', 'LOW'],
      datasets: [
        {
          data: [5, 8, 3],
          backgroundColor: ['#eb445a', '#ffc409', '#2dd36f'],
          borderColor: ['#eb445a', '#ffc409', '#2dd36f'],
          borderWidth: 1,
        },
      ],
    },
    alertTrend: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          label: 'Alerts',
          data: [3, 5, 2, 8, 6, 4, 2],
          backgroundColor: '#ffc409',
          borderColor: '#ffc409',
          borderWidth: 1,
        },
      ],
    },
    deviceStatus: {
      labels: ['ACTIVE', 'INACTIVE', 'PENDING'],
      datasets: [
        {
          data: [280, 45, 20],
          backgroundColor: ['#2dd36f', '#eb445a', '#ffc409'],
          borderColor: ['#2dd36f', '#eb445a', '#ffc409'],
          borderWidth: 1,
        },
      ],
    },
    topAlertingDevices: {
      labels: ['ESP32-001', 'ESP32-045', 'ESP32-023', 'ESP32-089', 'ESP32-012'],
      datasets: [
        {
          label: 'Alerts',
          data: [12, 8, 6, 5, 4],
          backgroundColor: '#3880ff',
          borderColor: '#3880ff',
          borderWidth: 1,
        },
      ],
    },
    clientsPiggeries: {
      labels: ['Client A', 'Client B', 'Client C', 'Client D', 'Client E'],
      datasets: [
        {
          label: 'Piggeries',
          data: [8, 6, 5, 4, 3],
          backgroundColor: '#3dc2ff',
          borderColor: '#3dc2ff',
          borderWidth: 1,
        },
      ],
    },
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch stats from Supabase
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

      // Fetch real chart data from database (mock data shown above)
      // In production, replace with actual Supabase queries

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (event: CustomEvent) => {
    await fetchDashboardData();
    event.detail.complete();
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>DASHBOARD</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IonSpinner />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>DASHBOARD</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {/* Stats Cards */}
        <IonGrid>
          <IonRow>
            <IonCol size="6" size-md="3">
              <StatsCard
                title="Piggeries"
                value={stats.piggeries}
                icon={businessOutline}
                color="primary"
              />
            </IonCol>
            <IonCol size="6" size-md="3">
              <StatsCard
                title="Devices"
                value={stats.devices}
                icon={hardwareChipOutline}
                color="secondary"
              />
            </IonCol>
            <IonCol size="6" size-md="3">
              <StatsCard
                title="Active Alerts"
                value={stats.alerts}
                icon={alertCircleOutline}
                color="danger"
                subtitle={stats.alerts > 0 ? 'Action required!' : 'All clear'}
              />
            </IonCol>
            <IonCol size="6" size-md="3">
              <StatsCard
                title="Clients"
                value={stats.clients}
                icon={peopleOutline}
                color="tertiary"
              />
            </IonCol>
          </IonRow>

          {/* Ammonia Trend */}
          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardContent style={{ height: '300px' }}>
                  <AmmoniaTrendChart data={chartData.ammoniaTrend} />
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Alert Severity and Device Status */}
          <IonRow>
            <IonCol size="12" size-md="6">
              <IonCard>
                <IonCardContent style={{ height: '250px' }}>
                  <AlertSeverityChart data={chartData.alertSeverity} />
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="12" size-md="6">
              <IonCard>
                <IonCardContent style={{ height: '250px' }}>
                  <DeviceStatusChart data={chartData.deviceStatus} />
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Alert Trend */}
          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardContent style={{ height: '300px' }}>
                  <AlertTrendChart data={chartData.alertTrend} />
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Top Alerting Devices and Clients Piggeries */}
          <IonRow>
            <IonCol size="12" size-md="6">
              <IonCard>
                <IonCardContent style={{ height: '300px' }}>
                  <TopAlertingDevicesChart data={chartData.topAlertingDevices} />
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="12" size-md="6">
              <IonCard>
                <IonCardContent style={{ height: '300px' }}>
                  <ClientsPiggeriesChart data={chartData.clientsPiggeries} />
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Total Sensor Readings */}
          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardContent style={{ textAlign: 'center' }}>
                  <IonIcon icon={barChartOutline} style={{ fontSize: '32px', color: 'var(--ion-color-warning)' }} />
                  <h2 style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.sensorReadings.toLocaleString()}</h2>
                  <p style={{ fontSize: '14px', color: 'var(--ion-color-medium)' }}>Total Sensor Readings</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
}