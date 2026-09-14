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