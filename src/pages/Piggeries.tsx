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

export default function Piggeries() {

  const [piggeries, setPiggeries] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: '',
    location: '',
    client_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: piggeryData } = await supabase
      .from('piggeries')
      .select('*');

    const { data: clientData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client');

    setPiggeries(piggeryData || []);
    setClients(clientData || []);
  };

  const createPiggery = async () => {
    const piggery_code = `PIG-${Date.now()}`;

    const { error } = await supabase
      .from('piggeries')
      .insert([
        {
          name: form.name,
          location: form.location,
          client_id: form.client_id,
          piggery_code
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
          <IonTitle>Piggeries</IonTitle>

          <IonButtons slot="end">
            <IonButton onClick={() => setShowModal(true)}>
              Add
            </IonButton>
          </IonButtons>

        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">

        <IonList>
          {piggeries.map((p) => (
            <IonItem key={p.id}>
              <IonLabel>
                <h2>{p.name}</h2>
                <p>{p.location}</p>
                <p>Code: {p.piggery_code}</p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>

        {/* MODAL */}
        <IonModal isOpen={showModal}>

          <IonHeader>
            <IonToolbar>
              <IonTitle>Create Piggery</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>
                  Close
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">

            <IonInput
              placeholder="Piggery Name"
              onIonChange={(e) =>
                setForm({ ...form, name: e.detail.value! })
              }
            />

            <IonInput
              placeholder="Location"
              onIonChange={(e) =>
                setForm({ ...form, location: e.detail.value! })
              }
            />

            <IonSelect
              placeholder="Select Client"
              onIonChange={(e) =>
                setForm({ ...form, client_id: e.detail.value })
              }
            >
              {clients.map((c) => (
                <IonSelectOption key={c.id} value={c.id}>
                  {c.full_name}
                </IonSelectOption>
              ))}
            </IonSelect>

            <IonButton expand="block" onClick={createPiggery}>
              Create Piggery
            </IonButton>

          </IonContent>

        </IonModal>

      </IonContent>

    </IonPage>
  );
}