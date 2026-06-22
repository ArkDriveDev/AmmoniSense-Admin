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
  IonChip,
  IonToast
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { businessOutline, personOutline, addOutline } from 'ionicons/icons';

export default function Piggeries() {
  const [piggeries, setPiggeries] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');
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
            email,
            organization_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching piggeries:', error);
        setToastMessage('Failed to fetch piggeries: ' + error.message);
        setToastColor('danger');
        setShowToast(true);
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
      setToastMessage('An unexpected error occurred');
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, organization_name, email')
        .order('full_name', { ascending: true });

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
      // Validate form
      if (!form.piggery_serial || !form.piggery_name || !form.client_id) {
        setToastMessage('Please fill in all required fields');
        setToastColor('danger');
        setShowToast(true);
        return;
      }

      const { data, error } = await supabase
        .from('piggeries')
        .insert([{
          piggery_serial: form.piggery_serial,
          piggery_name: form.piggery_name,
          location: form.location || null,
          client_id: parseInt(form.client_id)
        }])
        .select();

      if (error) {
        console.error('Error creating piggery:', error);
        setToastMessage('Error creating piggery: ' + error.message);
        setToastColor('danger');
        setShowToast(true);
        return;
      }

      setToastMessage('Piggery created successfully!');
      setToastColor('success');
      setShowToast(true);
      setShowModal(false);
      setForm({ piggery_serial: '', piggery_name: '', location: '', client_id: '' });
      fetchPiggeries();
    } catch (err) {
      console.error('Unexpected error:', err);
      setToastMessage('An unexpected error occurred');
      setToastColor('danger');
      setShowToast(true);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Piggeries</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowModal(true)}>
              <IonIcon icon={addOutline} />
              &nbsp;Add
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <IonSpinner />
            <p>Loading piggeries...</p>
          </div>
        ) : piggeries.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <p>No piggeries found.</p>
            <p style={{ fontSize: '14px', color: 'gray' }}>
              Click the Add button to create your first piggery.
            </p>
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

        {/* CREATE PIGGERY MODAL */}
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
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', color: 'gray' }}>
                Fill in the details below to create a new piggery.
              </p>
            </div>

            <IonInput
              label="Piggery Serial"
              labelPlacement="floating"
              placeholder="e.g. PIG-001"
              value={form.piggery_serial}
              onIonChange={(e) => setForm({ ...form, piggery_serial: e.detail.value! })}
              style={{ marginBottom: '16px' }}
            />

            <IonInput
              label="Piggery Name"
              labelPlacement="floating"
              placeholder="e.g. Main Piggery"
              value={form.piggery_name}
              onIonChange={(e) => setForm({ ...form, piggery_name: e.detail.value! })}
              style={{ marginBottom: '16px' }}
            />

            <IonInput
              label="Location"
              labelPlacement="floating"
              placeholder="e.g. Laguna, Philippines"
              value={form.location}
              onIonChange={(e) => setForm({ ...form, location: e.detail.value! })}
              style={{ marginBottom: '16px' }}
            />

            <IonSelect
              label="Select Client"
              labelPlacement="floating"
              placeholder="Choose a client"
              value={form.client_id}
              onIonChange={(e) => setForm({ ...form, client_id: e.detail.value })}
              style={{ marginBottom: '16px' }}
            >
              {clients.map((c) => (
                <IonSelectOption key={c.id} value={c.id}>
                  {c.full_name} {c.organization_name ? `(${c.organization_name})` : ''}
                </IonSelectOption>
              ))}
            </IonSelect>

            <IonButton 
              expand="block" 
              onClick={handleCreatePiggery}
              style={{ marginTop: '16px' }}
            >
              Create Piggery
            </IonButton>
          </IonContent>
        </IonModal>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={5000}
          color={toastColor}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
}