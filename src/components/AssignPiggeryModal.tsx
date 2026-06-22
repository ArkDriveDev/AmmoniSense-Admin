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

interface AssignPiggeryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
  clientName: string;
}

export default function AssignPiggeryModal({
  isOpen,
  onClose,
  clientId,
  clientName
}: AssignPiggeryModalProps) {
  const [piggeries, setPiggeries] = useState<any[]>([]);
  const [assignedPiggeries, setAssignedPiggeries] = useState<number[]>([]);
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
      // Fetch all piggeries
      const { data: allPiggeries, error: piggeryError } = await supabase
        .from('piggeries')
        .select('id, piggery_name, piggery_serial, location, client_id')
        .order('created_at', { ascending: false });

      if (piggeryError) {
        console.error('Error fetching piggeries:', piggeryError);
        setToastMessage('Failed to fetch piggeries');
        setToastColor('danger');
        setShowToast(true);
        setLoading(false);
        return;
      }

      setPiggeries(allPiggeries || []);

      // Fetch piggeries already assigned to this client
      const { data: assigned, error: assignedError } = await supabase
        .from('piggeries')
        .select('id')
        .eq('client_id', clientId);

      if (assignedError) {
        console.error('Error fetching assigned piggeries:', assignedError);
        setToastMessage('Failed to fetch assigned piggeries');
        setToastColor('danger');
        setShowToast(true);
        setLoading(false);
        return;
      }

      setAssignedPiggeries(assigned?.map(p => p.id) || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      setToastMessage('An unexpected error occurred');
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const togglePiggery = (piggeryId: number) => {
    setAssignedPiggeries(prev => 
      prev.includes(piggeryId)
        ? prev.filter(id => id !== piggeryId)
        : [...prev, piggeryId]
    );
  };

  const saveAssignment = async () => {
    setSaving(true);
    try {
      // Get current assignments
      const { data: current } = await supabase
        .from('piggeries')
        .select('id')
        .eq('client_id', clientId);

      const currentIds = current?.map(p => p.id) || [];

      // Find piggeries to remove (in current but not selected)
      const toRemove = currentIds.filter(id => !assignedPiggeries.includes(id));

      // Find piggeries to add (in selected but not current)
      const toAdd = assignedPiggeries.filter(id => !currentIds.includes(id));

      // Remove assignments
      for (const id of toRemove) {
        await supabase
          .from('piggeries')
          .update({ client_id: null })
          .eq('id', id);
      }

      // Add assignments
      for (const id of toAdd) {
        await supabase
          .from('piggeries')
          .update({ client_id: clientId })
          .eq('id', id);
      }

      setToastMessage('Piggeries assigned successfully!');
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

  // Count how many piggeries are assigned
  const assignedCount = assignedPiggeries.length;

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Assign Piggeries</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div style={{ marginBottom: '16px' }}>
          <h3>Assign piggeries to: {clientName}</h3>
          <p style={{ fontSize: '14px', color: 'gray' }}>
            Select all piggeries that this client should have access to.
          </p>
          <p style={{ fontSize: '14px', color: 'var(--ion-color-primary)' }}>
            {assignedCount} piggeries selected
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <IonSpinner />
            <p>Loading piggeries...</p>
          </div>
        ) : piggeries.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <p>No piggeries available.</p>
            <p style={{ fontSize: '14px', color: 'gray' }}>
              Create a piggery first in the Piggeries tab.
            </p>
            <IonButton 
              fill="outline" 
              onClick={onClose}
              style={{ marginTop: '16px' }}
            >
              Close
            </IonButton>
          </div>
        ) : (
          <IonList>
            {piggeries.map((p) => {
              const isAssigned = assignedPiggeries.includes(p.id);
              const isAlreadyAssigned = p.client_id && p.client_id !== clientId;
              
              return (
                <IonItem key={p.id} disabled={isAlreadyAssigned}>
                  <IonLabel>
                    <h2>{p.piggery_name}</h2>
                    <p>Serial: {p.piggery_serial}</p>
                    {p.location && <p>Location: {p.location}</p>}
                    {p.client_id && p.client_id !== clientId && (
                      <IonChip color="warning">
                        <IonIcon icon={closeCircleOutline} />
                        <IonLabel>Assigned to another client</IonLabel>
                      </IonChip>
                    )}
                    {isAssigned && (
                      <IonChip color="success">
                        <IonIcon icon={checkmarkCircleOutline} />
                        <IonLabel>Selected</IonLabel>
                      </IonChip>
                    )}
                  </IonLabel>
                  {!isAlreadyAssigned && (
                    <IonCheckbox
                      checked={isAssigned}
                      onIonChange={() => togglePiggery(p.id)}
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
          disabled={saving || piggeries.length === 0 || loading}
          style={{ marginTop: '16px' }}
        >
          {saving ? (
            <>
              <IonSpinner name="crescent" />
              &nbsp;Saving...
            </>
          ) : (
            `Save Assignments (${assignedCount})`
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