import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonInput, IonSelect, IonSelectOption } from '@ionic/react';
import { InspectionSiteWithSummary } from '../hooks/useInspectionSites';

export interface DeviceFormData {
  device_uid: string;
  device_name: string;
  inspection_site_id: string;
  status: string;
  firmware_version: string;
}

interface DeviceModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  isEditing: boolean;
  form: DeviceFormData;
  setForm: (form: DeviceFormData) => void;
  sites: InspectionSiteWithSummary[];
  onSave: () => void;
}

export default function DeviceModal({ isOpen, onDismiss, isEditing, form, setForm, sites, onSave }: DeviceModalProps) {
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle>{isEditing ? 'EDIT DEVICE ASSIGNMENT' : 'REGISTER NEW SENSOR'}</IonTitle>
          <IonButtons slot="end"><IonButton onClick={onDismiss}>CLOSE</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonInput
          label="DEVICE UID / IDENTIFIER" labelPlacement="floating" placeholder="E.G. BLE-NH3-001"
          value={form.device_uid} autocapitalize="characters"