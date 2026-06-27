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
  businessOutline, 
  personOutline, 
  addOutline,
  trashOutline,
  createOutline
} from 'ionicons/icons';

import SearchSortBar from '../components/SearchSortBar';
import DeleteAlert from '../components/DeleteAlert';
import ConfirmAlert from '../components/ConfirmAlert';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { usePiggeries } from '../hooks/usePiggeries';

export default function Piggeries() {
  const { piggeries, loading, deviceCounts, fetchPiggeries } = usePiggeries();
  const [clients, setClients] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [selectedPiggery, setSelectedPiggery] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const [form, setForm] = useState({
    piggery_serial: '',
    piggery_name: '',
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

  const filteredPiggeries = piggeries.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.piggery_name?.toLowerCase().includes(term) ||
      p.piggery_serial?.toLowerCase().includes(term) ||
      p.location?.toLowerCase().includes(term) ||
      p.clients?.full_name?.toLowerCase().includes(term)
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
    if (!form.piggery_serial || !form.piggery_name || !form.client_id) {
      setToastMessage('Please fill in all required fields');
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    const { error } = await supabase.from('piggeries').insert([{
      piggery_serial: form.piggery_serial,
      piggery_name: form.piggery_name,
      location: form.location || null,
      client_id: parseInt(form.client_id)
    }]);

    if (error) {
      setToastMessage('Error: ' + error.message);
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    setToastMessage('Piggery created');
    setToastColor('success');
    setShowToast(true);
    setShowModal(false);
    setForm({ piggery_serial: '', piggery_name: '', location: '', client_id: '' });
    fetchPiggeries();
  };

  const handleUpdate = async () => {
    const { error } = await supabase
      .from('piggeries')
      .update({
        piggery_serial: form.piggery_serial,
        piggery_name: form.piggery_name,
        location: form.location || null,
        client_id: parseInt(form.client_id)
      })
      .eq('id', selectedPiggery.id);

    if (error) {
      setToastMessage('Error: ' + error.message);
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    setToastMessage('Piggery updated');
    setToastColor('success');
    setShowToast(true);
    setShowUpdateConfirm(false);
    setShowEditModal(false);
    setSelectedPiggery(null);
    fetchPiggeries();
  };

  const handleDelete = async () => {
    const deviceCount = deviceCounts[selectedPiggery.id] || 0;
    const { error } = await supabase.from('piggeries').delete().eq('id', selectedPiggery.id);

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
    setSelectedPiggery(null);
    fetchPiggeries();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>PIGGERIES</IonTitle>
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
            { key: 'piggery_name', label: 'NAME' },
            { key: 'piggery_serial', label: 'SERIAL' },
            { key: 'client_name', label: 'CLIENT' },
            { key: 'created_at', label: 'DATE' }
          ]}
          onReset={() => {
            setSearchTerm('');
            setSortBy('created_at');
            setSortOrder('desc');
          }}
          placeholder="SEARCH PIGGERIES..."
        />
      </IonHeader>

      <IonContent className="ion-padding">
        {loading ? (
          <LoadingSpinner />
        ) : filteredPiggeries.length === 0 ? (
          <EmptyState
            title="NO PIGGERIES FOUND"
            message={searchTerm ? 'TRY A DIFFERENT SEARCH' : 'CLICK ADD TO CREATE YOUR FIRST PIGGERY'}
          />
        ) : (
          <IonList>
            {filteredPiggeries.map((p) => (
              <IonItemSliding key={p.id}>
                <IonItem>
                  <IonLabel>
                    <h2>{p.piggery_name}</h2>
                    <p>SERIAL: {p.piggery_serial}</p>
                    <p>LOCATION: {p.location || 'NOT SPECIFIED'}</p>
                    <p>
                      <IonIcon icon={personOutline} /> OWNER: {p.clients?.full_name || 'UNASSIGNED'}
                    </p>
                  </IonLabel>
                  <div style={{ textAlign: 'right' }}>
                    <IonBadge color="primary">{deviceCounts[p.id] || 0} DEVICES</IonBadge>
                    <IonChip color={p.clients ? 'success' : 'warning'}>
                      {p.clients ? 'ASSIGNED' : 'UNASSIGNED'}
                    </IonChip>
                  </div>
                </IonItem>
                <IonItemOptions side="end">
                  <IonItemOption color="primary" onClick={() => {
                    setSelectedPiggery(p);
                    setForm({
                      piggery_serial: p.piggery_serial || '',
                      piggery_name: p.piggery_name || '',
                      location: p.location || '',
                      client_id: p.client_id?.toString() || ''
                    });
                    setShowEditModal(true);
                  }}>
                    <IonIcon icon={createOutline} />
                  </IonItemOption>
                  <IonItemOption color="danger" onClick={() => {
                    setSelectedPiggery(p);
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
              <IonTitle>CREATE PIGGERY</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>CLOSE</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonInput label="SERIAL" labelPlacement="floating" placeholder="PIG-001"
              value={form.piggery_serial}
              onIonChange={(e) => setForm({ ...form, piggery_serial: e.detail.value?.toUpperCase() || '' })} />
            <IonInput label="NAME" labelPlacement="floating" placeholder="MAIN PIGGERY"
              value={form.piggery_name}
              onIonChange={(e) => setForm({ ...form, piggery_name: e.detail.value?.toUpperCase() || '' })} />
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

        {/* Edit Modal */}
        <IonModal isOpen={showEditModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>EDIT PIGGERY</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowEditModal(false)}>CLOSE</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonInput label="SERIAL" labelPlacement="floating" placeholder="PIG-001"
              value={form.piggery_serial}
              onIonChange={(e) => setForm({ ...form, piggery_serial: e.detail.value?.toUpperCase() || '' })} />
            <IonInput label="NAME" labelPlacement="floating" placeholder="MAIN PIGGERY"
              value={form.piggery_name}
              onIonChange={(e) => setForm({ ...form, piggery_name: e.detail.value?.toUpperCase() || '' })} />
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
          title="UPDATE PIGGERY?"
          message={`Update "${selectedPiggery?.piggery_name}"?`}
        />

        <DeleteAlert
          isOpen={showDeleteAlert}
          onClose={() => setShowDeleteAlert(false)}
          onConfirm={handleDelete}
          title="DELETE PIGGERY?"
          message={`Delete "${selectedPiggery?.piggery_name}"? ${deviceCounts[selectedPiggery?.id] || 0} devices will be removed.`}
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