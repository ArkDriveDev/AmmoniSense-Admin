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
  const [sortBy, setSortBy] = useState('site_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Map modal state
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapTarget, setMapTarget] = useState<InspectionSiteWithSummary | null>(null);

  const [form, setForm] = useState({
    site_code: '',
    site_name: '',
    site_type: 'Piggery',
    address: '',
    current_latitude: '8.3697',
    current_longitude: '124.8640',
    area_size_hectares: '1.0',
    is_active: true,
    notes: ''
  });

  const filteredSites = sites.filter(s => {
    if (typeFilter !== 'all' && s.site_type?.toLowerCase() !== typeFilter.toLowerCase()) {
      return false;
    }
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.site_name?.toLowerCase().includes(term) ||
      s.site_code?.toLowerCase().includes(term) ||
      s.address?.toLowerCase().includes(term) ||
      s.site_type?.toLowerCase().includes(term)
    );
  }).sort((a, b) => {
    const aVal = String(a[sortBy as keyof InspectionSiteWithSummary] ?? '').toLowerCase();
    const bVal = String(b[sortBy as keyof InspectionSiteWithSummary] ?? '').toLowerCase();
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;