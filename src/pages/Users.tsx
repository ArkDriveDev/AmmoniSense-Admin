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
  IonButtons
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export default function Users() {

  const [clients, setClients] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client');

    if (!error) setClients(data || []);
  };

  const createClient = async () => {

    // 1. create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (authError) {
      alert(authError.message);
      return;
    }

    // 2. insert into profiles
    const user = authData.user;

    if (user) {
      await supabase.from('profiles').insert([
        {
          id: user.id,
          full_name: form.full_name,
          email: form.email,
          role: 'client'
        }
      ]);
    }

    setShowModal(false);
    fetchClients();
  };

  return (
    <IonPage>

      <IonHeader>
        <IonToolbar>
          <IonTitle>Clients</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowModal(true)}>
              Add
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">

        <IonList>
          {clients.map((c) => (
            <IonItem key={c.id}>
              <IonLabel>
                <h2>{c.full_name}</h2>
                <p>{c.email}</p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>

        {/* CREATE MODAL */}
        <IonModal isOpen={showModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Create Client</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>
                  Close
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">

            <IonInput
              placeholder="Full Name"
              onIonChange={(e) =>
                setForm({ ...form, full_name: e.detail.value! })
              }
            />

            <IonInput
              placeholder="Email"
              onIonChange={(e) =>
                setForm({ ...form, email: e.detail.value! })
              }
            />

            <IonInput
              type="password"
              placeholder="Password"
              onIonChange={(e) =>
                setForm({ ...form, password: e.detail.value! })
              }
            />

            <IonButton expand="block" onClick={createClient}>
              Create Client
            </IonButton>

          </IonContent>
        </IonModal>

      </IonContent>

    </IonPage>
  );
}