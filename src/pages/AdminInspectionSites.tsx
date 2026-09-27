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
  };

  const openDeleteAlert = (site: InspectionSiteWithSummary) => {
    setSelectedSite(site);
    setShowDeleteAlert(true);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontWeight: 'bold' }}>INSPECTION SITES DIRECTORY</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => { resetForm(); setShowModal(true); }}>
              <IonIcon icon={addOutline} slot="start" /> ADD INSPECTION SITE
            </IonButton>
            <IonButton onClick={() => triggerSync(fetchInspectionSites)}>
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>

        <IonToolbar style={{ '--background': '#f8fafc' }}>
          <IonSearchbar
            placeholder="SEARCH SITES BY NAME, CODE, OR LOCATION..."
            value={searchTerm}
            onIonInput={(e) => setSearchTerm(e.detail.value || '')}
            animated
          />
        </IonToolbar>

        <IonToolbar style={{ '--background': '#ffffff' }}>
          <div style={{ display: 'flex', gap: '8px', padding: '0 16px 8px 16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <IonSelect
              value={typeFilter}
              onIonChange={(e) => setTypeFilter(e.detail.value)}
              interface="popover"
              style={{ fontSize: '13px', backgroundColor: '#f1f5f9', borderRadius: '6px', padding: '2px 8px' }}
            >
              <IonSelectOption value="all">All Site Types</IonSelectOption>
              {SITE_TYPES.map(t => (
                <IonSelectOption key={t} value={t}>{t}</IonSelectOption>
              ))}
            </IonSelect>

            <IonButton 
              size="small" 
              fill={sortBy === 'site_name' ? 'solid' : 'outline'}
              onClick={() => handleSort('site_name')}
            >
              NAME
              {sortBy === 'site_name' && (
                <IonIcon 
                  icon={sortOrder === 'asc' ? arrowUpOutline : arrowDownOutline} 
                  style={{ marginLeft: '4px' }} 
                />
              )}
            </IonButton>

            <IonButton 
              size="small" 
              fill={sortBy === 'site_code' ? 'solid' : 'outline'}
              onClick={() => handleSort('site_code')}
            >
              CODE
              {sortBy === 'site_code' && (
                <IonIcon 
                  icon={sortOrder === 'asc' ? arrowUpOutline : arrowDownOutline} 
                  style={{ marginLeft: '4px' }} 
                />
              )}
            </IonButton>

            <IonButton 
              size="small" 
              fill={sortBy === 'site_type' ? 'solid' : 'outline'}
              onClick={() => handleSort('site_type')}
            >
              TYPE
              {sortBy === 'site_type' && (
                <IonIcon 
                  icon={sortOrder === 'asc' ? arrowUpOutline : arrowDownOutline} 
                  style={{ marginLeft: '4px' }} 
                />
              )}
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f1f5f9' }}>
        {loading ? (
          <LoadingSpinner />
        ) : filteredSites.length === 0 ? (
          <EmptyState
            title="NO INSPECTION SITES FOUND"
            message={searchTerm || typeFilter !== 'all' ? 'TRY A DIFFERENT FILTER OR SEARCH TERM' : 'CLICK ADD INSPECTION SITE TO REGISTER A SITE'}
          />
        ) : (
          <IonList style={{ background: 'transparent' }}>
            {filteredSites.map((site) => {
              const hasCritical = (site.critical_readings || 0) > 0;
              const hasAvgAmmonia = site.avg_ammonia !== null && site.avg_ammonia !== undefined;

              return (
                <IonItem
                  key={site.id}
                  style={{
                    '--background': '#ffffff',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    borderLeft: `5px solid ${hasCritical ? '#dc2626' : site.is_active ? '#1a365d' : '#94a3b8'}`
                  }}
                >
                  <IonLabel style={{ margin: '14px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <h2 style={{ color: '#1a365d', fontWeight: 'bold', fontSize: '17px', margin: 0 }}>
                        <IonIcon icon={businessOutline} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                        {site.site_name}
                      </h2>
                      <IonBadge color="primary" style={{ fontSize: '11px' }}>
                        {site.site_code}
                      </IonBadge>
                      <IonBadge color="secondary" style={{ fontSize: '11px' }}>
                        {site.site_type || 'Unspecified'}
                      </IonBadge>
                      {!site.is_active && (
                        <IonBadge color="medium" style={{ fontSize: '11px' }}>
                          INACTIVE
                        </IonBadge>
                      )}
                    </div>

                    <p style={{ color: '#475569', fontSize: '13px', margin: '3px 0' }}>
                      <IonIcon icon={locationOutline} style={{ verticalAlign: 'middle', marginRight: '4px', color: '#059669' }} />
                      {site.address || 'Address not specified'}
                      {site.area_size_hectares ? ` • ${site.area_size_hectares} ha` : ''}
                      {site.current_latitude && site.current_longitude ? ` (${site.current_latitude.toFixed(4)}°, ${site.current_longitude.toFixed(4)}°)` : ''}
                    </p>

                    {/* Summary metrics chips from inspection_site_summary */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#1e293b', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <IonIcon icon={calendarOutline} style={{ color: '#2563eb' }} />
                        <b>{site.schedule_count || 0}</b> Schedules
                      </span>

                      <span style={{ fontSize: '11px', color: '#1e293b', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <IonIcon icon={pricetagOutline} style={{ color: '#0891b2' }} />
                        <b>{site.tag_count || 0}</b> Tags
                      </span>

                      <span style={{ fontSize: '11px', color: '#1e293b', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <IonIcon icon={imageOutline} style={{ color: '#7c3aed' }} />
                        <b>{site.photo_count || 0}</b> Photos
                      </span>

                      {hasAvgAmmonia && (
                        <span style={{ fontSize: '11px', color: (site.avg_ammonia || 0) > 25 ? '#dc2626' : '#15803d', backgroundColor: (site.avg_ammonia || 0) > 25 ? '#fef2f2' : '#f0fdf4', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                          Avg NH₃: {site.avg_ammonia?.toFixed(1)} PPM
                        </span>
                      )}

                      {hasCritical && (
                        <span style={{ fontSize: '11px', color: '#dc2626', backgroundColor: '#fee2e2', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                          <IonIcon icon={warningOutline} />
                          {site.critical_readings} Critical Readings
                        </span>
                      )}

                      {site.last_inspection_at && (
                        <span style={{ fontSize: '11px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          Last inspected: {new Date(site.last_inspection_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </IonLabel>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'flex-end' }}>
                      <IonButton
                        size="small"
                        fill="outline"
                        color="secondary"
                        onClick={() => {
                          setMapTarget(site);
                          setShowMapModal(true);
                        }}
                      >
                        <IonIcon icon={locationOutline} slot="start" /> Map
                      </IonButton>
                      <IonButton size="small" fill="clear" color="primary" onClick={() => openEditModal(site)}>
                        <IonIcon icon={createOutline} />
                      </IonButton>
                      <IonButton size="small" fill="clear" color="danger" onClick={() => openDeleteAlert(site)}>
                        <IonIcon icon={trashOutline} />
                      </IonButton>
                    </div>
                  </div>
                </IonItem>
              );
            })}
          </IonList>
        )}

        {/* Create Modal */}
        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
              <IonTitle>REGISTER INSPECTION SITE</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>CLOSE</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonInput
              label="SITE CODE / UNIQUE IDENTIFIER"
              labelPlacement="floating"
              placeholder="E.G. SITE-SANJOSE-001"
              value={form.site_code}
              autocapitalize="characters"
              onIonInput={e => setForm({ ...form, site_code: (e.detail.value || '').toUpperCase() })}
              style={{ textTransform: 'uppercase', marginBottom: '14px' }}
            />
            <IonInput
              label="INSPECTION SITE NAME"
              labelPlacement="floating"
              placeholder="E.G. SAN JOSE AGRI-PIGGERY COMPLEX"
              value={form.site_name}
              autocapitalize="characters"
              onIonInput={e => setForm({ ...form, site_name: (e.detail.value || '').toUpperCase() })}
              style={{ textTransform: 'uppercase', marginBottom: '14px' }}
            />
            <IonSelect
              label="SITE TYPE"
              labelPlacement="floating"
              value={form.site_type}
              onIonChange={e => setForm({ ...form, site_type: e.detail.value })}
              style={{ marginBottom: '14px' }}
            >
              {SITE_TYPES.map(t => (
                <IonSelectOption key={t} value={t}>{t}</IonSelectOption>
              ))}
            </IonSelect>
            <IonInput
              label="ADDRESS / BARANGAY LOCATION"
              labelPlacement="floating"
              placeholder="E.G. PUROK 3, BRGY. SAN JOSE, MANOLO FORTICH"
              value={form.address}
              autocapitalize="characters"
              onIonInput={e => setForm({ ...form, address: (e.detail.value || '').toUpperCase() })}
              style={{ textTransform: 'uppercase', marginBottom: '14px' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <IonInput
                label="LATITUDE"
                labelPlacement="floating"
                type="number"
                placeholder="8.3697"
                value={form.current_latitude}
                onIonInput={e => setForm({ ...form, current_latitude: e.detail.value || '' })}
              />
              <IonInput
                label="LONGITUDE"
                labelPlacement="floating"
                type="number"
                placeholder="124.8640"
                value={form.current_longitude}
                onIonInput={e => setForm({ ...form, current_longitude: e.detail.value || '' })}
              />
            </div>
            <IonInput
              label="FACILITY AREA SIZE (HECTARES)"
              labelPlacement="floating"
              type="number"
              placeholder="E.G. 2.5"
              value={form.area_size_hectares}
              onIonInput={e => setForm({ ...form, area_size_hectares: e.detail.value || '' })}
              style={{ marginBottom: '14px' }}
            />
            <IonTextarea
              label="OBSERVATION NOTES"
              labelPlacement="floating"
              placeholder="ADDITIONAL ENVIRONMENTAL NOTES, FACILITY DETAILS, OR INSPECTION PRIORITIES..."
              value={form.notes}
              autocapitalize="characters"
              onIonInput={e => setForm({ ...form, notes: (e.detail.value || '').toUpperCase() })}
              rows={3}
              style={{ textTransform: 'uppercase', marginBottom: '16px' }}
            />
            <IonItem lines="none" style={{ '--background': '#f8fafc', borderRadius: '8px', marginBottom: '16px' }}>
              <IonLabel>Active Facility Status</IonLabel>
              <IonToggle
                checked={form.is_active}
                onIonChange={e => setForm({ ...form, is_active: e.detail.checked })}
              />
            </IonItem>
            <IonButton expand="block" onClick={handleCreate} style={{ '--background': '#1a365d' }}>
              REGISTER INSPECTION SITE
            </IonButton>
          </IonContent>
        </IonModal>

        {/* Edit Modal */}