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