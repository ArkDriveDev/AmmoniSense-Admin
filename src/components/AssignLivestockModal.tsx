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