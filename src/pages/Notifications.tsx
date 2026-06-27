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
  IonButton,
  IonButtons,
  IonSpinner
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export default function Notifications() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching alerts:', error);
        alert('Failed to fetch alerts: ' + error.message);
        return;
      }

      setAlerts(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', id);

      if (error) {
        console.error('Error marking alert as read:', error);
        alert('Failed to mark alert as read: ' + error.message);
        return;
      }

      fetchAlerts();
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>ALERTS</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={fetchAlerts}>REFRESH</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <IonSpinner />
            <p>LOADING ALERTS...</p>
          </div>
        ) : (
          <IonList>
            {alerts.map((a) => (
              <IonItem key={a.id} button onClick={() => markAsRead(a.id)}>
                <IonLabel>
                  <h2>AMMONIA ALERT</h2>
                  <p>AMMONIA LEVEL: {a.ammonia}</p>
                  <p>DEVICE UID: {a.device_uid || 'UNKNOWN'}</p>
                  <p>PIGGERY ID: {a.piggery_id || 'UNKNOWN'}</p>
                  <p>{new Date(a.created_at).toLocaleString()}</p>
                </IonLabel>

                <IonBadge
                  color={
                    a.severity === 'SEVERE'
                      ? 'danger'
                      : a.severity === 'MODERATE'
                      ? 'warning'
                      : 'success'
                  }
                >
                  {a.severity || 'UNKNOWN'}
                </IonBadge>

                {a.is_read ? (
                  <IonBadge color="medium">READ</IonBadge>
                ) : (
                  <IonBadge color="primary">NEW</IonBadge>
                )}
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
}