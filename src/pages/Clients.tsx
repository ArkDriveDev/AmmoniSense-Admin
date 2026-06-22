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
  IonSpinner,
  IonBadge,
  IonChip,
  IonIcon,
  IonToast,
  IonSegment,
  IonSegmentButton
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { 
  checkmarkCircleOutline, 
  closeCircleOutline, 
  personAddOutline,
  businessOutline 
} from 'ionicons/icons';
import AssignPiggeryModal from '../components/AssignPiggeryModal';


export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [segment, setSegment] = useState('all');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    organization_name: '',
    password: ''
  });

  useEffect(() => {
    fetchClients();
  }, [segment]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('clients')
        .select(`
          *,
          profiles (
            id,
            full_name,
            role
          )
        `);

      if (segment === 'pending') {
        query = query.is('profile_id', null);
      } else if (segment === 'approved') {
        query = query.not('profile_id', 'is', null);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching clients:', error);
        setToastMessage('Failed to fetch clients: ' + error.message);
        setToastColor('danger');
        setShowToast(true);
        return;
      }

      setClients(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createClient = async () => {
    try {
      const { data: existingUser } = await supabase
        .from('clients')
        .select('id')
        .eq('email', form.email)
        .single();

      if (existingUser) {
        setToastMessage('A client with this email already exists');
        setToastColor('danger');
        setShowToast(true);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.full_name,
            role: 'client'
          }
        }
      });

      if (authError) {
        setToastMessage('Auth error: ' + authError.message);
        setToastColor('danger');
        setShowToast(true);
        return;
      }

      const user = authData.user ?? authData.session?.user;

      if (!user) {
        setToastMessage('Failed to create user');
        setToastColor('danger');
        setShowToast(true);
        return;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          full_name: form.full_name,
          role: 'client'
        }]);

      if (profileError) {
        setToastMessage('Profile error: ' + profileError.message);
        setToastColor('danger');
        setShowToast(true);
        return;
      }

      const { error: clientError } = await supabase
        .from('clients')
        .insert([{
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || null,
          organization_name: form.organization_name || null,
          profile_id: user.id
        }]);

      if (clientError) {
        setToastMessage('Client error: ' + clientError.message);
        setToastColor('danger');
        setShowToast(true);
        return;
      }

      setToastMessage('Client created successfully');
      setToastColor('success');
      setShowToast(true);
      setShowModal(false);
      setForm({ full_name: '', email: '', phone: '', organization_name: '', password: '' });
      fetchClients();

    } catch (err) {
      console.error('Unexpected error:', err);
      setToastMessage('An unexpected error occurred');
      setToastColor('danger');
      setShowToast(true);
    }
  };

  const openAssignModal = (client: any) => {
    setSelectedClient(client);
    setShowAssignModal(true);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Clients</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowModal(true)}>
              <IonIcon icon={personAddOutline} />
              &nbsp;Add
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonSegment 
          value={segment} 
          onIonChange={(e) => setSegment(e.detail.value as string)}
          style={{ marginBottom: '16px' }}
        >
          <IonSegmentButton value="all">All</IonSegmentButton>
          <IonSegmentButton value="approved">Approved</IonSegmentButton>
          <IonSegmentButton value="pending">Pending</IonSegmentButton>
        </IonSegment>

        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <IonSpinner />
            <p>Loading clients...</p>
          </div>
        ) : (
          <IonList>
            {clients.map((c) => (
              <IonItem key={c.id}>
                <IonLabel>
                  <h2>{c.full_name}</h2>
                  <p>Email: {c.email}</p>
                  {c.phone && <p>Phone: {c.phone}</p>}
                  {c.organization_name && <p>Organization: {c.organization_name}</p>}
                  <p style={{ fontSize: '12px', color: 'gray' }}>
                    Registered: {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </IonLabel>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  {c.profile_id ? (
                    <IonChip color="success">
                      <IonIcon icon={checkmarkCircleOutline} />
                      <IonLabel>Approved</IonLabel>
                    </IonChip>
                  ) : (
                    <IonChip color="warning">
                      <IonIcon icon={closeCircleOutline} />
                      <IonLabel>Pending</IonLabel>
                    </IonChip>
                  )}
                  {c.profile_id && (
                    <IonButton 
                      size="small" 
                      fill="outline"
                      onClick={() => openAssignModal(c)}
                    >
                      <IonIcon icon={businessOutline} />
                      &nbsp;Assign Piggery
                    </IonButton>
                  )}
                </div>
              </IonItem>
            ))}
          </IonList>
        )}

        <IonModal isOpen={showModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Create Client</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            <IonInput
              placeholder="Full Name *"
              onIonChange={(e) => setForm({ ...form, full_name: e.detail.value! })}
            />
            <IonInput
              placeholder="Email *"
              type="email"
              onIonChange={(e) => setForm({ ...form, email: e.detail.value! })}
            />
            <IonInput
              placeholder="Phone"
              type="tel"
              onIonChange={(e) => setForm({ ...form, phone: e.detail.value! })}
            />
            <IonInput
              placeholder="Organization Name"
              onIonChange={(e) => setForm({ ...form, organization_name: e.detail.value! })}
            />
            <IonInput
              type="password"
              placeholder="Password *"
              onIonChange={(e) => setForm({ ...form, password: e.detail.value! })}
            />
            <IonButton expand="block" onClick={createClient}>
              Create Client
            </IonButton>
          </IonContent>
        </IonModal>

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