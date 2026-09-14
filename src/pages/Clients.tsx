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
  IonModal,
  IonInput,
  IonButtons,
  IonIcon,
  IonToast,
  IonSearchbar,
  IonBadge
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { 
  businessOutline,
  trashOutline,
  createOutline,
  addOutline,
  personOutline
} from 'ionicons/icons';

import DeleteAlert from '../components/DeleteAlert';
import ConfirmAlert from '../components/ConfirmAlert';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import AssignLivestockModal from '../components/AssignLivestockModal';
import { useClients } from '../hooks/useClients';

export default function Clients() {
  const { clients, loading, fetchClients } = useClients();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    organization_name: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = clients.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(term) ||
      c.owner_name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term) ||
      c.contact_number?.toLowerCase().includes(term) ||
      c.organization_name?.toLowerCase().includes(term) ||
      c.address?.toLowerCase().includes(term)