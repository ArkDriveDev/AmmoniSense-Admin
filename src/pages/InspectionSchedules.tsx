import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonInput,
  IonModal,
  IonButtons,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonToast,
  IonSearchbar,
  IonBadge,
  IonTextarea,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent
} from '@ionic/react';

import { useState } from 'react';
import {
  calendarOutline,
  addOutline,
  refreshOutline,
  checkmarkCircleOutline,
  playOutline,
  closeCircleOutline,
  trashOutline,
  personOutline,
  businessOutline,
  pricetagOutline,
  imageOutline,
  warningOutline
} from 'ionicons/icons';

import DeleteAlert from '../components/DeleteAlert';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useInspectionSchedules } from '../hooks/useInspectionSchedules';
import { useInspectionSites } from '../hooks/useInspectionSites';
import { InspectionScheduleSummary, ScheduleStatus } from '../types/schema';
import useSyncFeedback from '../hooks/useSyncFeedback';

export default function InspectionSchedules() {
  const { schedules, loading, refresh, createSchedule, updateScheduleStatus, deleteSchedule } = useInspectionSchedules();
  const { sites } = useInspectionSites();
  const { syncToast, triggerSync, dismissSyncToast } = useSyncFeedback();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<InspectionScheduleSummary | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');

  const [form, setForm] = useState({
    inspection_site_id: '',
    schedule_name: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '09:00:00',
    notes: ''
  });

  const filteredSchedules = schedules.filter(s => {
    if (statusFilter !== 'all' && s.status?.toUpperCase() !== statusFilter.toUpperCase()) {
      return false;
    }
    if (siteFilter !== 'all' && s.inspection_site_id !== Number(siteFilter)) {
      return false;
    }
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.schedule_name?.toLowerCase().includes(term) ||
      s.site_name?.toLowerCase().includes(term) ||
      s.site_code?.toLowerCase().includes(term) ||
      s.created_by_name?.toLowerCase().includes(term)
    );
  });

  const handleCreate = async () => {
    if (!form.inspection_site_id || !form.schedule_name || !form.scheduled_date) {
      setToastMessage('Please fill in Site, Schedule Name, and Date');
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    try {
      await createSchedule({
        inspection_site_id: Number(form.inspection_site_id),
        schedule_name: form.schedule_name.trim(),
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time || undefined,
        notes: form.notes ? form.notes.trim() : undefined,
      });

      setToastMessage('Inspection schedule created successfully!');
      setToastColor('success');
      setShowToast(true);
      setShowModal(false);
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setToastMessage('Failed to create schedule: ' + message);
      setToastColor('danger');
      setShowToast(true);
    }
  };

  const handleStatusChange = async (scheduleId: number, status: ScheduleStatus) => {
    try {
      await updateScheduleStatus(scheduleId, status);
      if (status === 'CANCELLED') {
        setToastMessage('Inspection schedule deleted successfully!');
      } else {
        setToastMessage('Inspection schedule updated successfully!');
      }
      setToastColor('success');
      setShowToast(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setToastMessage('Failed to update status: ' + message);
      setToastColor('danger');
      setShowToast(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedSchedule) return;