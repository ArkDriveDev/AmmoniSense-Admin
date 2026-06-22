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
  IonSpinner,
  IonBadge,
  IonIcon,
  IonChip
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import ConfirmationModal from '../components/ConfirmationModal';
import { hardwareChipOutline, businessOutline } from 'ionicons/icons';

export default function Devices() {
  const [devices, setDevices] = useState<any[]>([]);
  const [piggeries, setPiggeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [form, setForm] = useState({
    piggery_id: '',
    device_uid: '',
    firmware_version: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [devicesRes, piggeriesRes] = await Promise.all([
        supabase
          .from('devices')
          .select(`
            *,
            piggeries (
              id,
              piggery_name,
              piggery_serial,
              clients (
                id,
                full_name
              )
            )
          `)
          .order('installed_at', { ascending: false }),
        supabase
          .from('piggeries')
          .select(`
            id, 
            piggery_name, 
            piggery_serial,
            clients (
              id,
              full_name
            )
          `)
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
          firmware_version: form.firmware_version || '1.0.0',
          installed_at: new Date().toISOString(),
          last_seen: new Date().toISOString()
        }]);

      if (error) {
        alert('Error creating device: ' + error.message);
        return;
      }

      alert('Device created successfully!');
      setShowModal(false);
      setForm({ device_uid: '', piggery_id: '', firmware_version: '' });
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

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'danger';
      case 'PENDING': return 'warning';
      default: return 'medium';
    }
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
                  <h2>
                    <IonIcon icon={hardwareChipOutline} />
                    &nbsp;{d.device_uid}
                  </h2>
                  <p>
                    <IonIcon icon={businessOutline} style={{ marginRight: '4px' }} />
                    Piggery: {d.piggeries?.piggery_name || 'Unknown'}
                    {d.piggeries?.clients && (
                      <span style={{ fontSize: '12px', color: 'gray' }}>
                        {' '}(Owner: {d.piggeries.clients.full_name})
                      </span>
                    )}
                  </p>
                  <p>Firmware: {d.firmware_version || 'Unknown'}</p>
                  <p>Installed: {new Date(d.installed_at).toLocaleDateString()}</p>
                  {d.last_seen && (
                    <p style={{ fontSize: '12px', color: 'gray' }}>
                      Last seen: {new Date(d.last_seen).toLocaleString()}
                    </p>
                  )}
                </IonLabel>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <IonBadge color={getStatusColor(d.status)}>
                    {d.status || 'Unknown'}
                  </IonBadge>
                  {d.last_seen && (
                    <IonChip color={new Date().getTime() - new Date(d.last_seen).getTime() < 60000 ? 'success' : 'warning'}>
                      <IonLabel>
                        {new Date().getTime() - new Date(d.last_seen).getTime() < 60000 ? 'Online' : 'Offline'}
                      </IonLabel>
                    </IonChip>
                  )}
                </div>
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
              placeholder="Device UID (e.g. ESP32-001) *"
              onIonChange={(e) => setForm({ ...form, device_uid: e.detail.value! })}
            />

            <IonInput
              placeholder="Firmware Version (e.g. 1.0.0)"
              onIonChange={(e) => setForm({ ...form, firmware_version: e.detail.value! })}
            />

            <IonSelect
              placeholder="Select Piggery *"
              onIonChange={(e) => setForm({ ...form, piggery_id: e.detail.value })}
            >
              {piggeries.map((p) => (
                <IonSelectOption key={p.id} value={p.id}>
                  {p.piggery_name} ({p.piggery_serial})
                  {p.clients && ` - Owner: ${p.clients.full_name}`}
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