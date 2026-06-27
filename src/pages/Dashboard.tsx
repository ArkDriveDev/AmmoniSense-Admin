import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonGrid, IonRow, IonCol, IonCard, IonCardContent, IonIcon, IonSpinner } from '@ionic/react';
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { 
  businessOutline, 
  hardwareChipOutline, 
  alertCircleOutline, 
  barChartOutline,
  peopleOutline
} from 'ionicons/icons';

export default function Dashboard() {
  const [stats, setStats] = useState({
    piggeries: 0,
    devices: 0,
    alerts: 0,
    clients: 0,
    sensorReadings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
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
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
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
        <IonGrid>
          <IonRow>
            <IonCol size="6">
              <IonCard>
                <IonCardContent style={{ textAlign: 'center' }}>
                  <IonIcon icon={businessOutline} size="large" style={{ fontSize: '32px', color: 'var(--ion-color-primary)' }} />
                  <h2>{stats.piggeries}</h2>
                  <p>PIGGERIES</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="6">
              <IonCard>
                <IonCardContent style={{ textAlign: 'center' }}>
                  <IonIcon icon={hardwareChipOutline} size="large" style={{ fontSize: '32px', color: 'var(--ion-color-secondary)' }} />
                  <h2>{stats.devices}</h2>
                  <p>DEVICES</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="6">
              <IonCard>
                <IonCardContent style={{ textAlign: 'center' }}>
                  <IonIcon icon={alertCircleOutline} size="large" style={{ fontSize: '32px', color: stats.alerts > 0 ? 'var(--ion-color-danger)' : 'var(--ion-color-success)' }} />
                  <h2 style={{ color: stats.alerts > 0 ? 'var(--ion-color-danger)' : 'var(--ion-color-success)' }}>{stats.alerts}</h2>
                  <p>UNREAD ALERTS</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="6">
              <IonCard>
                <IonCardContent style={{ textAlign: 'center' }}>
                  <IonIcon icon={peopleOutline} size="large" style={{ fontSize: '32px', color: 'var(--ion-color-tertiary)' }} />
                  <h2>{stats.clients}</h2>
                  <p>CLIENTS</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardContent style={{ textAlign: 'center' }}>
                  <IonIcon icon={barChartOutline} size="large" style={{ fontSize: '32px', color: 'var(--ion-color-warning)' }} />
                  <h2>{stats.sensorReadings}</h2>
                  <p>TOTAL SENSOR READINGS</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
}