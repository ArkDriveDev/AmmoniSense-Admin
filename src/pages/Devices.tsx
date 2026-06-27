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
  IonBadge,
  IonIcon,
  IonChip,
  IonToast,
  IonItemSliding,
  IonItemOptions,
  IonItemOption
} from '@ionic/react';

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  hardwareChipOutline, 
  businessOutline, 
  addOutline,
  trashOutline,
  createOutline
} from 'ionicons/icons';

import SearchSortBar from '../components/SearchSortBar';
import DeleteAlert from '../components/DeleteAlert';
import ConfirmAlert from '../components/ConfirmAlert';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useDevices } from '../hooks/useDevices';

export default function Devices() {
  const { devices, loading, fetchDevices } = useDevices();
  const [piggeries, setPiggeries] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('installed_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const [form, setForm] = useState({
    piggery_id: '',
    device_uid: '',
    firmware_version: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    fetchPiggeries();
  }, []);

  const fetchPiggeries = async () => {
    const { data } = await supabase
      .from('piggeries')
      .select('id, piggery_name, piggery_serial, clients(id, full_name)');
    setPiggeries(data || []);
  };

  const filteredDevices = devices.filter(d => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.device_uid?.toLowerCase().includes(term) ||
      d.piggeries?.piggery_name?.toLowerCase().includes(term) ||
      d.firmware_version?.toLowerCase().includes(term) ||
      d.status?.toLowerCase().includes(term)
    );
  }).sort((a, b) => {
    let aVal = a[sortBy] || '';
    let bVal = b[sortBy] || '';
    if (sortBy === 'piggery_name') {
      aVal = a.piggeries?.piggery_name || '';
      bVal = b.piggeries?.piggery_name || '';
    }
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleCreate = async () => {
    if (!form.device_uid || !form.piggery_id) {
      setToastMessage('Please fill in all required fields');
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    const { error } = await supabase.from('devices').insert([{
      device_uid: form.device_uid,
      piggery_id: parseInt(form.piggery_id),
      status: form.status || 'ACTIVE',
      firmware_version: form.firmware_version || '1.0.0',
      installed_at: new Date().toISOString(),
      last_seen: new Date().toISOString()
    }]);

    if (error) {
      setToastMessage('Error: ' + error.message);
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    setToastMessage('Device created');
    setToastColor('success');
    setShowToast(true);
    setShowModal(false);
    setForm({ device_uid: '', piggery_id: '', firmware_version: '', status: 'ACTIVE' });
    fetchDevices();
  };

  const handleUpdate = async () => {
    const { error } = await supabase
      .from('devices')
      .update({
        device_uid: form.device_uid,
        piggery_id: parseInt(form.piggery_id),
        status: form.status || 'ACTIVE',
        firmware_version: form.firmware_version || '1.0.0'
      })
      .eq('id', selectedDevice.id);

    if (error) {
      setToastMessage('Error: ' + error.message);
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    setToastMessage('Device updated');
    setToastColor('success');
    setShowToast(true);
    setShowUpdateConfirm(false);
    setShowEditModal(false);
    setSelectedDevice(null);
    fetchDevices();
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('devices').delete().eq('id', selectedDevice.id);

    if (error) {
      setToastMessage('Error: ' + error.message);
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    setToastMessage('Device deleted');
    setToastColor('success');
    setShowToast(true);
    setShowDeleteAlert(false);
    setSelectedDevice(null);
    fetchDevices();
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
          <IonTitle>DEVICES</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowModal(true)}>
              <IonIcon icon={addOutline} /> ADD
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <SearchSortBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          sortFields={[
            { key: 'device_uid', label: 'UID' },
            { key: 'piggery_name', label: 'PIGGERY' },
            { key: 'status', label: 'STATUS' },
            { key: 'installed_at', label: 'INSTALLED' }
          ]}
          onReset={() => {
            setSearchTerm('');
            setSortBy('installed_at');
            setSortOrder('desc');
          }}
          placeholder="SEARCH DEVICES..."
        />
      </IonHeader>

      <IonContent className="ion-padding">
        {loading ? (
          <LoadingSpinner />
        ) : filteredDevices.length === 0 ? (
          <EmptyState
            title="NO DEVICES FOUND"
            message={searchTerm ? 'TRY A DIFFERENT SEARCH' : 'CLICK ADD TO CREATE YOUR FIRST DEVICE'}
          />
        ) : (
          <IonList>
            {filteredDevices.map((d) => (
              <IonItemSliding key={d.id}>
                <IonItem>
                  <IonLabel>
                    <h2><IonIcon icon={hardwareChipOutline} /> {d.device_uid}</h2>
                    <p>
                      <IonIcon icon={businessOutline} /> PIGGERY: {d.piggeries?.piggery_name || 'UNKNOWN'}
                      {d.piggeries?.clients && ` (OWNER: ${d.piggeries.clients.full_name})`}
                    </p>
                    <p>FIRMWARE: {d.firmware_version || 'UNKNOWN'}</p>
                    <p>INSTALLED: {new Date(d.installed_at).toLocaleDateString()}</p>
                    {d.last_seen && <p style={{ fontSize: '12px', color: 'gray' }}>LAST SEEN: {new Date(d.last_seen).toLocaleString()}</p>}
                  </IonLabel>
                  <div style={{ textAlign: 'right' }}>
                    <IonBadge color={getStatusColor(d.status)}>{d.status || 'UNKNOWN'}</IonBadge>
                    {d.last_seen && (
                      <IonChip color={new Date().getTime() - new Date(d.last_seen).getTime() < 60000 ? 'success' : 'warning'}>
                        {new Date().getTime() - new Date(d.last_seen).getTime() < 60000 ? 'ONLINE' : 'OFFLINE'}
                      </IonChip>
                    )}
                  </div>
                </IonItem>
                <IonItemOptions side="end">
                  <IonItemOption color="primary" onClick={() => {
                    setSelectedDevice(d);
                    setForm({
                      device_uid: d.device_uid || '',
                      piggery_id: d.piggery_id?.toString() || '',
                      firmware_version: d.firmware_version || '',
                      status: d.status || 'ACTIVE'
                    });
                    setShowEditModal(true);
                  }}>
                    <IonIcon icon={createOutline} />
                  </IonItemOption>
                  <IonItemOption color="danger" onClick={() => {
                    setSelectedDevice(d);
                    setShowDeleteAlert(true);
                  }}>
                    <IonIcon icon={trashOutline} />
                  </IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            ))}
          </IonList>
        )}

        {/* Create Modal */}
        <IonModal isOpen={showModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>CREATE DEVICE</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>CLOSE</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonInput label="DEVICE UID" labelPlacement="floating" placeholder="ESP32-001"
              value={form.device_uid}
              onIonChange={(e) => setForm({ ...form, device_uid: e.detail.value?.toUpperCase() || '' })} />
            <IonInput label="FIRMWARE" labelPlacement="floating" placeholder="1.0.0"
              value={form.firmware_version}
              onIonChange={(e) => setForm({ ...form, firmware_version: e.detail.value || '' })} />
            <IonSelect label="PIGGERY" labelPlacement="floating" placeholder="SELECT PIGGERY"
              value={form.piggery_id}
              onIonChange={(e) => setForm({ ...form, piggery_id: e.detail.value })}>
              {piggeries.map((p) => (
                <IonSelectOption key={p.id} value={p.id}>
                  {p.piggery_name} ({p.piggery_serial}) {p.clients && `- ${p.clients.full_name}`}
                </IonSelectOption>
              ))}
            </IonSelect>
            <IonSelect label="STATUS" labelPlacement="floating" placeholder="SELECT STATUS"
              value={form.status}
              onIonChange={(e) => setForm({ ...form, status: e.detail.value })}>
              <IonSelectOption value="ACTIVE">ACTIVE</IonSelectOption>
              <IonSelectOption value="INACTIVE">INACTIVE</IonSelectOption>
              <IonSelectOption value="PENDING">PENDING</IonSelectOption>
            </IonSelect>
            <IonButton expand="block" onClick={handleCreate}>CREATE</IonButton>
          </IonContent>
        </IonModal>

        {/* Edit Modal */}
        <IonModal isOpen={showEditModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>EDIT DEVICE</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowEditModal(false)}>CLOSE</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonInput label="DEVICE UID" labelPlacement="floating" placeholder="ESP32-001"
              value={form.device_uid}
              onIonChange={(e) => setForm({ ...form, device_uid: e.detail.value?.toUpperCase() || '' })} />
            <IonInput label="FIRMWARE" labelPlacement="floating" placeholder="1.0.0"
              value={form.firmware_version}
              onIonChange={(e) => setForm({ ...form, firmware_version: e.detail.value || '' })} />
            <IonSelect label="PIGGERY" labelPlacement="floating" placeholder="SELECT PIGGERY"
              value={form.piggery_id}
              onIonChange={(e) => setForm({ ...form, piggery_id: e.detail.value })}>
              {piggeries.map((p) => (
                <IonSelectOption key={p.id} value={p.id}>
                  {p.piggery_name} ({p.piggery_serial}) {p.clients && `- ${p.clients.full_name}`}
                </IonSelectOption>
              ))}
            </IonSelect>
            <IonSelect label="STATUS" labelPlacement="floating" placeholder="SELECT STATUS"
              value={form.status}
              onIonChange={(e) => setForm({ ...form, status: e.detail.value })}>
              <IonSelectOption value="ACTIVE">ACTIVE</IonSelectOption>
              <IonSelectOption value="INACTIVE">INACTIVE</IonSelectOption>
              <IonSelectOption value="PENDING">PENDING</IonSelectOption>
            </IonSelect>
            <IonButton expand="block" onClick={() => setShowUpdateConfirm(true)}>UPDATE</IonButton>
          </IonContent>
        </IonModal>

        <ConfirmAlert
          isOpen={showUpdateConfirm}
          onClose={() => setShowUpdateConfirm(false)}
          onConfirm={handleUpdate}
          title="UPDATE DEVICE?"
          message={`Update "${selectedDevice?.device_uid}"?`}
        />

        <DeleteAlert
          isOpen={showDeleteAlert}
          onClose={() => setShowDeleteAlert(false)}
          onConfirm={handleDelete}
          title="DELETE DEVICE?"
          message={`Delete "${selectedDevice?.device_uid}"?`}
          requireTypeConfirm={false}
        />

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