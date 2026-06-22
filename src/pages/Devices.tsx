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
  IonChip,
  IonToast
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { hardwareChipOutline, businessOutline, addOutline } from 'ionicons/icons';

export default function Devices() {
  const [devices, setDevices] = useState<any[]>([]);
  const [piggeries, setPiggeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');

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
        setToastMessage('Failed to fetch devices: ' + devicesRes.error.message);
        setToastColor('danger');
        setShowToast(true);
        return;
      }

      if (piggeriesRes.error) {
        console.error('Error fetching piggeries:', piggeriesRes.error);
        setToastMessage('Failed to fetch piggeries: ' + piggeriesRes.error.message);
        setToastColor('danger');
        setShowToast(true);
        return;
      }

      setDevices(devicesRes.data || []);
      setPiggeries(piggeriesRes.data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      setToastMessage('An unexpected error occurred');
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDevice = async () => {
    try {
      if (!form.device_uid || !form.piggery_id) {
        setToastMessage('Please fill in all required fields');
        setToastColor('danger');
        setShowToast(true);
        return;
      }

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
        console.error('Error creating device:', error);
        setToastMessage('Error creating device: ' + error.message);
        setToastColor('danger');
        setShowToast(true);
        return;
      }

      setToastMessage('Device created successfully!');
      setToastColor('success');
      setShowToast(true);
      setShowModal(false);
      setForm({ device_uid: '', piggery_id: '', firmware_version: '' });
      fetchData();
    } catch (err) {
      console.error('Unexpected error:', err);
      setToastMessage('An unexpected error occurred');
      setToastColor('danger');
      setShowToast(true);
    }
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
            <p>Loading devices...</p>
          </div>
        ) : devices.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <IonIcon icon={hardwareChipOutline} size="large" style={{ fontSize: '48px', color: 'gray' }} />
            <p>No devices found.</p>
            <p style={{ fontSize: '14px', color: 'gray' }}>
              Click the Add button to create your first device.
            </p>
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

        {/* CREATE DEVICE MODAL */}
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
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', color: 'gray' }}>
                Fill in the details below to create a new device.
              </p>
            </div>

            <IonInput
              label="Device UID"
              labelPlacement="floating"
              placeholder="e.g. ESP32-001"
              value={form.device_uid}
              onIonChange={(e) => setForm({ ...form, device_uid: e.detail.value! })}
              style={{ marginBottom: '16px' }}
            />

            <IonInput
              label="Firmware Version"
              labelPlacement="floating"
              placeholder="e.g. 1.0.0"
              value={form.firmware_version}
              onIonChange={(e) => setForm({ ...form, firmware_version: e.detail.value! })}
              style={{ marginBottom: '16px' }}
            />

            <IonSelect
              label="Select Piggery"
              labelPlacement="floating"
              placeholder="Choose a piggery"
              value={form.piggery_id}
              onIonChange={(e) => setForm({ ...form, piggery_id: e.detail.value })}
              style={{ marginBottom: '16px' }}
            >
              {piggeries.map((p) => (
                <IonSelectOption key={p.id} value={p.id}>
                  {p.piggery_name} ({p.piggery_serial})
                  {p.clients && ` - Owner: ${p.clients.full_name}`}
                </IonSelectOption>
              ))}
            </IonSelect>

            <IonButton 
              expand="block" 
              onClick={handleCreateDevice}
              style={{ marginTop: '16px' }}
            >
              Create Device
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