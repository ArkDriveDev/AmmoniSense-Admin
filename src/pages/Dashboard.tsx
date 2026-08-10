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
  IonRefresherContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon
} from '@ionic/react';

import {
  businessOutline,
  hardwareChipOutline,
  alertCircleOutline,
  peopleOutline,
  barChartOutline,
  mapOutline
} from 'ionicons/icons';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import {
  StatsCard,
  AmmoniaTrendChart,
  AlertSeverityChart,
  AlertTrendChart,
  DeviceStatusChart,
  TopAlertingDevicesChart,
  ClientsLivestockChart
} from '../components/charts';

import { useDashboardData } from '../hooks/useDashboardData';
import SiteGridMap, { SensorReadingMarker } from '../components/map/SiteGridMap';

export default function Dashboard() {
  const { stats, chartData, loading, refresh } = useDashboardData();
  const [mapReadings, setMapReadings] = useState<SensorReadingMarker[]>([]);

  useEffect(() => {
    fetchLatestMapReadings();
  }, []);

  const fetchLatestMapReadings = async () => {
    try {
      const { data } = await supabase
        .from('sensor_data')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        const markers: SensorReadingMarker[] = data
          .filter(d => d.latitude && d.longitude)
          .map(d => ({
            id: d.id,
            latitude: d.latitude,
            longitude: d.longitude,
            ammonia: d.ammonia || 0,
            grid_cell_id: d.grid_cell_id || undefined,
            device_uid: d.device_uid,
            created_at: d.created_at || d.submitted_at,
            photo_url: d.photo_url || undefined,
            status: d.status,
          }));

        setMapReadings(markers);
      }
    } catch (err) {
      console.error('Error fetching dashboard map readings:', err);
    }
  };

  const handleRefresh = async (event: CustomEvent) => {
    await refresh();
    await fetchLatestMapReadings();
    event.detail.complete();
  };

  if (loading || !chartData) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
            <IonTitle>MENRO ADMIN DASHBOARD</IonTitle>
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
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontWeight: 'bold' }}>MENRO ADMIN DASHBOARD</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f8fafc' }}>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <IonGrid>
          {/* Stats Cards */}
          <IonRow>
            <IonCol size="6" size-md="3">
              <StatsCard
                title="Monitoring Sites"
                value={stats.livestock}
                icon={businessOutline}
                color="primary"
              />
            </IonCol>
            <IonCol size="6" size-md="3">
              <StatsCard
                title="IoT Devices"
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
                color={stats.alerts > 0 ? 'danger' : 'success'}
                subtitle={stats.alerts > 0 ? 'Action required!' : 'All clear'}
              />
            </IonCol>
            <IonCol size="6" size-md="3">
              <StatsCard
                title="Site Owners"
                value={stats.clients}
                icon={peopleOutline}
                color="tertiary"
              />
            </IonCol>
          </IonRow>

          {/* Spatial Grid Map Card */}
          <IonRow>
            <IonCol size="12">
              <IonCard style={{ margin: '8px 0', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
                <IonCardHeader style={{ padding: '14px 16px 8px 16px', borderBottom: '1px solid #f1f5f9' }}>
                  <IonCardTitle style={{ fontSize: '16px', fontWeight: 'bold', color: '#1a365d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IonIcon icon={mapOutline} style={{ color: '#2d7d46' }} />
                    Live Spatial Environmental Grid Map
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent style={{ padding: '12px 16px 16px 16px' }}>
                  <SiteGridMap
                    siteName="MENRO Spatial Coverage Overview"
                    readings={mapReadings}
                    height="380px"
                  />
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Ammonia Trend */}
          <IonRow>
            <IonCol size="12">
              <IonCard style={{ margin: '8px 0', borderRadius: '12px' }}>
                <IonCardContent style={{ height: '300px' }}>
                  <AmmoniaTrendChart data={chartData.ammoniaTrend} />
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Alert Severity and Device Status */}
          <IonRow>
            <IonCol size="12" size-md="6">
              <IonCard style={{ margin: '8px 0', borderRadius: '12px' }}>
                <IonCardContent style={{ height: '250px' }}>
                  <AlertSeverityChart data={chartData.alertSeverity} />
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="12" size-md="6">
              <IonCard style={{ margin: '8px 0', borderRadius: '12px' }}>
                <IonCardContent style={{ height: '250px' }}>
                  <DeviceStatusChart data={chartData.deviceStatus} />
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Alert Trend */}
          <IonRow>
            <IonCol size="12">
              <IonCard style={{ margin: '8px 0', borderRadius: '12px' }}>
                <IonCardContent style={{ height: '300px' }}>
                  <AlertTrendChart data={chartData.alertTrend} />
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Top Alerting Devices and Clients Livestock */}
          <IonRow>
            <IonCol size="12" size-md="6">
              <IonCard style={{ margin: '8px 0', borderRadius: '12px' }}>
                <IonCardContent style={{ height: '300px' }}>
                  <TopAlertingDevicesChart data={chartData.topAlertingDevices} />
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="12" size-md="6">
              <IonCard style={{ margin: '8px 0', borderRadius: '12px' }}>
                <IonCardContent style={{ height: '300px' }}>
                  <ClientsLivestockChart data={chartData.clientsLivestock} />
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Total Sensor Readings */}
          <IonRow>
            <IonCol size="12">
              <IonCard style={{ margin: '8px 0', borderRadius: '12px' }}>
                <IonCardContent style={{ textAlign: 'center', padding: '24px' }}>
                  <IonIcon icon={barChartOutline} style={{ fontSize: '36px', color: '#f59e0b' }} />
                  <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a365d', margin: '8px 0 4px 0' }}>
                    {stats.sensorReadings.toLocaleString()}
                  </h2>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Total Environmental Readings Logged</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
}