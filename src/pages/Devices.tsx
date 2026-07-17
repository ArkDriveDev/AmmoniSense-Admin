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
  IonToast,
  IonSearchbar
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { 
  hardwareChipOutline, 
  businessOutline, 
  addOutline,
  trashOutline,
  createOutline
} from 'ionicons/icons';

import DeleteAlert from '../components/DeleteAlert';
import ConfirmAlert from '../components/ConfirmAlert';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Devices() {
  const [devices, setDevices] = useState<any[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<any[]>([]);
  const [livestock, setLivestock] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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
    livestock_id: '',
    device_uid: '',
    firmware_version: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterAndSortDevices();
  }, [devices, searchTerm, sortBy, sortOrder]);

  const filterAndSortDevices = () => {
    let result = [...devices];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(d =>
        d.device_uid?.toLowerCase().includes(term) ||
        d.livestock?.livestock_name?.toLowerCase().includes(term) ||
        d.firmware_version?.toLowerCase().includes(term) ||
        d.status?.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';
      
      if (sortBy === 'livestock_name') {
        aVal = a.livestock?.livestock_name || '';
        bVal = b.livestock?.livestock_name || '';
      }
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredDevices(result);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [devicesRes, livestockRes] = await Promise.all([
        supabase
          .from('devices')
          .select(`
            *,
            livestock (
              id,
              livestock_name,
              livestock_serial,
              clients (
                id,
                full_name
              )
            )
          `)
          .order('installed_at', { ascending: false }),
        supabase
          .from('livestock')
          .select(`
            id, 
            livestock_name, 
            livestock_serial,
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

      if (livestockRes.error) {
        console.error('Error fetching livestock:', livestockRes.error);
        setToastMessage('Failed to fetch livestock: ' + livestockRes.error.message);
        setToastColor('danger');
        setShowToast(true);
        return;
      }

      setDevices(devicesRes.data || []);
      setLivestock(livestockRes.data || []);
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
      if (!form.device_uid || !form.livestock_id) {
        setToastMessage('Please fill in all required fields');
        setToastColor('danger');
        setShowToast(true);
        return;
      }

      const { error } = await supabase.from('devices').insert([{
        device_uid: form.device_uid,
        livestock_id: parseInt(form.livestock_id),
        status: form.status || 'ACTIVE',
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

      setToastMessage('Device created successfully');
      setToastColor('success');
      setShowToast(true);
      setShowModal(false);
      setForm({ device_uid: '', livestock_id: '', firmware_version: '', status: 'ACTIVE' });
      fetchData();
    } catch (err) {
      console.error('Unexpected error:', err);
      setToastMessage('An unexpected error occurred');
      setToastColor('danger');
      setShowToast(true);
    }
  };

  const handleEditDevice = async () => {
    try {
      if (!form.device_uid || !form.livestock_id) {
        setToastMessage('Please fill in all required fields');
        setToastColor('danger');
        setShowToast(true);
        return;
      }

      const { error } = await supabase
        .from('devices')
        .update({
          device_uid: form.device_uid,
          livestock_id: parseInt(form.livestock_id),
          status: form.status || 'ACTIVE',
          firmware_version: form.firmware_version || '1.0.0'
        })
        .eq('id', selectedDevice.id);

      if (error) {
        console.error('Error updating device:', error);
        setToastMessage('Error updating device: ' + error.message);
        setToastColor('danger');
        setShowToast(true);
        return;
      }

      setToastMessage('Device updated successfully');
      setToastColor('success');
      setShowToast(true);
      setShowUpdateConfirm(false);
      setShowEditModal(false);
      setSelectedDevice(null);
      fetchData();
    } catch (err) {
      console.error('Unexpected error:', err);
      setToastMessage('An unexpected error occurred');
      setToastColor('danger');
      setShowToast(true);
    }
  };

  const handleDeleteDevice = async () => {
    try {
      const { error } = await supabase.from('devices').delete().eq('id', selectedDevice.id);

      if (error) {
        console.error('Error deleting device:', error);
        setToastMessage('Error deleting device: ' + error.message);
        setToastColor('danger');
        setShowToast(true);
        return;
      }

      setToastMessage('Device deleted successfully');
      setToastColor('success');
      setShowToast(true);
      setShowDeleteAlert(false);
      setSelectedDevice(null);
      fetchData();
    } catch (err) {
      console.error('Unexpected error:', err);
      setToastMessage('An unexpected error occurred');
      setToastColor('danger');
      setShowToast(true);
    }
  };

  const openEditModal = (device: any) => {
    setSelectedDevice(device);
    setForm({
      device_uid: device.device_uid || '',
      livestock_id: device.livestock_id?.toString() || '',
      firmware_version: device.firmware_version || '',
      status: device.status || 'ACTIVE'
    });
    setShowEditModal(true);
  };

  const openDeleteAlert = (device: any) => {
    setSelectedDevice(device);
    setShowDeleteAlert(true);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
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
          <IonTitle>DEVICES</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowModal(true)}>
              <IonIcon icon={addOutline} /> ADD
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            placeholder="SEARCH DEVICES..."
            value={searchTerm}
            onIonChange={(e) => setSearchTerm(e.detail.value || '')}
            animated
          />
        </IonToolbar>
        <IonToolbar>
          <div style={{ display: 'flex', gap: '8px', padding: '0 16px 8px 16px', flexWrap: 'wrap' }}>
            <IonButton 
              size="small" 
              fill={sortBy === 'device_uid' ? 'solid' : 'outline'}
              onClick={() => handleSort('device_uid')}
            >
              UID {sortBy === 'device_uid' && (sortOrder === 'asc' ? '▲' : '▼')}
            </IonButton>
            <IonButton 
              size="small" 
              fill={sortBy === 'livestock_name' ? 'solid' : 'outline'}
              onClick={() => handleSort('livestock_name')}
            >
              LIVESTOCK {sortBy === 'livestock_name' && (sortOrder === 'asc' ? '▲' : '▼')}
            </IonButton>
            <IonButton 
              size="small" 
              fill={sortBy === 'status' ? 'solid' : 'outline'}
              onClick={() => handleSort('status')}
            >
              STATUS {sortBy === 'status' && (sortOrder === 'asc' ? '▲' : '▼')}
            </IonButton>
            <IonButton 
              size="small" 
              fill={sortBy === 'installed_at' ? 'solid' : 'outline'}
              onClick={() => handleSort('installed_at')}
            >
              INSTALLED {sortBy === 'installed_at' && (sortOrder === 'asc' ? '▲' : '▼')}
            </IonButton>
            <IonButton 
              size="small" 
              color="medium"
              fill="outline"
              onClick={() => {
                setSearchTerm('');
                setSortBy('installed_at');
                setSortOrder('desc');
              }}
            >
              RESET
            </IonButton>
          </div>
        </IonToolbar>
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
              <IonItem key={d.id}>
                <IonLabel>
                  <h2>
                    <IonIcon icon={hardwareChipOutline} />
                    &nbsp;{d.device_uid}
                  </h2>
                  <p>
                    <IonIcon icon={businessOutline} style={{ marginRight: '4px' }} />
                    LIVESTOCK: {d.livestock?.livestock_name || 'UNKNOWN'}
                    {d.livestock?.clients && (
                      <span style={{ fontSize: '12px', color: 'gray' }}>
                        {' '}(OWNER: {d.livestock.clients.full_name})
                      </span>
                    )}
                  </p>
                  <p>FIRMWARE: {d.firmware_version || 'UNKNOWN'}</p>
                  <p>INSTALLED: {new Date(d.installed_at).toLocaleDateString()}</p>
                  {d.last_seen && (
                    <p style={{ fontSize: '12px', color: 'gray' }}>
                      LAST SEEN: {new Date(d.last_seen).toLocaleString()}
                    </p>
                  )}
                </IonLabel>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <IonBadge color={getStatusColor(d.status)}>
                    {d.status || 'UNKNOWN'}
                  </IonBadge>
                  {d.last_seen && (
                    <IonChip color={new Date().getTime() - new Date(d.last_seen).getTime() < 60000 ? 'success' : 'warning'}>
                      <IonLabel>
                        {new Date().getTime() - new Date(d.last_seen).getTime() < 60000 ? 'ONLINE' : 'OFFLINE'}
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
              <IonTitle>CREATE DEVICE</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>CLOSE</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            <IonInput
              label="DEVICE UID"
              labelPlacement="floating"
              placeholder="E.G. ESP32-001"
              value={form.device_uid}
              onIonChange={(e) => setForm({ ...form, device_uid: e.detail.value?.toUpperCase() || '' })}
              style={{ marginBottom: '16px' }}
            />

            <IonInput
              label="FIRMWARE VERSION"
              labelPlacement="floating"
              placeholder="E.G. 1.0.0"
              value={form.firmware_version}
              onIonChange={(e) => setForm({ ...form, firmware_version: e.detail.value || '' })}
              style={{ marginBottom: '16px' }}
            />

            <IonSelect
              label="SELECT LIVESTOCK"
              labelPlacement="floating"
              placeholder="CHOOSE A LIVESTOCK"
              value={form.livestock_id}
              onIonChange={(e) => setForm({ ...form, livestock_id: e.detail.value })}
              style={{ marginBottom: '16px' }}
            >
              {livestock.map((l) => (
                <IonSelectOption key={l.id} value={l.id}>
                  {l.livestock_name} ({l.livestock_serial})
                  {l.clients && ` - OWNER: ${l.clients.full_name}`}
                </IonSelectOption>
              ))}
            </IonSelect>

            <IonSelect
              label="STATUS"
              labelPlacement="floating"
              placeholder="CHOOSE STATUS"
              value={form.status}
              onIonChange={(e) => setForm({ ...form, status: e.detail.value })}
              style={{ marginBottom: '16px' }}
            >
              <IonSelectOption value="ACTIVE">ACTIVE</IonSelectOption>
              <IonSelectOption value="INACTIVE">INACTIVE</IonSelectOption>
              <IonSelectOption value="PENDING">PENDING</IonSelectOption>
            </IonSelect>

            <IonButton expand="block" onClick={handleCreateDevice} style={{ marginTop: '16px' }}>
              CREATE DEVICE
            </IonButton>
          </IonContent>
        </IonModal>

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
            <IonInput
              label="DEVICE UID"
              labelPlacement="floating"
              placeholder="E.G. ESP32-001"
              value={form.device_uid}
              onIonChange={(e) => setForm({ ...form, device_uid: e.detail.value?.toUpperCase() || '' })}
              style={{ marginBottom: '16px' }}
            />

            <IonInput
              label="FIRMWARE VERSION"
              labelPlacement="floating"
              placeholder="E.G. 1.0.0"
              value={form.firmware_version}
              onIonChange={(e) => setForm({ ...form, firmware_version: e.detail.value || '' })}
              style={{ marginBottom: '16px' }}
            />

            <IonSelect
              label="SELECT LIVESTOCK"
              labelPlacement="floating"
              placeholder="CHOOSE A LIVESTOCK"
              value={form.livestock_id}
              onIonChange={(e) => setForm({ ...form, livestock_id: e.detail.value })}
              style={{ marginBottom: '16px' }}
            >
              {livestock.map((l) => (
                <IonSelectOption key={l.id} value={l.id}>
                  {l.livestock_name} ({l.livestock_serial})
                  {l.clients && ` - OWNER: ${l.clients.full_name}`}
                </IonSelectOption>
              ))}
            </IonSelect>

            <IonSelect
              label="STATUS"
              labelPlacement="floating"
              placeholder="CHOOSE STATUS"
              value={form.status}
              onIonChange={(e) => setForm({ ...form, status: e.detail.value })}
              style={{ marginBottom: '16px' }}
            >
              <IonSelectOption value="ACTIVE">ACTIVE</IonSelectOption>
              <IonSelectOption value="INACTIVE">INACTIVE</IonSelectOption>
              <IonSelectOption value="PENDING">PENDING</IonSelectOption>
            </IonSelect>

            <IonButton expand="block" onClick={() => setShowUpdateConfirm(true)} style={{ marginTop: '16px' }}>
              UPDATE DEVICE
            </IonButton>
          </IonContent>
        </IonModal>

        <ConfirmAlert
          isOpen={showUpdateConfirm}
          onClose={() => setShowUpdateConfirm(false)}
          onConfirm={handleEditDevice}
          title="UPDATE DEVICE?"
          message={`Update "${selectedDevice?.device_uid}"?`}
        />

        <DeleteAlert
          isOpen={showDeleteAlert}
          onClose={() => setShowDeleteAlert(false)}
          onConfirm={handleDeleteDevice}
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