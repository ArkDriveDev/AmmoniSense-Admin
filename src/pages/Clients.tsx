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
  IonButtons,
  IonBadge,
  IonChip,
  IonIcon,
  IonToast,
  IonSegment,
  IonSegmentButton,
  IonSearchbar
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { 
  checkmarkCircleOutline, 
  closeCircleOutline, 
  businessOutline,
  trashOutline,
  createOutline
} from 'ionicons/icons';

import DeleteAlert from '../components/DeleteAlert';
import ConfirmAlert from '../components/ConfirmAlert';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import AssignPiggeryModal from '../components/AssignPiggeryModal';
import { useClients } from '../hooks/useClients';

export default function Clients() {
  const { clients, loading, fetchClients } = useClients();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [segment, setSegment] = useState('all');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    organization_name: ''
  });

  useEffect(() => {
    fetchClients();
  }, [segment]);

  const filteredClients = clients.filter(c => {
    if (segment === 'pending') return !c.profile_id;
    if (segment === 'approved') return !!c.profile_id;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.organization_name?.toLowerCase().includes(term)
    );
  }).sort((a, b) => {
    let aVal = a[sortBy] || '';
    let bVal = b[sortBy] || '';
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleEdit = async () => {
    const { error } = await supabase
      .from('clients')
      .update({
        full_name: form.full_name,
        phone: form.phone || null,
        organization_name: form.organization_name || null
      })
      .eq('id', selectedClient.id);

    if (error) {
      setToastMessage('Error: ' + error.message);
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    setToastMessage('Client updated');
    setToastColor('success');
    setShowToast(true);
    setShowUpdateConfirm(false);
    setShowEditModal(false);
    setSelectedClient(null);
    fetchClients();
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('clients').delete().eq('id', selectedClient.id);

    if (error) {
      setToastMessage('Error: ' + error.message);
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    setToastMessage('Client deleted');
    setToastColor('success');
    setShowToast(true);
    setShowDeleteAlert(false);
    setSelectedClient(null);
    fetchClients();
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
          <IonTitle>CLIENTS</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            placeholder="SEARCH CLIENTS..."
            value={searchTerm}
            onIonChange={(e) => setSearchTerm(e.detail.value || '')}
            animated
          />
        </IonToolbar>
        <IonToolbar>
          <div style={{ display: 'flex', gap: '8px', padding: '0 16px 8px 16px', flexWrap: 'wrap' }}>
            <IonSegment 
              value={segment} 
              onIonChange={(e) => setSegment(e.detail.value as string)}
              style={{ flex: 1, minWidth: '200px' }}
            >
              <IonSegmentButton value="all">ALL</IonSegmentButton>
              <IonSegmentButton value="approved">APPROVED</IonSegmentButton>
              <IonSegmentButton value="pending">PENDING</IonSegmentButton>
            </IonSegment>
            <IonButton size="small" fill={sortBy === 'full_name' ? 'solid' : 'outline'} onClick={() => handleSort('full_name')}>
              NAME {sortBy === 'full_name' && (sortOrder === 'asc' ? '▲' : '▼')}
            </IonButton>
            <IonButton size="small" fill={sortBy === 'created_at' ? 'solid' : 'outline'} onClick={() => handleSort('created_at')}>
              DATE {sortBy === 'created_at' && (sortOrder === 'asc' ? '▲' : '▼')}
            </IonButton>
            <IonButton size="small" color="medium" fill="outline" onClick={() => {
              setSearchTerm('');
              setSortBy('created_at');
              setSortOrder('desc');
            }}>
              RESET
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {loading ? (
          <LoadingSpinner />
        ) : filteredClients.length === 0 ? (
          <EmptyState
            title="NO CLIENTS FOUND"
            message={searchTerm ? 'TRY A DIFFERENT SEARCH' : 'CLIENTS WILL APPEAR HERE AFTER REGISTRATION'}
          />
        ) : (
          <IonList>
            {filteredClients.map((c) => (
              <IonItem key={c.id}>
                <IonLabel>
                  <h2>{c.full_name}</h2>
                  <p>EMAIL: {c.email}</p>
                  {c.phone && <p>PHONE: {c.phone}</p>}
                  {c.organization_name && <p>ORG: {c.organization_name}</p>}
                </IonLabel>
                <div style={{ textAlign: 'right' }}>
                  {c.profile_id ? (
                    <IonChip color="success"><IonIcon icon={checkmarkCircleOutline} /> APPROVED</IonChip>
                  ) : (
                    <IonChip color="warning"><IonIcon icon={closeCircleOutline} /> PENDING</IonChip>
                  )}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'flex-end' }}>
                    {c.profile_id && (
                      <IonButton size="small" fill="outline" onClick={() => {
                        setSelectedClient(c);
                        setShowAssignModal(true);
                      }}>
                        <IonIcon icon={businessOutline} /> ASSIGN
                      </IonButton>
                    )}
                    <IonButton size="small" fill="clear" color="primary" onClick={() => {
                      setSelectedClient(c);
                      setForm({
                        full_name: c.full_name || '',
                        email: c.email || '',
                        phone: c.phone || '',
                        organization_name: c.organization_name || ''
                      });
                      setShowEditModal(true);
                    }}>
                      <IonIcon icon={createOutline} />
                    </IonButton>
                    <IonButton size="small" fill="clear" color="danger" onClick={() => {
                      setSelectedClient(c);
                      setShowDeleteAlert(true);
                    }}>
                      <IonIcon icon={trashOutline} />
                    </IonButton>
                  </div>
                </div>
              </IonItem>
            ))}
          </IonList>
        )}

        {/* Edit Modal */}
        <IonModal isOpen={showEditModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>EDIT CLIENT</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowEditModal(false)}>CLOSE</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonInput placeholder="FULL NAME *" value={form.full_name}
              onIonChange={(e) => setForm({ ...form, full_name: e.detail.value?.toUpperCase() || '' })} />
            <IonInput placeholder="PHONE" type="tel" value={form.phone}
              onIonChange={(e) => setForm({ ...form, phone: e.detail.value || '' })} />
            <IonInput placeholder="ORGANIZATION" value={form.organization_name}
              onIonChange={(e) => setForm({ ...form, organization_name: e.detail.value?.toUpperCase() || '' })} />
            <IonButton expand="block" onClick={() => setShowUpdateConfirm(true)}>UPDATE</IonButton>
          </IonContent>
        </IonModal>

        <ConfirmAlert
          isOpen={showUpdateConfirm}
          onClose={() => setShowUpdateConfirm(false)}
          onConfirm={handleEdit}
          title="UPDATE CLIENT?"
          message={`Update "${selectedClient?.full_name}"?`}
        />

        <DeleteAlert
          isOpen={showDeleteAlert}
          onClose={() => setShowDeleteAlert(false)}
          onConfirm={handleDelete}
          title="DELETE CLIENT?"
          message={`Delete "${selectedClient?.full_name}"? This will also delete all their piggeries and devices.`}
          requireTypeConfirm={true}
          typeConfirmText="DELETE"
        />

        {selectedClient && (
          <AssignPiggeryModal
            isOpen={showAssignModal}
            onClose={() => {
              setShowAssignModal(false);
              setSelectedClient(null);
            }}
            clientId={selectedClient.id}
            clientName={selectedClient.full_name}
          />
        )}

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