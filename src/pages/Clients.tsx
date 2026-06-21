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
  IonSpinner
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import ConfirmationModal from '../components/ConfirmationModal';

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    organization_name: '',
    password: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching clients:', error);
        alert('Failed to fetch clients: ' + error.message);
        return;
      }

      setClients(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.full_name,
            role: 'client'
          }
        }
      });

      if (authError) {
        alert('Auth error: ' + authError.message);
        return;
      }

      const user = authData.user ?? authData.session?.user;

      if (!user) {
        alert('Failed to create user');
        return;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          full_name: form.full_name,
          role: 'client'
        }]);

      if (profileError) {
        alert('Profile error: ' + profileError.message);
        return;
      }

      const { error: clientError } = await supabase
        .from('clients')
        .insert([{
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || null,
          organization_name: form.organization_name || null,
          profile_id: user.id
        }]);

      if (clientError) {
        alert('Client error: ' + clientError.message);
        return;
      }

      alert('Client created successfully');
      setShowModal(false);
      setForm({ full_name: '', email: '', phone: '', organization_name: '', password: '' });
      fetchClients();

    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    }
  };

  const confirmCreateClient = () => {
    if (!form.full_name || !form.email || !form.password) {
      alert('Please fill in all required fields');
      return;
    }
    setShowConfirmation(true);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Clients</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowModal(true)}>Add</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <IonSpinner />
            <p>Loading clients...</p>
          </div>
        ) : (
          <IonList>
            {clients.map((c) => (
              <IonItem key={c.id}>
                <IonLabel>
                  <h2>{c.full_name}</h2>
                  <p>Email: {c.email}</p>
                  {c.phone && <p>Phone: {c.phone}</p>}
                  {c.organization_name && <p>Organization: {c.organization_name}</p>}
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}

        <IonModal isOpen={showModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Create Client</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            <IonInput
              placeholder="Full Name *"
              onIonChange={(e) => setForm({ ...form, full_name: e.detail.value! })}
            />
            <IonInput
              placeholder="Email *"
              type="email"
              onIonChange={(e) => setForm({ ...form, email: e.detail.value! })}
            />
            <IonInput
              placeholder="Phone"
              type="tel"
              onIonChange={(e) => setForm({ ...form, phone: e.detail.value! })}
            />
            <IonInput
              placeholder="Organization Name"
              onIonChange={(e) => setForm({ ...form, organization_name: e.detail.value! })}
            />
            <IonInput
              type="password"
              placeholder="Password *"
              onIonChange={(e) => setForm({ ...form, password: e.detail.value! })}
            />
            <IonButton expand="block" onClick={confirmCreateClient}>
              Create Client
            </IonButton>
          </IonContent>
        </IonModal>

        <ConfirmationModal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={handleCreateClient}
          title="Confirm Create Client"
          message={`Are you sure you want to create client "${form.full_name}"?`}
          confirmText="Yes, Create"
          confirmColor="primary"
        />
      </IonContent>
    </IonPage>
  );
}