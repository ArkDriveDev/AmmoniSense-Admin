import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonCheckbox,
  IonSpinner,
  IonToast,
  IonIcon,
  IonChip
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons';

interface AssignLivestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
  clientName: string;
}

export default function AssignLivestockModal({
  isOpen,
  onClose,
  clientId,
  clientName
}: AssignLivestockModalProps) {
  const [livestock, setLivestock] = useState<any[]>([]);
  const [assignedLivestock, setAssignedLivestock] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: allSites, error: sitesError } = await supabase
        .from('monitoring_sites')
        .select('id, site_name, site_code, address, owner_id')
        .order('created_at', { ascending: false });

      if (sitesError) {
        console.error('Error fetching sites:', sitesError);
        setToastMessage('Failed to fetch monitoring sites');
        setToastColor('danger');
        setShowToast(true);
        setLoading(false);
        return;
      }

      setLivestock(allSites?.map(s => ({
        id: s.id,
        livestock_name: s.site_name,
        livestock_serial: s.site_code,
        location: s.address,
        client_id: s.owner_id
      })) || []);

      const { data: assigned } = await supabase
        .from('monitoring_sites')
        .select('id')
        .eq('owner_id', clientId);

      setAssignedLivestock(assigned?.map(p => p.id) || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      setToastMessage('An unexpected error occurred');
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleLivestock = (id: number) => {
    setAssignedLivestock(prev => 
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const saveAssignment = async () => {
    setSaving(true);
    try {
      const { data: current } = await supabase
        .from('monitoring_sites')
        .select('id')
        .eq('owner_id', clientId);

      const currentIds = current?.map(p => p.id) || [];

      const toRemove = currentIds.filter(id => !assignedLivestock.includes(id));
      const toAdd = assignedLivestock.filter(id => !currentIds.includes(id));

      for (const id of toRemove) {
        await supabase
          .from('monitoring_sites')
          .update({ owner_id: null })
          .eq('id', id);
      }

      for (const id of toAdd) {
        await supabase
          .from('monitoring_sites')
          .update({ owner_id: clientId })
          .eq('id', id);
      }

      setToastMessage('Sites assigned successfully');
      setToastColor('success');
      setShowToast(true);
      
      setTimeout(() => {
        onClose();
      }, 1200);

    } catch (err) {
      console.error('Error saving assignments:', err);
      setToastMessage('Failed to save assignments');
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  const assignedCount = assignedLivestock.length;

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontWeight: 'bold' }}>ASSIGN MONITORING SITES</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>CLOSE</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ color: '#1a365d', fontWeight: 'bold' }}>ASSIGN SITES TO: {clientName.toUpperCase()}</h3>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            SELECT ALL MONITORING SITES OPERATED BY THIS SITE OWNER.
          </p>
          <p style={{ fontSize: '13px', color: '#2d7d46', fontWeight: 600 }}>
            {assignedCount} SITES SELECTED
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <IonSpinner />
            <p>LOADING MONITORING SITES...</p>
          </div>
        ) : livestock.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <p>NO MONITORING SITES AVAILABLE</p>
            <IonButton fill="outline" onClick={onClose} style={{ marginTop: '16px' }}>
              CLOSE
            </IonButton>
          </div>
        ) : (
          <IonList>
            {livestock.map((l) => {
              const isAssigned = assignedLivestock.includes(l.id);
              const isAlreadyAssigned = l.client_id && l.client_id !== clientId;
              
              return (
                <IonItem key={l.id} disabled={isAlreadyAssigned}>
                  <IonLabel>
                    <h2>{l.livestock_name}</h2>
                    <p>CODE: {l.livestock_serial}</p>
                    {l.location && <p>LOCATION: {l.location}</p>}
                    {isAlreadyAssigned && (
                      <IonChip color="warning">
                        <IonIcon icon={closeCircleOutline} />
                        <IonLabel>ASSIGNED TO OTHER OWNER</IonLabel>
                      </IonChip>
                    )}
                    {isAssigned && (
                      <IonChip color="success">
                        <IonIcon icon={checkmarkCircleOutline} />
                        <IonLabel>SELECTED</IonLabel>
                      </IonChip>
                    )}
                  </IonLabel>
                  {!isAlreadyAssigned && (
                    <IonCheckbox
                      checked={isAssigned}
                      onIonChange={() => toggleLivestock(l.id)}
                    />
                  )}
                </IonItem>
              );
            })}
          </IonList>
        )}

        <IonButton
          expand="block"
          onClick={saveAssignment}
          disabled={saving || livestock.length === 0 || loading}
          style={{ marginTop: '16px', '--background': '#1a365d' }}
        >
          {saving ? 'SAVING...' : `SAVE SITE ASSIGNMENTS (${assignedCount})`}
        </IonButton>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          color={toastColor}
          position="bottom"
        />
      </IonContent>
    </IonModal>
  );
}