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
  IonSelectOption,
  IonSpinner
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import ConfirmationModal from '../components/ConfirmationModal';

export default function Piggeries() {
  const [piggeries, setPiggeries] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

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

  const fetchPiggeries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('piggeries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching piggeries:', error);
        alert('Failed to fetch piggeries: ' + error.message);
        return;
      }

      setPiggeries(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, organization_name');

      if (error) {
        console.error('Error fetching clients:', error);
        return;
      }

      setClients(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  const handleCreatePiggery = async () => {
    try {
      const { error } = await supabase
        .from('piggeries')
        .insert([{
          piggery_serial: form.piggery_serial,
          piggery_name: form.piggery_name,
          location: form.location,
          client_id: parseInt(form.client_id)
        }]);

      if (error) {
        alert('Error creating piggery: ' + error.message);
        return;
      }

      alert('Piggery created successfully');
      setShowModal(false);
      setForm({ piggery_serial: '', piggery_name: '', location: '', client_id: '' });
      fetchPiggeries();
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    }
  };

  const confirmCreatePiggery = () => {
    if (!form.piggery_serial || !form.piggery_name || !form.client_id) {
      alert('Please fill in all required fields');
      return;
    }
    setShowConfirmation(true);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Piggeries</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowModal(true)}>Add</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <IonSpinner />
            <p>Loading piggeries...</p>
          </div>
        ) : (
          <IonList>
            {piggeries.map((p) => (
              <IonItem key={p.id}>
                <IonLabel>
                  <h2>{p.piggery_name}</h2>
                  <p>Serial: {p.piggery_serial}</p>
                  <p>Location: {p.location || 'Not specified'}</p>
                  <p>Client ID: {p.client_id}</p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}

        <IonModal isOpen={showModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Create Piggery</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            <IonInput
              placeholder="Piggery Serial *"
              onIonChange={(e) => setForm({ ...form, piggery_serial: e.detail.value! })}
            />

            <IonInput
              placeholder="Piggery Name *"
              onIonChange={(e) => setForm({ ...form, piggery_name: e.detail.value! })}
            />

            <IonInput
              placeholder="Location"
              onIonChange={(e) => setForm({ ...form, location: e.detail.value! })}
            />

            <IonSelect
              placeholder="Select Client *"
              onIonChange={(e) => setForm({ ...form, client_id: e.detail.value })}
            >
              {clients.map((c) => (
                <IonSelectOption key={c.id} value={c.id}>
                  {c.full_name} {c.organization_name ? `(${c.organization_name})` : ''}
                </IonSelectOption>
              ))}
            </IonSelect>

            <IonButton expand="block" onClick={confirmCreatePiggery}>
              Create Piggery
            </IonButton>
          </IonContent>
        </IonModal>

        <ConfirmationModal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={handleCreatePiggery}
          title="Confirm Create Piggery"
          message={`Are you sure you want to create piggery "${form.piggery_name}"?`}
          confirmText="Yes, Create"
          confirmColor="primary"
        />
      </IonContent>
    </IonPage>
  );
}