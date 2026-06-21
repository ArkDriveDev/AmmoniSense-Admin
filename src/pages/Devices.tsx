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
  IonButtons,
  IonSpinner
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import ConfirmationModal from '../components/ConfirmationModal';

export default function Devices() {
  const [devices, setDevices] = useState<any[]>([]);
  const [piggeries, setPiggeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [form, setForm] = useState({
    piggery_id: '',
    device_uid: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [devicesRes, piggeriesRes] = await Promise.all([
        supabase.from('devices').select('*').order('created_at', { ascending: false }),
        supabase.from('piggeries').select('id, piggery_name, piggery_serial')
      ]);

      if (devicesRes.error) {
        console.error('Error fetching devices:', devicesRes.error);
        alert('Failed to fetch devices: ' + devicesRes.error.message);
        return;
      }

      if (piggeriesRes.error) {
        console.error('Error fetching piggeries:', piggeriesRes.error);
        alert('Failed to fetch piggeries: ' + piggeriesRes.error.message);
        return;
      }

      setDevices(devicesRes.data || []);
      setPiggeries(piggeriesRes.data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDevice = async () => {
    try {
      const { error } = await supabase
        .from('devices')
        .insert([{
          device_uid: form.device_uid,
          piggery_id: parseInt(form.piggery_id),
          status: 'ACTIVE',
          last_seen: new Date().toISOString()
        }]);

      if (error) {
        alert('Error creating device: ' + error.message);
        return;
      }

      alert('Device created successfully');
      setShowModal(false);
      setForm({ device_uid: '', piggery_id: '' });
      fetchData();
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    }
  };

  const confirmCreateDevice = () => {
    if (!form.device_uid || !form.piggery_id) {
      alert('Please fill in all required fields');
      return;
    }
    setShowConfirmation(true);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Devices</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowModal(true)}>Add</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <IonSpinner />
            <p>Loading devices...</p>
          </div>
        ) : (
          <IonList>
            {devices.map((d) => (
              <IonItem key={d.id}>
                <IonLabel>
                  <h2>{d.device_uid}</h2>
                  <p>Piggery ID: {d.piggery_id}</p>
                  <p>Status: {d.status}</p>
                  <p>Last Seen: {d.last_seen ? new Date(d.last_seen).toLocaleString() : 'Never'}</p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}

        <IonModal isOpen={showModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Create Device</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            <IonInput
              placeholder="Device UID (e.g. ESP32-001)"
              onIonChange={(e) => setForm({ ...form, device_uid: e.detail.value! })}
            />

            <IonSelect
              placeholder="Select Piggery"
              onIonChange={(e) => setForm({ ...form, piggery_id: e.detail.value })}
            >
              {piggeries.map((p) => (
                <IonSelectOption key={p.id} value={p.id}>
                  {p.piggery_name} ({p.piggery_serial})
                </IonSelectOption>
              ))}
            </IonSelect>

            <IonButton expand="block" onClick={confirmCreateDevice}>
              Create Device
            </IonButton>
          </IonContent>
        </IonModal>

        <ConfirmationModal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={handleCreateDevice}
          title="Confirm Create Device"
          message={`Are you sure you want to create device "${form.device_uid}"?`}
          confirmText="Yes, Create"
          confirmColor="primary"
        />
      </IonContent>
    </IonPage>
  );
}