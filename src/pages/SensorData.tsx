import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonList,
  IonItem,
  IonLabel
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export default function SensorData() {

  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('sensor_data')
      .select('*')
      .order('created_at', { ascending: false });

    setLogs(data || []);
  };

  return (
    <IonPage>

      <IonHeader>
        <IonToolbar>
          <IonTitle>Sensor Logs</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">

        <IonList>
          {logs.map((l) => (
            <IonItem key={l.id}>
              <IonLabel>
                <h2>Ammonia: {l.ammonia}</h2>
                <p>Battery: {l.battery}%</p>
                <p>Sunlight: {l.sunlight}</p>
                <p>Status: {l.status}</p>
                <p>{new Date(l.created_at).toLocaleString()}</p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>

      </IonContent>

    </IonPage>
  );
}