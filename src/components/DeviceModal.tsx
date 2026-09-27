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
          onIonInput={e => setForm({ ...form, device_uid: (e.detail.value || '').toUpperCase() })}
          style={{ textTransform: 'uppercase', marginBottom: '14px' }} disabled={isEditing}
        />

        <IonInput
          label="DEVICE NAME / LABEL (OPTIONAL)" labelPlacement="floating" placeholder="E.G. PERIMETER SENSOR NORTH"
          value={form.device_name} autocapitalize="characters"
          onIonInput={e => setForm({ ...form, device_name: (e.detail.value || '').toUpperCase() })}
          style={{ textTransform: 'uppercase', marginBottom: '14px' }}
        />

        <IonSelect
          label="ASSIGN TO INSPECTION SITE" labelPlacement="floating" placeholder="SELECT FACILITY"
          value={form.inspection_site_id} onIonChange={e => setForm({ ...form, inspection_site_id: e.detail.value })}
          style={{ marginBottom: '14px' }}
        >
          <IonSelectOption value="">None (Portable / Unassigned)</IonSelectOption>
          {sites.map(s => <IonSelectOption key={s.id} value={s.id.toString()}>{s.site_name} ({s.site_code})</IonSelectOption>)}
        </IonSelect>

        <IonSelect
          label="OPERATIONAL STATUS" labelPlacement="floating" value={form.status}
          onIonChange={e => setForm({ ...form, status: e.detail.value })} style={{ marginBottom: '14px' }}
        >
          <IonSelectOption value="ACTIVE">ACTIVE</IonSelectOption>
          <IonSelectOption value="OFFLINE">OFFLINE</IonSelectOption>
          <IonSelectOption value="INACTIVE">INACTIVE</IonSelectOption>
          <IonSelectOption value="MAINTENANCE">MAINTENANCE</IonSelectOption>
        </IonSelect>

        <IonInput
          label="FIRMWARE VERSION" labelPlacement="floating" placeholder="E.G. 1.0.0"
          value={form.firmware_version} onIonInput={e => setForm({ ...form, firmware_version: e.detail.value || '' })}
          style={{ marginBottom: '18px' }}
        />