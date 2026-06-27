import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonButton,
  IonButtons,
  IonIcon
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { refreshOutline } from 'ionicons/icons';

export default function SensorData() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);

  useEffect(() => {
    fetchLogs();
    
    if (realtimeEnabled) {
      const subscription = supabase
        .channel('sensor_data_channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'sensor_data'
          },
          (payload) => {
            console.log('New sensor data:', payload);
            setLogs(prev => [payload.new, ...prev]);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [realtimeEnabled]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sensor_data')
        .select(`
          *,
          devices (
            device_uid,
            piggery_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching sensor data:', error);
        alert('Failed to fetch data: ' + error.message);
        return;
      }

      setLogs(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (event: CustomEvent) => {
    await fetchLogs();
    event.detail.complete();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>SENSOR LOGS</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setRealtimeEnabled(!realtimeEnabled)}>
              {realtimeEnabled ? 'LIVE' : 'PAUSED'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <IonSpinner />
            <p>LOADING SENSOR DATA...</p>
          </div>
        ) : (
          <IonList>
            {logs.map((l) => (
              <IonItem key={l.id}>
                <IonLabel>
                  <h2>AMMONIA: {l.ammonia} PPM</h2>
                  <p>DEVICE: {l.device_uid || 'UNKNOWN'}</p>
                  <p>BATTERY: {l.battery}%</p>
                  <p>SUNLIGHT: {l.sunlight} LUX</p>
                  <p>{new Date(l.created_at).toLocaleString()}</p>
                </IonLabel>
                <IonBadge color={l.status === 'ACTIVE' ? 'success' : 'warning'}>
                  {l.status || 'UNKNOWN'}
                </IonBadge>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
}