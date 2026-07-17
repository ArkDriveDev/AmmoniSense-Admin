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
  IonToast,
  IonSearchbar
} from '@ionic/react';

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  businessOutline, 
  personOutline, 
  addOutline,
  trashOutline,
  createOutline
} from 'ionicons/icons';

import DeleteAlert from '../components/DeleteAlert';
import ConfirmAlert from '../components/ConfirmAlert';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useLivestock } from '../hooks/useLivestock';

export default function Livestock() {
  const { livestock, loading, deviceCounts, fetchLivestock } = useLivestock();
  const [clients, setClients] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [selectedLivestock, setSelectedLivestock] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const [form, setForm] = useState({
    livestock_serial: '',
    livestock_name: '',
    location: '',
    client_id: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, organization_name')
      .order('full_name');
    setClients(data || []);
  };

  const filteredLivestock = livestock.filter(l => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.livestock_name?.toLowerCase().includes(term) ||
      l.livestock_serial?.toLowerCase().includes(term) ||
      l.location?.toLowerCase().includes(term) ||
      l.clients?.full_name?.toLowerCase().includes(term)
    );
  }).sort((a, b) => {
    let aVal = a[sortBy] || '';
    let bVal = b[sortBy] || '';
    if (sortBy === 'client_name') {
      aVal = a.clients?.full_name || '';
      bVal = b.clients?.full_name || '';
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
    if (!form.livestock_serial || !form.livestock_name || !form.client_id) {
      setToastMessage('Please fill in all required fields');
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    const { error } = await supabase.from('livestock').insert([{
      livestock_serial: form.livestock_serial,
      livestock_name: form.livestock_name,
      location: form.location || null,
      client_id: parseInt(form.client_id)
    }]);

    if (error) {
      setToastMessage('Error: ' + error.message);
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    setToastMessage('Livestock created');
    setToastColor('success');
    setShowToast(true);
    setShowModal(false);
    setForm({ livestock_serial: '', livestock_name: '', location: '', client_id: '' });
    fetchLivestock();
  };

  const handleUpdate = async () => {
    const { error } = await supabase
      .from('livestock')
      .update({
        livestock_serial: form.livestock_serial,
        livestock_name: form.livestock_name,
        location: form.location || null,
        client_id: parseInt(form.client_id)
      })
      .eq('id', selectedLivestock.id);

    if (error) {
      setToastMessage('Error: ' + error.message);
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    setToastMessage('Livestock updated');
    setToastColor('success');
    setShowToast(true);
    setShowUpdateConfirm(false);
    setShowEditModal(false);
    setSelectedLivestock(null);
    fetchLivestock();
  };

  const handleDelete = async () => {
    const deviceCount = deviceCounts[selectedLivestock.id] || 0;
    const { error } = await supabase.from('livestock').delete().eq('id', selectedLivestock.id);

    if (error) {
      setToastMessage('Error: ' + error.message);
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    setToastMessage(`Deleted. ${deviceCount} devices removed.`);
    setToastColor('success');
    setShowToast(true);
    setShowDeleteAlert(false);
    setSelectedLivestock(null);
    fetchLivestock();
  };

  const openEditModal = (item: any) => {
    setSelectedLivestock(item);
    setForm({
      livestock_serial: item.livestock_serial || '',
      livestock_name: item.livestock_name || '',
      location: item.location || '',
      client_id: item.client_id?.toString() || ''
    });
    setShowEditModal(true);
  };

  const openDeleteAlert = (item: any) => {
    setSelectedLivestock(item);
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>LIVESTOCK</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowModal(true)}>
              <IonIcon icon={addOutline} /> ADD
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            placeholder="SEARCH LIVESTOCK..."
            value={searchTerm}
            onIonChange={(e) => setSearchTerm(e.detail.value || '')}
            animated
          />
        </IonToolbar>
        <IonToolbar>
          <div style={{ display: 'flex', gap: '8px', padding: '0 16px 8px 16px', flexWrap: 'wrap' }}>
            <IonButton 
              size="small" 
              fill={sortBy === 'livestock_name' ? 'solid' : 'outline'}
              onClick={() => handleSort('livestock_name')}
            >
              NAME {sortBy === 'livestock_name' && (sortOrder === 'asc' ? '▲' : '▼')}
            </IonButton>
            <IonButton 
              size="small" 
              fill={sortBy === 'livestock_serial' ? 'solid' : 'outline'}
              onClick={() => handleSort('livestock_serial')}
            >
              SERIAL {sortBy === 'livestock_serial' && (sortOrder === 'asc' ? '▲' : '▼')}
            </IonButton>
            <IonButton 
              size="small" 
              fill={sortBy === 'client_name' ? 'solid' : 'outline'}
              onClick={() => handleSort('client_name')}
            >
              CLIENT {sortBy === 'client_name' && (sortOrder === 'asc' ? '▲' : '▼')}
            </IonButton>
            <IonButton 
              size="small" 
              fill={sortBy === 'created_at' ? 'solid' : 'outline'}
              onClick={() => handleSort('created_at')}
            >
              DATE {sortBy === 'created_at' && (sortOrder === 'asc' ? '▲' : '▼')}
            </IonButton>
            <IonButton 
              size="small" 
              color="medium"
              fill="outline"
              onClick={() => {
                setSearchTerm('');
                setSortBy('created_at');
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
        ) : filteredLivestock.length === 0 ? (
          <EmptyState
            title="NO LIVESTOCK FOUND"
            message={searchTerm ? 'TRY A DIFFERENT SEARCH' : 'CLICK ADD TO CREATE YOUR FIRST LIVESTOCK'}
          />
        ) : (
          <IonList>
            {filteredLivestock.map((l) => (
              <IonItem key={l.id}>
                <IonLabel>
                  <h2>{l.livestock_name}</h2>
                  <p>SERIAL: {l.livestock_serial}</p>
                  <p>LOCATION: {l.location || 'NOT SPECIFIED'}</p>
                  <p>
                    <IonIcon icon={personOutline} /> OWNER: {l.clients?.full_name || 'UNASSIGNED'}
                  </p>
                </IonLabel>
                <div style={{ textAlign: 'right' }}>
                  <IonBadge color="primary">{deviceCounts[l.id] || 0} DEVICES</IonBadge>
                  <IonChip color={l.clients ? 'success' : 'warning'}>
                    {l.clients ? 'ASSIGNED' : 'UNASSIGNED'}
                  </IonChip>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'flex-end' }}>
                    <IonButton size="small" fill="clear" color="primary" onClick={() => openEditModal(l)}>
                      <IonIcon icon={createOutline} />
                    </IonButton>
                    <IonButton size="small" fill="clear" color="danger" onClick={() => openDeleteAlert(l)}>
                      <IonIcon icon={trashOutline} />
                    </IonButton>
                  </div>
                </div>
              </IonItem>
            ))}
          </IonList>
        )}

        <IonModal isOpen={showModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>CREATE LIVESTOCK</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>CLOSE</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonInput label="SERIAL" labelPlacement="floating" placeholder="LV-001"
              value={form.livestock_serial}
              onIonChange={(e) => setForm({ ...form, livestock_serial: e.detail.value?.toUpperCase() || '' })} />
            <IonInput label="NAME" labelPlacement="floating" placeholder="MAIN LIVESTOCK"
              value={form.livestock_name}
              onIonChange={(e) => setForm({ ...form, livestock_name: e.detail.value?.toUpperCase() || '' })} />
            <IonInput label="LOCATION" labelPlacement="floating" placeholder="LAGUNA"
              value={form.location}
              onIonChange={(e) => setForm({ ...form, location: e.detail.value?.toUpperCase() || '' })} />
            <IonSelect label="CLIENT" labelPlacement="floating" placeholder="SELECT CLIENT"
              value={form.client_id}
              onIonChange={(e) => setForm({ ...form, client_id: e.detail.value })}>
              {clients.map((c) => (
                <IonSelectOption key={c.id} value={c.id}>{c.full_name}</IonSelectOption>
              ))}
            </IonSelect>
            <IonButton expand="block" onClick={handleCreate}>CREATE</IonButton>
          </IonContent>
        </IonModal>

        <IonModal isOpen={showEditModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>EDIT LIVESTOCK</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowEditModal(false)}>CLOSE</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonInput label="SERIAL" labelPlacement="floating" placeholder="LV-001"
              value={form.livestock_serial}
              onIonChange={(e) => setForm({ ...form, livestock_serial: e.detail.value?.toUpperCase() || '' })} />
            <IonInput label="NAME" labelPlacement="floating" placeholder="MAIN LIVESTOCK"
              value={form.livestock_name}
              onIonChange={(e) => setForm({ ...form, livestock_name: e.detail.value?.toUpperCase() || '' })} />
            <IonInput label="LOCATION" labelPlacement="floating" placeholder="LAGUNA"
              value={form.location}
              onIonChange={(e) => setForm({ ...form, location: e.detail.value?.toUpperCase() || '' })} />
            <IonSelect label="CLIENT" labelPlacement="floating" placeholder="SELECT CLIENT"
              value={form.client_id}
              onIonChange={(e) => setForm({ ...form, client_id: e.detail.value })}>
              {clients.map((c) => (
                <IonSelectOption key={c.id} value={c.id}>{c.full_name}</IonSelectOption>
              ))}
            </IonSelect>
            <IonButton expand="block" onClick={() => setShowUpdateConfirm(true)}>UPDATE</IonButton>
          </IonContent>
        </IonModal>

        <ConfirmAlert
          isOpen={showUpdateConfirm}
          onClose={() => setShowUpdateConfirm(false)}
          onConfirm={handleUpdate}
          title="UPDATE LIVESTOCK?"
          message={`Update "${selectedLivestock?.livestock_name}"?`}
        />

        <DeleteAlert
          isOpen={showDeleteAlert}
          onClose={() => setShowDeleteAlert(false)}
          onConfirm={handleDelete}
          title="DELETE LIVESTOCK?"
          message={`Delete "${selectedLivestock?.livestock_name}"? ${deviceCounts[selectedLivestock?.id] || 0} devices will be removed.`}
          requireTypeConfirm={true}
          typeConfirmText="DELETE"
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