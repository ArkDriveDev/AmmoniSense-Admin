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
  IonIcon,
  IonButton
} from '@ionic/react';
import {
  businessOutline,
  hardwareChipOutline,
  alertCircleOutline,
  warningOutline,
  refreshOutline
} from 'ionicons/icons';
import { useState } from 'react';
import { useSiteAnalytics } from '../hooks/useSiteAnalytics';
import { StatsCard } from '../components/charts';

export default function Dashboard() {
  const { sites, globalStats, loading, refresh } = useSiteAnalytics();

  if (loading && sites.length === 0) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
            <IonTitle style={{ fontWeight: 'bold' }}>MENRO ADMIN DASHBOARD</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ textAlign: 'center', marginTop: '100px' }}>
            <IonSpinner name="crescent" color="primary" />
            <p style={{ color: '#64748b' }}>Loading Site Analytics...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontWeight: 'bold' }}>MENRO ADMIN DASHBOARD • PER SITE ANALYTICS</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => refresh()} style={{ '--color': '#ffffff' }}>
            <IonIcon icon={refreshOutline} slot="icon-only" />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f8fafc' }}>
        <IonGrid style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Top Stats Overview */}
          <IonRow>
            <IonCol size="6" size-md="3">
              <StatsCard title="Total Sites" value={globalStats.totalSites} icon={businessOutline} color="primary" subtitle="Active locations" />
            </IonCol>
            <IonCol size="6" size-md="3">
              <StatsCard title="Active Devices" value={globalStats.activeDevices} icon={hardwareChipOutline} color="secondary" subtitle="Online nodes" />
            </IonCol>
            <IonCol size="6" size-md="3">
              <StatsCard title="Sites with Alerts" value={globalStats.sitesWithAlerts} icon={warningOutline} color={globalStats.sitesWithAlerts > 0 ? 'warning' : 'success'} subtitle={globalStats.sitesWithAlerts > 0 ? 'Action needed' : 'All clear'} />
            </IonCol>
            <IonCol size="6" size-md="3">
              <StatsCard title="Critical Alerts" value={globalStats.criticalAlerts} icon={alertCircleOutline} color={globalStats.criticalAlerts > 0 ? 'danger' : 'success'} subtitle={globalStats.criticalAlerts > 0 ? 'Immediate action!' : 'Normal levels'} />
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
}