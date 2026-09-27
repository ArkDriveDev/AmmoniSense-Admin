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
  IonToggle
} from '@ionic/react';

import { useState } from 'react';
import { supabase } from '../services/supabase';
import {
  businessOutline,
  addOutline,
  createOutline,
  trashOutline,
  locationOutline,
  arrowUpOutline,
  arrowDownOutline,
  calendarOutline,
  pricetagOutline,
  imageOutline,
  warningOutline,
  refreshOutline
} from 'ionicons/icons';

import DeleteAlert from '../components/DeleteAlert';
import ConfirmAlert from '../components/ConfirmAlert';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useInspectionSites, InspectionSiteWithSummary } from '../hooks/useInspectionSites';
import MapViewerModal from '../components/map/MapViewerModal';
import useSyncFeedback from '../hooks/useSyncFeedback';

const SITE_TYPES = [
  'Piggery',
  'Poultry',
  'Industrial',
  'Ambient',
  'Agricultural',
  'Commercial'
];

export default function AdminInspectionSites() {
  const { sites, loading, fetchInspectionSites } = useInspectionSites();
  const { syncToast, triggerSync, dismissSyncToast } = useSyncFeedback();
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [selectedSite, setSelectedSite] = useState<InspectionSiteWithSummary | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');