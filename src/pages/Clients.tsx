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