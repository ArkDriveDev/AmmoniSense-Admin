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
  IonCardContent,
  IonIcon
} from '@ionic/react';

import {
  businessOutline,
  hardwareChipOutline,
  alertCircleOutline,
  peopleOutline,
  barChartOutline
} from 'ionicons/icons';

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

export default function Dashboard() {
  const { stats, chartData, loading, refresh } = useDashboardData();

  const handleRefresh = async (event: CustomEvent) => {
    await refresh();
    event.detail.complete();
  };

  if (loading || !chartData) {
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

        <IonGrid>
          {/* Stats Cards */}
          <IonRow>
            <IonCol size="6" size-md="3">
              <StatsCard
                title="Livestock"
                value={stats.livestock}
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
                color={stats.alerts > 0 ? 'danger' : 'success'}
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

          {/* Top Alerting Devices and Clients Livestock */}
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
                  <ClientsLivestockChart data={chartData.clientsLivestock} />
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