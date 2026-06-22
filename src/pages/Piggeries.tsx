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
  IonSpinner,
  IonBadge,
  IonIcon,
  IonChip
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import ConfirmationModal from '../components/ConfirmationModal';
import { businessOutline, personOutline } from 'ionicons/icons';

export default function Piggeries() {
  const [piggeries, setPiggeries] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [deviceCounts, setDeviceCounts] = useState<Record<number, number>>({});

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
        .select(`
          *,
          clients (
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching piggeries:', error);
        alert('Failed to fetch piggeries: ' + error.message);
        return;
      }

      setPiggeries(data || []);

      // Get device counts for each piggery
      const counts: Record<number, number> = {};
      for (const piggery of data || []) {
        const { count } = await supabase
          .from('devices')
          .select('id', { count: 'exact', head: true })
          .eq('piggery_id', piggery.id);
        counts[piggery.id] = count || 0;
      }
      setDeviceCounts(counts);
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
        .select('id, full_name, organization_name, email');

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
          location: form.location || null,
          client_id: parseInt(form.client_id)
        }]);

      if (error) {
        alert('Error creating piggery: ' + error.message);
        return;
      }

      alert('Piggery created successfully!');
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
                  {p.clients ? (
                    <p>
                      <IonIcon icon={personOutline} style={{ marginRight: '4px' }} />
                      Owner: {p.clients.full_name}
                      {p.clients.email && ` (${p.clients.email})`}
                    </p>
                  ) : (
                    <p style={{ color: 'orange' }}>No client assigned</p>
                  )}
                </IonLabel>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <IonBadge color="primary">
                    <IonIcon icon={businessOutline} />
                    &nbsp;{deviceCounts[p.id] || 0} Devices
                  </IonBadge>
                  {p.clients ? (
                    <IonChip color="success">Assigned</IonChip>
                  ) : (
                    <IonChip color="warning">Unassigned</IonChip>
                  )}
                </div>
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