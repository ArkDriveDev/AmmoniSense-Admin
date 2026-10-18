import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonToast,
  IonIcon,
} from '@ionic/react';
import { closeOutline, saveOutline, businessOutline } from 'ionicons/icons';
import { supabase } from '../../services/supabase';
import { InspectionSiteWithSummary } from '../../hooks/useInspectionSites';
import { SITE_TYPES, POULTRY_TYPES, CHICKEN_TYPES } from '../../constants/siteConstants';

interface SiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  site?: InspectionSiteWithSummary | null;
  onSaved: () => void;
}

export const SiteModal: React.FC<SiteModalProps> = ({
  isOpen,
  onClose,
  site,
  onSaved,
}) => {
  const isEdit = !!site;

  const [form, setForm] = useState({
    site_code: '',
    site_name: '',
    site_type: 'POULTRY',
    poultry_type: 'CONVENTIONAL',
    chicken_type: 'LAYER',
    address: '',
    current_latitude: '8.3697',
    current_longitude: '124.8640',
    area_size_hectares: '1.0',
    is_active: true,
  });

  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<'success' | 'danger'>('success');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (site) {
      setForm({
        site_code: site.site_code || '',
        site_name: site.site_name || '',
        site_type: (site.site_type || 'POULTRY').toUpperCase(),
        poultry_type: (site.poultry_type || 'CONVENTIONAL').toUpperCase(),
        chicken_type: (site.chicken_type || 'LAYER').toUpperCase(),
        address: site.address || '',
        current_latitude: site.current_latitude != null ? String(site.current_latitude) : '8.3697',
        current_longitude: site.current_longitude != null ? String(site.current_longitude) : '124.8640',
        area_size_hectares: site.area_size_hectares != null ? String(site.area_size_hectares) : '1.0',
        is_active: site.is_active ?? true,
      });
    } else {
      setForm({
        site_code: '',
        site_name: '',
        site_type: 'POULTRY',
        poultry_type: 'CONVENTIONAL',
        chicken_type: 'LAYER',
        address: '',
        current_latitude: '8.3697',
        current_longitude: '124.8640',
        area_size_hectares: '1.0',
        is_active: true,
      });
    }
  }, [site, isOpen]);

  const handleSubmit = async () => {
    if (!form.site_code.trim() || !form.site_name.trim()) {
      setToastMessage('Please fill in both Site Code and Site Name.');
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    if (!form.poultry_type) {
      setToastMessage('Please select a Poultry Type.');
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    if (!form.chicken_type) {
      setToastMessage('Please select a Chicken Type.');
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id || null;

      if (isEdit && site) {
        const payload = {
          site_code: form.site_code.trim().toUpperCase(),
          site_name: form.site_name.trim().toUpperCase(),
          site_type: form.site_type.trim().toUpperCase(),
          poultry_type: form.poultry_type.trim().toUpperCase(),
          chicken_type: form.chicken_type.trim().toUpperCase(),
          address: form.address ? form.address.trim().toUpperCase() : null,
          current_latitude: form.current_latitude ? parseFloat(form.current_latitude) : null,
          current_longitude: form.current_longitude ? parseFloat(form.current_longitude) : null,
          area_size_hectares: form.area_size_hectares ? parseFloat(form.area_size_hectares) : null,
          is_active: form.is_active,
          updated_by: currentUserId,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('inspection_sites')
          .update(payload)
          .eq('id', site.id);

        if (error) throw error;

        setToastMessage('Inspection site updated successfully!');
        setToastColor('success');
        setShowToast(true);
      } else {
        const payload = {
          site_code: form.site_code.trim().toUpperCase(),
          site_name: form.site_name.trim().toUpperCase(),
          site_type: form.site_type.trim().toUpperCase(),
          poultry_type: form.poultry_type.trim().toUpperCase(),
          chicken_type: form.chicken_type.trim().toUpperCase(),
          address: form.address ? form.address.trim().toUpperCase() : null,
          current_latitude: form.current_latitude ? parseFloat(form.current_latitude) : null,
          current_longitude: form.current_longitude ? parseFloat(form.current_longitude) : null,
          area_size_hectares: form.area_size_hectares ? parseFloat(form.area_size_hectares) : null,
          is_active: form.is_active,
          created_by: currentUserId,
        };

        const { error } = await supabase
          .from('inspection_sites')
          .insert([payload]);

        if (error) throw error;

        setToastMessage('Inspection site created successfully!');
        setToastColor('success');
        setShowToast(true);
      }

      setTimeout(() => {
        onSaved();
        onClose();
      }, 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving the site.';
      console.error('Error saving site:', err);
      setToastMessage(msg);
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={onClose}>
        <IonHeader>
          <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
            <IonTitle style={{ fontWeight: 700, fontSize: '16px' }}>
              <IonIcon icon={businessOutline} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              {isEdit ? 'EDIT INSPECTION SITE' : 'REGISTER INSPECTION SITE'}
            </IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={onClose} style={{ color: '#ffffff' }}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent className="ion-padding" style={{ '--background': '#f8fafc' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                Site Identification
              </h3>

              <IonItem lines="none" style={{ '--background': '#f1f5f9', borderRadius: '8px', marginBottom: '10px' }}>
                <IonInput
                  label="Site Code *"
                  labelPlacement="floating"
                  placeholder="E.G. SITE-POULTRY-001"
                  value={form.site_code}
                  onIonInput={(e) => setForm({ ...form, site_code: (e.detail.value || '').toUpperCase() })}
                  style={{ textTransform: 'uppercase', fontWeight: 600 }}
                />
              </IonItem>

              <IonItem lines="none" style={{ '--background': '#f1f5f9', borderRadius: '8px' }}>
                <IonInput
                  label="Site Name *"
                  labelPlacement="floating"
                  placeholder="E.G. SAN JOSE POULTRY COMPLEX"
                  value={form.site_name}
                  onIonInput={(e) => setForm({ ...form, site_name: (e.detail.value || '').toUpperCase() })}
                  style={{ textTransform: 'uppercase', fontWeight: 600 }}
                />
              </IonItem>
            </div>

            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                Poultry Classification
              </h3>

              {/* Site Type Dropdown: limited to SITE_TYPES, default POULTRY */}
              <IonItem lines="none" style={{ '--background': '#f1f5f9', borderRadius: '8px', marginBottom: '10px' }}>
                <IonSelect
                  label="Site Type *"
                  labelPlacement="floating"
                  value={form.site_type}
                  onIonChange={(e) => setForm({ ...form, site_type: e.detail.value })}
                  interface="popover"
                >
                  {SITE_TYPES.map((t) => (
                    <IonSelectOption key={t.value} value={t.value}>
                      {t.label}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>

              {/* Poultry Type Dropdown: required POULTRY_TYPES */}
              <IonItem lines="none" style={{ '--background': '#f1f5f9', borderRadius: '8px', marginBottom: '10px' }}>
                <IonSelect
                  label="Poultry Type *"
                  labelPlacement="floating"
                  value={form.poultry_type}
                  onIonChange={(e) => setForm({ ...form, poultry_type: e.detail.value })}
                  interface="popover"
                >
                  {POULTRY_TYPES.map((p) => (
                    <IonSelectOption key={p.value} value={p.value}>
                      {p.label}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>

              {/* Chicken Type Dropdown: required CHICKEN_TYPES */}
              <IonItem lines="none" style={{ '--background': '#f1f5f9', borderRadius: '8px' }}>
                <IonSelect
                  label="Chicken Type *"
                  labelPlacement="floating"
                  value={form.chicken_type}
                  onIonChange={(e) => setForm({ ...form, chicken_type: e.detail.value })}
                  interface="popover"
                >
                  {CHICKEN_TYPES.map((c) => (
                    <IonSelectOption key={c.value} value={c.value}>
                      {c.label}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            </div>

            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                Location &amp; Geography
              </h3>

              <IonItem lines="none" style={{ '--background': '#f1f5f9', borderRadius: '8px', marginBottom: '10px' }}>
                <IonInput
                  label="Address / Barangay"
                  labelPlacement="floating"
                  placeholder="E.G. BRGY. SAN JOSE, MALAYBALAY CITY"
                  value={form.address}
                  onIonInput={(e) => setForm({ ...form, address: (e.detail.value || '').toUpperCase() })}
                  style={{ textTransform: 'uppercase' }}
                />
              </IonItem>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <IonItem lines="none" style={{ '--background': '#f1f5f9', borderRadius: '8px' }}>
                  <IonInput
                    label="Latitude"
                    labelPlacement="floating"
                    type="number"
                    value={form.current_latitude}
                    onIonInput={(e) => setForm({ ...form, current_latitude: e.detail.value || '' })}
                  />
                </IonItem>
                <IonItem lines="none" style={{ '--background': '#f1f5f9', borderRadius: '8px' }}>
                  <IonInput
                    label="Longitude"
                    labelPlacement="floating"
                    type="number"
                    value={form.current_longitude}
                    onIonInput={(e) => setForm({ ...form, current_longitude: e.detail.value || '' })}
                  />
                </IonItem>
              </div>

              <IonItem lines="none" style={{ '--background': '#f1f5f9', borderRadius: '8px', marginBottom: '10px' }}>
                <IonInput
                  label="Area Size (Hectares)"
                  labelPlacement="floating"
                  type="number"
                  value={form.area_size_hectares}
                  onIonInput={(e) => setForm({ ...form, area_size_hectares: e.detail.value || '' })}
                />
              </IonItem>

              <IonItem lines="none" style={{ '--background': '#f1f5f9', borderRadius: '8px' }}>
                <IonLabel style={{ fontSize: '14px', fontWeight: 600 }}>Active Status</IonLabel>
                <IonToggle
                  slot="end"
                  checked={form.is_active}
                  onIonChange={(e) => setForm({ ...form, is_active: e.detail.checked })}
                />
              </IonItem>
            </div>

            <IonButton
              expand="block"
              onClick={handleSubmit}
              disabled={saving}
              style={{ '--background': '#1a365d', marginTop: '10px', fontWeight: 700 }}
            >
              <IonIcon icon={saveOutline} slot="start" />
              {saving ? 'SAVING...' : isEdit ? 'UPDATE INSPECTION SITE' : 'REGISTER INSPECTION SITE'}
            </IonButton>
          </div>
        </IonContent>
      </IonModal>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3500}
        color={toastColor}
        position="bottom"
      />
    </>
  );
};

export default SiteModal;
