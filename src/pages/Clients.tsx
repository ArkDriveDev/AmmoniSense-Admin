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
  IonIcon,
  IonToast,
  IonSearchbar,
  IonBadge
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { 
  businessOutline,
  trashOutline,
  createOutline,
  addOutline,
  personOutline
} from 'ionicons/icons';

import DeleteAlert from '../components/DeleteAlert';
import ConfirmAlert from '../components/ConfirmAlert';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import AssignLivestockModal from '../components/AssignLivestockModal';
import { useClients } from '../hooks/useClients';

export default function Clients() {
  const { clients, loading, fetchClients } = useClients();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
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
  }, []);

  const filteredClients = clients.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(term) ||
      c.owner_name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term) ||
      c.contact_number?.toLowerCase().includes(term) ||
      c.organization_name?.toLowerCase().includes(term) ||
      c.address?.toLowerCase().includes(term)
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

  const handleCreate = async () => {
    if (!form.full_name) {
      setToastMessage('Please enter Owner Name');
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    // Try site_owners insert first
    const { error: ownersErr } = await supabase.from('site_owners').insert([{
      owner_name: form.full_name,
      contact_number: form.phone || null,
      email: form.email || null,
      address: form.organization_name || null
    }]);

    if (ownersErr) {
      // Fallback clients insert
      const { error: clientsErr } = await supabase.from('clients').insert([{
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone || null,
        organization_name: form.organization_name || null
      }]);

      if (clientsErr) {
        setToastMessage('Error: ' + clientsErr.message);
        setToastColor('danger');
        setShowToast(true);
        return;
      }
    }

    setToastMessage('Site Owner created successfully');
    setToastColor('success');
    setShowToast(true);
    setShowAddModal(false);
    setForm({ full_name: '', email: '', phone: '', organization_name: '' });
    fetchClients();
  };

  const handleEdit = async () => {
    const { error: ownersErr } = await supabase
      .from('site_owners')
      .update({
        owner_name: form.full_name,
        contact_number: form.phone || null,
        email: form.email || null,
        address: form.organization_name || null
      })
      .eq('id', selectedClient.id);

    if (ownersErr) {
      await supabase
        .from('clients')
        .update({
          full_name: form.full_name,
          phone: form.phone || null,
          organization_name: form.organization_name || null
        })
        .eq('id', selectedClient.id);
    }

    setToastMessage('Owner details updated');
    setToastColor('success');
    setShowToast(true);
    setShowUpdateConfirm(false);
    setShowEditModal(false);
    setSelectedClient(null);
    fetchClients();
  };

  const handleDelete = async () => {
    const { error: ownersErr } = await supabase.from('site_owners').delete().eq('id', selectedClient.id);
    if (ownersErr) {
      await supabase.from('clients').delete().eq('id', selectedClient.id);
    }

    setToastMessage('Owner record deleted');
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
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontWeight: 'bold' }}>SITE OWNERS & CLIENTS</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowAddModal(true)}>
              <IonIcon icon={addOutline} /> ADD OWNER
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar style={{ '--background': '#f8fafc' }}>
          <IonSearchbar
            placeholder="SEARCH SITE OWNERS..."
            value={searchTerm}
            onIonChange={(e) => setSearchTerm(e.detail.value || '')}
            animated
          />
        </IonToolbar>
        <IonToolbar style={{ '--background': '#ffffff' }}>
          <div style={{ display: 'flex', gap: '8px', padding: '0 16px 8px 16px', flexWrap: 'wrap' }}>
            <IonButton size="small" fill={sortBy === 'full_name' ? 'solid' : 'outline'} onClick={() => handleSort('full_name')}>
              NAME {sortBy === 'full_name' && (sortOrder === 'asc' ? '▲' : '▼')}
            </IonButton>
            <IonButton size="small" fill={sortBy === 'created_at' ? 'solid' : 'outline'} onClick={() => handleSort('created_at')}>
              DATE {sortBy === 'created_at' && (sortOrder === 'asc' ? '▲' : '▼')}
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f1f5f9' }}>
        {loading ? (
          <LoadingSpinner />
        ) : filteredClients.length === 0 ? (
          <EmptyState
            title="NO SITE OWNERS FOUND"
            message={searchTerm ? 'TRY A DIFFERENT SEARCH' : 'CLICK ADD OWNER TO REGISTER A NEW SITE OWNER'}
          />
        ) : (
          <IonList style={{ background: 'transparent' }}>
            {filteredClients.map((c) => {
              const name = c.owner_name || c.full_name;
              const email = c.email || 'No Email';
              const phone = c.contact_number || c.phone || 'No Contact';
              const address = c.address || c.organization_name || 'No Address';

              return (
                <IonItem key={c.id} style={{ '--background': '#ffffff', borderRadius: '10px', marginBottom: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                  <IonLabel>
                    <h2 style={{ color: '#1a365d', fontWeight: 'bold' }}>
                      <IonIcon icon={personOutline} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                      {name}
                    </h2>
                    <p style={{ color: '#475569' }}>EMAIL: {email}</p>
                    <p style={{ color: '#64748b' }}>PHONE: {phone}</p>
                    {address && <p style={{ color: '#64748b' }}>ADDRESS: {address}</p>}
                  </IonLabel>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <IonBadge color="primary">SITE OWNER</IonBadge>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'flex-end' }}>
                      <IonButton size="small" fill="outline" color="secondary" onClick={() => {
                        setSelectedClient(c);
                        setShowAssignModal(true);
                      }}>
                        <IonIcon icon={businessOutline} slot="start" /> Assign Sites
                      </IonButton>
                      <IonButton size="small" fill="clear" color="primary" onClick={() => {
                        setSelectedClient(c);
                        setForm({
                          full_name: name || '',
                          email: c.email || '',
                          phone: phone || '',
                          organization_name: address || ''
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
              );
            })}
          </IonList>
        )}

        {/* Add Owner Modal */}
        <IonModal isOpen={showAddModal}>
          <IonHeader>
            <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
              <IonTitle>REGISTER SITE OWNER</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowAddModal(false)}>CLOSE</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonInput label="OWNER FULL NAME *" labelPlacement="floating" placeholder="JOHN DOE"
              value={form.full_name}
              onIonChange={(e) => setForm({ ...form, full_name: e.detail.value?.toUpperCase() || '' })} style={{ marginBottom: '12px' }} />
            <IonInput label="EMAIL ADDRESS" labelPlacement="floating" type="email" placeholder="owner@example.com"
              value={form.email}
              onIonChange={(e) => setForm({ ...form, email: e.detail.value || '' })} style={{ marginBottom: '12px' }} />
            <IonInput label="CONTACT NUMBER" labelPlacement="floating" type="tel" placeholder="09123456789"
              value={form.phone}
              onIonChange={(e) => setForm({ ...form, phone: e.detail.value || '' })} style={{ marginBottom: '12px' }} />
            <IonInput label="ADDRESS / LOCATION" labelPlacement="floating" placeholder="LAGUNA, PHILIPPINES"
              value={form.organization_name}
              onIonChange={(e) => setForm({ ...form, organization_name: e.detail.value?.toUpperCase() || '' })} style={{ marginBottom: '16px' }} />
            <IonButton expand="block" onClick={handleCreate} style={{ '--background': '#1a365d' }}>CREATE OWNER RECORD</IonButton>
          </IonContent>
        </IonModal>

        {/* Edit Modal */}
        <IonModal isOpen={showEditModal}>
          <IonHeader>
            <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
              <IonTitle>EDIT SITE OWNER</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowEditModal(false)}>CLOSE</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonInput label="OWNER FULL NAME *" labelPlacement="floating" value={form.full_name}
              onIonChange={(e) => setForm({ ...form, full_name: e.detail.value?.toUpperCase() || '' })} style={{ marginBottom: '12px' }} />
            <IonInput label="CONTACT NUMBER" labelPlacement="floating" type="tel" value={form.phone}
              onIonChange={(e) => setForm({ ...form, phone: e.detail.value || '' })} style={{ marginBottom: '12px' }} />
            <IonInput label="ADDRESS" labelPlacement="floating" value={form.organization_name}
              onIonChange={(e) => setForm({ ...form, organization_name: e.detail.value?.toUpperCase() || '' })} style={{ marginBottom: '16px' }} />
            <IonButton expand="block" onClick={() => setShowUpdateConfirm(true)} style={{ '--background': '#1a365d' }}>UPDATE OWNER</IonButton>
          </IonContent>
        </IonModal>

        <ConfirmAlert
          isOpen={showUpdateConfirm}
          onClose={() => setShowUpdateConfirm(false)}
          onConfirm={handleEdit}
          title="UPDATE SITE OWNER?"
          message={`Update "${selectedClient?.owner_name || selectedClient?.full_name}"?`}
        />

        <DeleteAlert
          isOpen={showDeleteAlert}
          onClose={() => setShowDeleteAlert(false)}
          onConfirm={handleDelete}
          title="DELETE SITE OWNER?"
          message={`Delete "${selectedClient?.owner_name || selectedClient?.full_name}"?`}
          requireTypeConfirm={true}
          typeConfirmText="DELETE"
        />

        {selectedClient && (
          <AssignLivestockModal
            isOpen={showAssignModal}
            onClose={() => {
              setShowAssignModal(false);
              setSelectedClient(null);
            }}
            clientId={selectedClient.id}
            clientName={selectedClient.owner_name || selectedClient.full_name}
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