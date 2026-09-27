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
  IonButtons,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonSearchbar,
  IonBadge,
  IonToast,
  SearchbarCustomEvent,
  SelectCustomEvent
} from '@ionic/react';

import { useState } from 'react';
import {
  businessOutline,
  locationOutline,
  arrowUpOutline,
  arrowDownOutline,
  calendarOutline,
  pricetagOutline,
  imageOutline,
  warningOutline,
  refreshOutline
} from 'ionicons/icons';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('site_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Map modal state
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapTarget, setMapTarget] = useState<InspectionSiteWithSummary | null>(null);

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
            <IonButton onClick={() => triggerSync(fetchInspectionSites)}>
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>

        <IonToolbar style={{ '--background': '#f8fafc' }}>
          <IonSearchbar
            placeholder="SEARCH SITES BY NAME, CODE, OR LOCATION..."
            value={searchTerm}
            onIonInput={(e: SearchbarCustomEvent) => setSearchTerm(e.detail.value || '')}
            animated
          />
        </IonToolbar>

        <IonToolbar style={{ '--background': '#ffffff' }}>
          <div style={{ display: 'flex', gap: '8px', padding: '0 16px 8px 16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <IonSelect
              value={typeFilter}
              onIonChange={(e: SelectCustomEvent) => setTypeFilter(e.detail.value || 'all')}
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
            message={searchTerm || typeFilter !== 'all' ? 'TRY A DIFFERENT FILTER OR SEARCH TERM' : 'NO SITES REGISTERED YET'}
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

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
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
                  </div>
                </IonItem>
              );
            })}
          </IonList>
        )}

        {/* Map Viewer Modal */}
        {mapTarget && (
          <MapViewerModal
            isOpen={showMapModal}
            onDismiss={() => {
              setShowMapModal(false);
              setMapTarget(null);
            }}
            title={`${mapTarget.site_name} Location`}
            siteName={mapTarget.site_name}
            latitude={mapTarget.current_latitude || 8.3697}
            longitude={mapTarget.current_longitude || 124.8640}
          />
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
