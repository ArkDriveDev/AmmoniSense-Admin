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
      const { data: allLivestock, error: livestockError } = await supabase
        .from('livestock')
        .select('id, livestock_name, livestock_serial, location, client_id')
        .order('created_at', { ascending: false });

      if (livestockError) {
        console.error('Error fetching livestock:', livestockError);
        setToastMessage('Failed to fetch livestock');
        setToastColor('danger');
        setShowToast(true);
        setLoading(false);
        return;
      }

      setLivestock(allLivestock || []);

      const { data: assigned, error: assignedError } = await supabase
        .from('livestock')
        .select('id')
        .eq('client_id', clientId);

      if (assignedError) {
        console.error('Error fetching assigned livestock:', assignedError);
        setToastMessage('Failed to fetch assigned livestock');
        setToastColor('danger');
        setShowToast(true);
        setLoading(false);
        return;
      }

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
        .from('livestock')
        .select('id')
        .eq('client_id', clientId);

      const currentIds = current?.map(p => p.id) || [];

      const toRemove = currentIds.filter(id => !assignedLivestock.includes(id));
      const toAdd = assignedLivestock.filter(id => !currentIds.includes(id));

      for (const id of toRemove) {
        await supabase
          .from('livestock')
          .update({ client_id: null })
          .eq('id', id);
      }

      for (const id of toAdd) {
        await supabase
          .from('livestock')
          .update({ client_id: clientId })
          .eq('id', id);
      }

      setToastMessage('Livestock assigned successfully');
      setToastColor('success');
      setShowToast(true);
      
      setTimeout(() => {
        onClose();
      }, 1500);

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
        <IonToolbar>
          <IonTitle>ASSIGN LIVESTOCK</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>CLOSE</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div style={{ marginBottom: '16px' }}>
          <h3>ASSIGN LIVESTOCK TO: {clientName.toUpperCase()}</h3>
          <p style={{ fontSize: '14px', color: 'gray' }}>
            SELECT ALL LIVESTOCK THAT THIS CLIENT SHOULD HAVE ACCESS TO.
          </p>
          <p style={{ fontSize: '14px', color: 'var(--ion-color-primary)' }}>
            {assignedCount} LIVESTOCK SELECTED
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <IonSpinner />
            <p>LOADING LIVESTOCK...</p>
          </div>
        ) : livestock.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <p>NO LIVESTOCK AVAILABLE</p>
            <p style={{ fontSize: '14px', color: 'gray' }}>
              CREATE LIVESTOCK FIRST IN THE LIVESTOCK TAB.
            </p>
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
                    <p>SERIAL: {l.livestock_serial}</p>
                    {l.location && <p>LOCATION: {l.location}</p>}
                    {l.client_id && l.client_id !== clientId && (
                      <IonChip color="warning">
                        <IonIcon icon={closeCircleOutline} />
                        <IonLabel>ASSIGNED TO ANOTHER CLIENT</IonLabel>
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
          style={{ marginTop: '16px' }}
        >
          {saving ? (
            <>
              <IonSpinner name="crescent" />
              &nbsp;SAVING...
            </>
          ) : (
            `SAVE ASSIGNMENTS (${assignedCount})`
          )}
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