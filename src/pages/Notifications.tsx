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
  IonButtons
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export default function Notifications() {

  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    fetchAlerts();
  }, []);

  // FETCH ALERTS
  const fetchAlerts = async () => {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setAlerts(data || []);
  };

  // MARK AS READ
  const markAsRead = async (id: number) => {
    await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', id);

    fetchAlerts();
  };

  return (
    <IonPage>

      <IonHeader>
        <IonToolbar>
          <IonTitle>Alerts</IonTitle>

          <IonButtons slot="end">
            <IonButton onClick={fetchAlerts}>
              Refresh
            </IonButton>
          </IonButtons>

        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">

        <IonList>

          {alerts.map((a) => (
            <IonItem key={a.id} button onClick={() => markAsRead(a.id)}>

              <IonLabel>
                <h2>{a.message || "Ammonia Alert"}</h2>

                <p>Ammonia: {a.ammonia}</p>
                <p>Device: {a.device_id}</p>

                <p>
                  {new Date(a.created_at).toLocaleString()}
                </p>
              </IonLabel>

              <IonBadge
                color={
                  a.severity === "SEVERE"
                    ? "danger"
                    : a.severity === "MODERATE"
                    ? "warning"
                    : "success"
                }
              >
                {a.severity}
              </IonBadge>

              {a.is_read ? (
                <IonBadge color="medium">READ</IonBadge>
              ) : (
                <IonBadge color="primary">NEW</IonBadge>
              )}

            </IonItem>
          ))}

        </IonList>

      </IonContent>

    </IonPage>
  );
}