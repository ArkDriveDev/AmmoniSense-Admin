import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonModal,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButtons
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export default function Devices() {

  const [devices, setDevices] = useState<any[]>([]);
  const [piggeries, setPiggeries] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    piggery_id: '',
    device_code: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {

    const { data: deviceData } = await supabase
      .from('devices')
      .select('*');

    const { data: piggeryData } = await supabase
      .from('piggeries')
      .select('*');

    setDevices(deviceData || []);
    setPiggeries(piggeryData || []);
  };

  const createDevice = async () => {

    const mqtt_topic = `piggery/ammonia/${form.device_code}`;

    const { error } = await supabase
      .from('devices')
      .insert([
        {
          piggery_id: form.piggery_id,
          device_code: form.device_code,
          mqtt_topic,
          status: 'ACTIVE',
          last_seen: new Date()
        }
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    setShowModal(false);
    fetchData();
  };

  return (
    <IonPage>

      <IonHeader>
        <IonToolbar>
          <IonTitle>Devices</IonTitle>

          <IonButtons slot="end">
            <IonButton onClick={() => setShowModal(true)}>
              Add
            </IonButton>
          </IonButtons>

        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">

        <IonList>
          {devices.map((d) => (
            <IonItem key={d.id}>
              <IonLabel>
                <h2>{d.device_code}</h2>
                <p>{d.mqtt_topic}</p>
                <p>Status: {d.status}</p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>

        {/* MODAL */}
        <IonModal isOpen={showModal}>

          <IonHeader>
            <IonToolbar>
              <IonTitle>Create Device</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>
                  Close
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">

            <IonInput
              placeholder="Device Code (e.g. ESP32-001)"
              onIonChange={(e) =>
                setForm({ ...form, device_code: e.detail.value! })
              }
            />

            <IonSelect
              placeholder="Select Piggery"
              onIonChange={(e) =>
                setForm({ ...form, piggery_id: e.detail.value })
              }
            >
              {piggeries.map((p) => (
                <IonSelectOption key={p.id} value={p.id}>
                  {p.name}
                </IonSelectOption>
              ))}
            </IonSelect>

            <IonButton expand="block" onClick={createDevice}>
              Create Device
            </IonButton>

          </IonContent>

        </IonModal>

      </IonContent>

    </IonPage>
  );
}