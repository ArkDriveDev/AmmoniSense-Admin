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
  IonInput,
  IonModal,
  IonButtons,
  IonSelect,
  IonSelectOption
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export default function Piggeries() {

  const [piggeries, setPiggeries] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    piggery_serial: '',
    piggery_name: '',
    location: '',
    client_id: ''
  });

  useEffect(() => {
    fetchPiggeries();
    fetchClients();
  }, []);

  // ------------------------
  // FETCH PIGGERIES
  // ------------------------
  const fetchPiggeries = async () => {
    const { data, error } = await supabase
      .from('piggeries')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setPiggeries(data || []);
  };

  // ------------------------
  // FETCH CLIENTS (profiles)
  // ------------------------
  const fetchClients = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'client');

    setClients(data || []);
  };

  // ------------------------
  // CREATE PIGGERY
  // ------------------------
  const createPiggery = async () => {

    const { error } = await supabase
      .from('piggeries')
      .insert([
        {
          piggery_serial: form.piggery_serial,
          piggery_name: form.piggery_name,
          location: form.location,
          client_id: parseInt(form.client_id)
        }
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    setShowModal(false);

    setForm({
      piggery_serial: '',
      piggery_name: '',
      location: '',
      client_id: ''
    });

    fetchPiggeries();
  };

  // ------------------------
  // UI
  // ------------------------
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

        {/* LIST */}
        <IonList>
          {piggeries.map((p) => (
            <IonItem key={p.id}>
              <IonLabel>
                <h2>{p.piggery_name}</h2>
                <p>Serial: {p.piggery_serial}</p>
                <p>Location: {p.location}</p>
                <p>Client ID: {p.client_id}</p>
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
              placeholder="Piggery Serial"
              onIonChange={(e) =>
                setForm({ ...form, piggery_serial: e.detail.value! })
              }
            />

            <IonInput
              placeholder="Piggery Name"
              onIonChange={(e) =>
                setForm({ ...form, piggery_name: e.detail.value! })
              }
            />

            <IonInput
              placeholder="Location"
              onIonChange={(e) =>
                setForm({ ...form, location: e.detail.value! })
              }
            />

            {/* CLIENT SELECT */}
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