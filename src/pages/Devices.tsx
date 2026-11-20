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
  IonToast,
  SearchbarCustomEvent,
  SelectCustomEvent
} from '@ionic/react';

import { useState } from 'react';
import {
  hardwareChipOutline,
  arrowUpOutline,
  arrowDownOutline,
  businessOutline,
  refreshOutline,
  batteryChargingOutline,
  timeOutline,
  wifiOutline
} from 'ionicons/icons';

import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { SearchAndSortBar } from '../components/SearchAndSortBar';
import { useDevices } from '../hooks/useDevices';
import { Device } from '../types/schema';
import useSyncFeedback from '../hooks/useSyncFeedback';

export default function Devices() {
  const { devices, loading, refresh } = useDevices();
  const { syncToast, triggerSync, dismissSyncToast } = useSyncFeedback();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('installed_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
            <IonButton onClick={() => triggerSync(refresh)}>
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>

        <SearchAndSortBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Search devices..."
          sortBy={sortBy}
          onSortChange={(val) => {
            if (val === sortBy) {
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            } else {
              setSortBy(val as any);
              setSortOrder('asc');
            }
          }}
          sortOptions={[
            { value: 'device_uid', label: 'UID' },
            { value: 'battery_level', label: 'Battery' },
            { value: 'installed_at', label: 'Date' }
          ]}
          sortPlaceholder="Sort"
        >
          <div className="sort-control-wrapper">
            <IonSelect
              value={statusFilter}
              onIonChange={(e: SelectCustomEvent) => setStatusFilter(e.detail.value || 'all')}
              interface="popover"
              className="sort-select-chip"
            >
              <IonSelectOption value="all">All Statuses</IonSelectOption>
              <IonSelectOption value="ACTIVE">Active</IonSelectOption>
              <IonSelectOption value="OFFLINE">Offline</IonSelectOption>
              <IonSelectOption value="INACTIVE">Inactive</IonSelectOption>
              <IonSelectOption value="MAINTENANCE">Maintenance</IonSelectOption>
            </IonSelect>
          </div>
        </SearchAndSortBar>
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
                </IonItem>
              );
            })}
          </IonList>
        )}

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