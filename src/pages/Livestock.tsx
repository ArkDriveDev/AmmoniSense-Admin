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
  IonSearchbar
} from '@ionic/react';

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  businessOutline, 
  personOutline, 
  addOutline,
  trashOutline,
  createOutline,
  locationOutline
} from 'ionicons/icons';

import DeleteAlert from '../components/DeleteAlert';
import ConfirmAlert from '../components/ConfirmAlert';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useLivestock } from '../hooks/useLivestock';
import MapViewerModal from '../components/map/MapViewerModal';

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

  // Map modal state
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapTarget, setMapTarget] = useState<any>(null);

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
    try {
      const { data } = await supabase
        .from('site_owners')
        .select('id, owner_name, email')
        .order('owner_name');
      
      if (data) {
        setClients(data.map(o => ({
          id: o.id,
          full_name: o.owner_name,
          organization_name: o.email
        })));
      }
    } catch (err) {
      console.error('Error fetching site owners:', err);
    }
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
    if (!form.livestock_serial || !form.livestock_name) {
      setToastMessage('Please fill in Serial and Site Name');
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    const { error } = await supabase.from('monitoring_sites').insert([{
      site_code: form.livestock_serial,
      site_name: form.livestock_name,
      address: form.location || null,
      owner_id: form.client_id ? parseInt(form.client_id) : undefined
    }]);

    if (error) {
      setToastMessage('Error: ' + error.message);
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    setToastMessage('Monitoring Site created');
    setToastColor('success');
    setShowToast(true);
    setShowModal(false);
    setForm({ livestock_serial: '', livestock_name: '', location: '', client_id: '' });
    fetchLivestock();
  };

  const handleUpdate = async () => {
    const { error } = await supabase
      .from('monitoring_sites')
      .update({
        site_code: form.livestock_serial,
        site_name: form.livestock_name,
        address: form.location || null
      })
      .eq('id', selectedLivestock.id);

    if (error) {
      setToastMessage('Error: ' + error.message);
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    setToastMessage('Site updated');
    setToastColor('success');
    setShowToast(true);
    setShowUpdateConfirm(false);
    setShowEditModal(false);
    setSelectedLivestock(null);
    fetchLivestock();
  };

  const handleDelete = async () => {
    const deviceCount = deviceCounts[selectedLivestock.id] || 0;
    const { error } = await supabase.from('monitoring_sites').delete().eq('id', selectedLivestock.id);

    if (error) {
      setToastMessage('Error: ' + error.message);
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    setToastMessage(`Deleted. ${deviceCount} devices unlinked.`);
    setToastColor('success');
    setShowToast(true);
    setShowDeleteAlert(false);
    setSelectedLivestock(null);
    fetchLivestock();
  };

  const openEditModal = (item: any) => {
    setSelectedLivestock(item);
    setForm({
      livestock_serial: item.livestock_serial || item.site_code || '',
      livestock_name: item.livestock_name || item.site_name || '',
      location: item.location || item.address || '',
      client_id: item.client_id?.toString() || item.owner_id?.toString() || ''
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
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontWeight: 'bold' }}>MONITORING SITES / LIVESTOCK</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowModal(true)}>
              <IonIcon icon={addOutline} /> ADD SITE
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar style={{ '--background': '#f8fafc' }}>
          <IonSearchbar
            placeholder="SEARCH MONITORING SITES..."
            value={searchTerm}
            onIonChange={(e) => setSearchTerm(e.detail.value || '')}
            animated
          />
        </IonToolbar>
        <IonToolbar style={{ '--background': '#ffffff' }}>
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
              CODE {sortBy === 'livestock_serial' && (sortOrder === 'asc' ? '▲' : '▼')}
            </IonButton>
            <IonButton 
              size="small" 
              fill={sortBy === 'client_name' ? 'solid' : 'outline'}
              onClick={() => handleSort('client_name')}
            >
              OWNER {sortBy === 'client_name' && (sortOrder === 'asc' ? '▲' : '▼')}
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f1f5f9' }}>
        {loading ? (
          <LoadingSpinner />
        ) : filteredLivestock.length === 0 ? (
          <EmptyState
            title="NO MONITORING SITES FOUND"
            message={searchTerm ? 'TRY A DIFFERENT SEARCH' : 'CLICK ADD SITE TO REGISTER A NEW MONITORING SITE'}
          />
        ) : (
          <IonList style={{ background: 'transparent' }}>
            {filteredLivestock.map((l) => {
              const lat = l.current_latitude || l.latitude || 14.5995;
              const lng = l.current_longitude || l.longitude || 120.9842;
              const siteName = l.site_name || l.livestock_name || 'Monitoring Site';

              return (
                <IonItem key={l.id} style={{ '--background': '#ffffff', borderRadius: '10px', marginBottom: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                  <IonLabel>
                    <h2 style={{ color: '#1a365d', fontWeight: 'bold' }}>
                      <IonIcon icon={businessOutline} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                      {siteName}
                    </h2>
                    <p style={{ color: '#475569' }}>CODE: {l.site_code || l.livestock_serial || 'N/A'}</p>
                    <p style={{ color: '#64748b' }}>LOCATION: {l.address || l.location || 'MANILA, PHILIPPINES'}</p>
                    <p style={{ color: '#64748b' }}>
                      <IonIcon icon={personOutline} style={{ marginRight: '4px' }} /> OWNER: {l.clients?.full_name || l.site_owners?.owner_name || 'UNASSIGNED'}
                    </p>
                  </IonLabel>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <IonBadge color="primary">{deviceCounts[l.id] || 0} DEVICES</IonBadge>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'flex-end' }}>
                      <IonButton
                        size="small"
                        fill="outline"
                        color="secondary"
                        onClick={() => {
                          setMapTarget(l);
                          setShowMapModal(true);
                        }}
                      >
                        <IonIcon icon={locationOutline} slot="start" /> Map
                      </IonButton>
                      <IonButton size="small" fill="clear" color="primary" onClick={() => openEditModal(l)}>
                        <IonIcon icon={createOutline} />
                      </IonButton>
                      <IonButton size="small" fill="clear" color="danger" onClick={() => openDeleteAlert(l)}>
                        <IonIcon icon={trashOutline} />
                      </IonButton>
                    </div>
                  </div>
                </IonItem>
              );
            })}
          </IonList>
        )}

        <IonModal isOpen={showModal}>
          <IonHeader>
            <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
              <IonTitle>CREATE MONITORING SITE</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>CLOSE</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonInput label="SITE CODE" labelPlacement="floating" placeholder="SITE-001"
              value={form.livestock_serial}
              onIonChange={(e) => setForm({ ...form, livestock_serial: e.detail.value?.toUpperCase() || '' })} />
            <IonInput label="SITE NAME" labelPlacement="floating" placeholder="MAIN MONITORING SITE"
              value={form.livestock_name}
              onIonChange={(e) => setForm({ ...form, livestock_name: e.detail.value?.toUpperCase() || '' })} />
            <IonInput label="LOCATION / ADDRESS" labelPlacement="floating" placeholder="LAGUNA, PHILIPPINES"
              value={form.location}
              onIonChange={(e) => setForm({ ...form, location: e.detail.value?.toUpperCase() || '' })} />
            <IonSelect label="SITE OWNER" labelPlacement="floating" placeholder="SELECT OWNER"
              value={form.client_id}
              onIonChange={(e) => setForm({ ...form, client_id: e.detail.value })}>
              {clients.map((c) => (
                <IonSelectOption key={c.id} value={c.id}>{c.full_name}</IonSelectOption>
              ))}
            </IonSelect>
            <IonButton expand="block" onClick={handleCreate} style={{ marginTop: '16px', '--background': '#1a365d' }}>CREATE SITE</IonButton>
          </IonContent>
        </IonModal>

        <IonModal isOpen={showEditModal}>
          <IonHeader>
            <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
              <IonTitle>EDIT MONITORING SITE</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowEditModal(false)}>CLOSE</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonInput label="SITE CODE" labelPlacement="floating" placeholder="SITE-001"
              value={form.livestock_serial}
              onIonChange={(e) => setForm({ ...form, livestock_serial: e.detail.value?.toUpperCase() || '' })} />
            <IonInput label="SITE NAME" labelPlacement="floating" placeholder="MAIN MONITORING SITE"
              value={form.livestock_name}
              onIonChange={(e) => setForm({ ...form, livestock_name: e.detail.value?.toUpperCase() || '' })} />
            <IonInput label="LOCATION / ADDRESS" labelPlacement="floating" placeholder="LAGUNA, PHILIPPINES"
              value={form.location}
              onIonChange={(e) => setForm({ ...form, location: e.detail.value?.toUpperCase() || '' })} />
            <IonButton expand="block" onClick={() => setShowUpdateConfirm(true)} style={{ marginTop: '16px', '--background': '#1a365d' }}>UPDATE SITE</IonButton>
          </IonContent>
        </IonModal>

        {/* Map Modal for Monitoring Site Spatial Grid inspection */}
        {mapTarget && (
          <MapViewerModal
            isOpen={showMapModal}
            onDismiss={() => setShowMapModal(false)}
            title={`Site ${mapTarget.site_name || mapTarget.livestock_name} Map`}
            siteName={mapTarget.site_name || mapTarget.livestock_name}
            gridCellId={mapTarget.current_grid_cell_id}
            latitude={mapTarget.current_latitude || mapTarget.latitude || 14.5995}
            longitude={mapTarget.current_longitude || mapTarget.longitude || 120.9842}
          />
        )}

        <ConfirmAlert
          isOpen={showUpdateConfirm}
          onClose={() => setShowUpdateConfirm(false)}
          onConfirm={handleUpdate}
          title="UPDATE SITE?"
          message={`Update "${selectedLivestock?.site_name || selectedLivestock?.livestock_name}"?`}
        />

        <DeleteAlert
          isOpen={showDeleteAlert}
          onClose={() => setShowDeleteAlert(false)}
          onConfirm={handleDelete}
          title="DELETE SITE?"
          message={`Delete "${selectedLivestock?.site_name || selectedLivestock?.livestock_name}"?`}
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