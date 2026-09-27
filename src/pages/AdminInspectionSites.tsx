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
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleCreate = async () => {
    if (!form.site_code || !form.site_name) {
      setToastMessage('Please fill in Site Code and Site Name');
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const createdBy = userData.user?.id || null;

      const payload = {
        site_code: form.site_code.trim().toUpperCase(),
        site_name: form.site_name.trim().toUpperCase(),
        site_type: form.site_type,
        address: form.address ? form.address.trim().toUpperCase() : null,
        current_latitude: form.current_latitude ? parseFloat(form.current_latitude) : null,
        current_longitude: form.current_longitude ? parseFloat(form.current_longitude) : null,
        area_size_hectares: form.area_size_hectares ? parseFloat(form.area_size_hectares) : null,
        is_active: form.is_active,
        notes: form.notes ? form.notes.trim().toUpperCase() : null,
        created_by: createdBy,
      };

      const { error } = await supabase.from('inspection_sites').insert([payload]);
      if (error) throw error;

      setToastMessage('Inspection site registered successfully!');
      setToastColor('success');
      setShowToast(true);
      setShowModal(false);
      resetForm();
      fetchInspectionSites();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error creating inspection site:', err);
      setToastMessage('Error creating Inspection Site: ' + message);
      setToastColor('danger');
      setShowToast(true);
    }
  };

  const handleUpdate = async () => {
    if (!selectedSite || !form.site_name) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      const updatedBy = userData.user?.id || null;

      const payload = {
        site_code: form.site_code.trim().toUpperCase(),
        site_name: form.site_name.trim().toUpperCase(),
        site_type: form.site_type,
        address: form.address ? form.address.trim().toUpperCase() : null,
        current_latitude: form.current_latitude ? parseFloat(form.current_latitude) : null,
        current_longitude: form.current_longitude ? parseFloat(form.current_longitude) : null,
        area_size_hectares: form.area_size_hectares ? parseFloat(form.area_size_hectares) : null,
        is_active: form.is_active,
        notes: form.notes ? form.notes.trim().toUpperCase() : null,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('inspection_sites')
        .update(payload)
        .eq('id', selectedSite.id);

      if (error) throw error;

      setToastMessage('Inspection site updated successfully!');
      setToastColor('success');
      setShowToast(true);
      setShowUpdateConfirm(false);
      setShowEditModal(false);
      setSelectedSite(null);
      resetForm();
      fetchInspectionSites();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setToastMessage('Error updating Inspection Site: ' + message);
      setToastColor('danger');
      setShowToast(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedSite) return;

    try {
      const { error } = await supabase.from('inspection_sites').delete().eq('id', selectedSite.id);
      if (error) throw error;

      setToastMessage('Inspection site deleted successfully!');
      setToastColor('success');
      setShowToast(true);
      setShowDeleteAlert(false);
      setSelectedSite(null);
      fetchInspectionSites();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setToastMessage('Error deleting Inspection Site: ' + message);
      setToastColor('danger');
      setShowToast(true);
    }
  };

  const openEditModal = (site: InspectionSiteWithSummary) => {
    setSelectedSite(site);
    setForm({
      site_code: (site.site_code || '').toUpperCase(),
      site_name: (site.site_name || '').toUpperCase(),
      site_type: site.site_type || 'Piggery',
      address: (site.address || '').toUpperCase(),
      current_latitude: site.current_latitude?.toString() || '8.3697',
      current_longitude: site.current_longitude?.toString() || '124.8640',
      area_size_hectares: site.area_size_hectares?.toString() || '1.0',
      is_active: site.is_active ?? true,
      notes: (site.notes || '').toUpperCase()
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setForm({
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