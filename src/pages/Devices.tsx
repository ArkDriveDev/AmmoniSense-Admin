import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonIcon,
  IonSearchbar,
  IonButton,
  IonButtons,
  IonSelect,
  IonSelectOption,
  IonToast
} from '@ionic/react';

import { useState } from 'react';
import {
  hardwareChipOutline,
  arrowUpOutline,
  arrowDownOutline,
  barChartOutline,
  businessOutline,
  refreshOutline,
  batteryChargingOutline,
  timeOutline,
  wifiOutline,
  addOutline,
  createOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { supabase } from '../services/supabase';

import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import DeviceModal, { DeviceFormData } from '../components/DeviceModal';
import { useDevices } from '../hooks/useDevices';
import { useInspectionSites } from '../hooks/useInspectionSites';
import { Device } from '../types/schema';
import useSyncFeedback from '../hooks/useSyncFeedback';

export default function Devices() {
  const history = useHistory();
  const { devices, loading, refresh } = useDevices();
  const { sites } = useInspectionSites();
  const { syncToast, triggerSync, dismissSyncToast } = useSyncFeedback();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('installed_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');
  const [form, setForm] = useState<DeviceFormData>({ device_uid: '', device_name: '', inspection_site_id: '', status: 'ACTIVE', firmware_version: '1.0.0' });

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedDevice(null);
    setForm({ device_uid: '', device_name: '', inspection_site_id: '', status: 'ACTIVE', firmware_version: '1.0.0' });
    setShowModal(true);
  };

  const openEditModal = (device: Device) => {
    setIsEditing(true);
    setSelectedDevice(device);
    setForm({
      device_uid: device.device_uid || '',
      device_name: device.device_name || '',
      inspection_site_id: device.inspection_site_id ? String(device.inspection_site_id) : '',
      status: device.status || 'ACTIVE',
      firmware_version: device.firmware_version || '1.0.0'
    });
    setShowModal(true);
  };

  const handleSaveDevice = async () => {
    if (!form.device_uid.trim()) {
      setToastMessage('Device UID is required'); setToastColor('danger'); setShowToast(true); return;
    }
    try {
      const payload = {
        device_uid: form.device_uid.trim().toUpperCase(),
        device_name: form.device_name ? form.device_name.trim().toUpperCase() : null,
        inspection_site_id: form.inspection_site_id ? Number(form.inspection_site_id) : null,
        status: form.status,
        firmware_version: form.firmware_version ? form.firmware_version.trim() : '1.0.0',
      };
      const query = isEditing && selectedDevice
        ? supabase.from('devices').update(payload).eq('id', selectedDevice.id)
        : supabase.from('devices').insert([{ ...payload, installed_at: new Date().toISOString() }]);
      const { error } = await query;
      if (error) throw error;
      setToastMessage('Device saved successfully!'); setToastColor('success'); setShowToast(true); setShowModal(false); refresh();
    } catch (err: any) {
      setToastMessage('Failed to save device: ' + (err.message || 'Unknown error')); setToastColor('danger'); setShowToast(true);
    }
  };

  const filteredDevices = devices.filter(d => {
    if (statusFilter !== 'all' && (d.status || '').toUpperCase() !== statusFilter.toUpperCase()) {
      return false;
    }
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.device_uid?.toLowerCase().includes(term) ||
      d.device_name?.toLowerCase().includes(term) ||
      d.firmware_version?.toLowerCase().includes(term) ||
      d.inspection_sites?.site_name?.toLowerCase().includes(term)
    );
  }).sort((a, b) => {
    const aVal = String(a[sortBy as keyof Device] ?? '').toLowerCase();
    const bVal = String(b[sortBy as keyof Device] ?? '').toLowerCase();
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getStatusColor = (status: string | null | undefined) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'danger';
      case 'OFFLINE': return 'medium';
      case 'MAINTENANCE': return 'warning';
      default: return 'medium';
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontWeight: 'bold' }}>REGISTERED BLE & IOT SENSORS</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={openCreateModal}>
              <IonIcon icon={addOutline} slot="start" /> REGISTER DEVICE
            </IonButton>
            <IonButton onClick={() => triggerSync(refresh)}>
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>

        <IonToolbar style={{ '--background': '#f8fafc' }}>
          <IonSearchbar
            placeholder="SEARCH SENSOR UID, NAME, SITE..."
            value={searchTerm}
            onIonInput={(e) => setSearchTerm(e.detail.value || '')}
            animated
          />
        </IonToolbar>

        <IonToolbar style={{ '--background': '#ffffff' }}>
          <div style={{ display: 'flex', gap: '8px', padding: '0 16px 8px 16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <IonSelect
              value={statusFilter}
              onIonChange={(e) => setStatusFilter(e.detail.value)}
              interface="popover"
              style={{ fontSize: '13px', backgroundColor: '#f1f5f9', borderRadius: '6px', padding: '2px 8px' }}
            >
              <IonSelectOption value="all">All Statuses</IonSelectOption>
              <IonSelectOption value="ACTIVE">Active</IonSelectOption>
              <IonSelectOption value="OFFLINE">Offline</IonSelectOption>
              <IonSelectOption value="INACTIVE">Inactive</IonSelectOption>
              <IonSelectOption value="MAINTENANCE">Maintenance</IonSelectOption>
            </IonSelect>

            <IonButton 
              size="small" 
              fill={sortBy === 'device_uid' ? 'solid' : 'outline'}
              onClick={() => handleSort('device_uid')}
            >
              UID
              {sortBy === 'device_uid' && (
                <IonIcon 
                  icon={sortOrder === 'asc' ? arrowUpOutline : arrowDownOutline} 
                  style={{ marginLeft: '4px' }} 
                />
              )}
            </IonButton>

            <IonButton 
              size="small" 
              fill={sortBy === 'battery_level' ? 'solid' : 'outline'}
              onClick={() => handleSort('battery_level')}
            >
              BATTERY
              {sortBy === 'battery_level' && (
                <IonIcon 
                  icon={sortOrder === 'asc' ? arrowUpOutline : arrowDownOutline} 
                  style={{ marginLeft: '4px' }} 
                />
              )}
            </IonButton>

            <IonButton 
              size="small" 
              fill={sortBy === 'installed_at' ? 'solid' : 'outline'}
              onClick={() => handleSort('installed_at')}
            >
              REGISTERED
              {sortBy === 'installed_at' && (
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
        ) : filteredDevices.length === 0 ? (
          <EmptyState
            title="NO BLE SENSORS FOUND"
            message={searchTerm || statusFilter !== 'all' ? 'TRY A DIFFERENT SEARCH OR FILTER' : 'BLE sensors auto-register when connected via the AmmoniSense mobile app'}
          />
        ) : (
          <IonList style={{ background: 'transparent' }}>
            {filteredDevices.map((d: Device) => {
              const battery = d.battery_level;
              const hasSite = !!d.inspection_sites;

              return (
                <IonItem
                  key={d.id}
                  style={{
                    '--background': '#ffffff',
                    borderRadius: '12px',
                    marginBottom: '10px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                  }}
                >
                  <IonLabel style={{ margin: '14px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <h2 style={{ color: '#1a365d', fontWeight: 'bold', fontSize: '16px', margin: 0 }}>
                        <IonIcon icon={hardwareChipOutline} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                        {d.device_name || d.device_uid}
                      </h2>
                      <IonBadge color={getStatusColor(d.status)}>
                        {d.status || 'ACTIVE'}
                      </IonBadge>
                    </div>

                    <p style={{ color: '#475569', fontSize: '13px', margin: '2px 0' }}>
                      <b>UID:</b> {d.device_uid}
                      {d.firmware_version ? ` • Firmware: ${d.firmware_version}` : ''}
                    </p>

                    <p style={{ color: '#64748b', fontSize: '12px', margin: '2px 0' }}>
                      <IonIcon icon={businessOutline} style={{ verticalAlign: 'middle', marginRight: '4px', color: '#059669' }} />
                      <b>Assigned Site:</b> {hasSite ? `${d.inspection_sites?.site_name} (${d.inspection_sites?.site_code})` : 'Unassigned / Portable'}
                    </p>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
                      {battery !== null && battery !== undefined && (
                        <span style={{ color: battery > 20 ? '#15803d' : '#dc2626', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <IonIcon icon={batteryChargingOutline} /> Battery: {battery}%
                        </span>
                      )}

                      {d.last_ping_at && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <IonIcon icon={wifiOutline} /> Last Ping: {new Date(d.last_ping_at).toLocaleTimeString()}
                        </span>
                      )}

                      {d.installed_at && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <IonIcon icon={timeOutline} /> Registered: {new Date(d.installed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </IonLabel>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <IonButton
                      size="small"
                      fill="solid"
                      color="primary"
                      onClick={() => openEditModal(d)}
                    >
                      <IonIcon icon={createOutline} slot="start" /> Assign / Edit
                    </IonButton>
                    <IonButton
                      size="small"
                      fill="outline"
                      color="secondary"
                      onClick={() => history.push(`/sensor-data`)}
                    >
                      <IonIcon icon={barChartOutline} slot="start" /> Telemetry
                    </IonButton>
                  </div>
                </IonItem>
              );
            })}
          </IonList>
        )}

        {/* Device Registration & Site Assignment Modal */}
        <DeviceModal
          isOpen={showModal}
          onDismiss={() => setShowModal(false)}
          isEditing={isEditing}
          form={form}
          setForm={setForm}
          sites={sites}
          onSave={handleSaveDevice}
        />

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3500}
          color={toastColor}
          position="bottom"
        />

        <IonToast
          isOpen={syncToast.isOpen}
          onDidDismiss={dismissSyncToast}
          message={syncToast.message}
          duration={syncToast.duration}
          color={syncToast.color}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
}