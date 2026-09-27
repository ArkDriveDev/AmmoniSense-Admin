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