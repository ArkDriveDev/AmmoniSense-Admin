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

import { useState, useMemo, useEffect } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import {
  businessOutline,
  locationOutline,
  arrowUpOutline,
  arrowDownOutline,
  calendarOutline,
  pricetagOutline,
  imageOutline,
  warningOutline,
  refreshOutline,
  addOutline,
  createOutline,
} from 'ionicons/icons';

import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useInspectionSites, InspectionSiteWithSummary } from '../hooks/useInspectionSites';
import MapViewerModal from '../components/map/MapViewerModal';
import useSyncFeedback from '../hooks/useSyncFeedback';
import SiteModal from '../components/admin/SiteModal';
import {
  SITE_TYPES,
  POULTRY_TYPES,
  CHICKEN_TYPES,
  getSiteTypeLabel,
  getPoultryTypeLabel,
  getChickenTypeLabel
} from '../constants/siteConstants';

export default function AdminInspectionSites() {
  const history = useHistory();
  const location = useLocation();
  const params = useParams<{ siteId?: string; id?: string }>();
  const queryParams = new URLSearchParams(location.search);
  const targetSiteId = params.siteId || params.id || queryParams.get('siteId');

  const { sites, loading, fetchInspectionSites } = useInspectionSites();
  const { syncToast, triggerSync, dismissSyncToast } = useSyncFeedback();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [poultryTypeFilter, setPoultryTypeFilter] = useState('all');
  const [chickenTypeFilter, setChickenTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('site_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Identify focused site from map navigation
  const selectedSite = useMemo(() => {
    if (!targetSiteId) return null;
    return sites.find(s => String(s.id) === String(targetSiteId)) || null;
  }, [sites, targetSiteId]);

  // Scroll to focused site card once loaded
  useEffect(() => {
    if (selectedSite) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`site-card-${selectedSite.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [selectedSite]);

  // Map modal state
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapTarget, setMapTarget] = useState<InspectionSiteWithSummary | null>(null);

  // Add/Edit Site modal state
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [selectedSiteForEdit, setSelectedSiteForEdit] = useState<InspectionSiteWithSummary | null>(null);

  const handleOpenAddSite = () => {
    setSelectedSiteForEdit(null);
    setShowSiteModal(true);
  };

  const handleOpenEditSite = (site: InspectionSiteWithSummary) => {
    setSelectedSiteForEdit(site);
    setShowSiteModal(true);
  };

  const filteredSites = useMemo(() => {
    const list = sites.filter(s => {
      if (typeFilter !== 'all' && s.site_type?.toUpperCase() !== typeFilter.toUpperCase()) {
        return false;
      }
      if (poultryTypeFilter !== 'all' && s.poultry_type?.toUpperCase() !== poultryTypeFilter.toUpperCase()) {
        return false;
      }
      if (chickenTypeFilter !== 'all' && s.chicken_type?.toUpperCase() !== chickenTypeFilter.toUpperCase()) {
        return false;
      }
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        s.site_name?.toLowerCase().includes(term) ||
        s.site_code?.toLowerCase().includes(term) ||
        s.address?.toLowerCase().includes(term) ||
        s.site_type?.toLowerCase().includes(term) ||
        getPoultryTypeLabel(s.poultry_type).toLowerCase().includes(term) ||
        getChickenTypeLabel(s.chicken_type).toLowerCase().includes(term)
      );
    }).sort((a, b) => {
      const aVal = String(a[sortBy as keyof InspectionSiteWithSummary] ?? '').toLowerCase();
      const bVal = String(b[sortBy as keyof InspectionSiteWithSummary] ?? '').toLowerCase();
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // If navigated from map with a selected site, prioritize it at the top
    if (selectedSite) {
      const idx = list.findIndex(s => s.id === selectedSite.id);
      if (idx > 0) {
        const [target] = list.splice(idx, 1);
        list.unshift(target);
      }
    }

    return list;
  }, [sites, typeFilter, poultryTypeFilter, chickenTypeFilter, searchTerm, sortBy, sortOrder, selectedSite]);

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
            <IonButton
              fill="solid"
              color="light"
              onClick={handleOpenAddSite}
              style={{ fontWeight: 700, fontSize: '12px', marginRight: '6px', color: '#1a365d' }}
            >
              <IonIcon icon={addOutline} slot="start" />
              ADD SITE
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
                <IonSelectOption key={t.value} value={t.value}>{t.label}</IonSelectOption>
              ))}
            </IonSelect>

            <IonSelect
              value={poultryTypeFilter}
              onIonChange={(e: SelectCustomEvent) => setPoultryTypeFilter(e.detail.value || 'all')}
              interface="popover"
              style={{ fontSize: '13px', backgroundColor: '#f1f5f9', borderRadius: '6px', padding: '2px 8px' }}
            >
              <IonSelectOption value="all">All Poultry Types</IonSelectOption>
              {POULTRY_TYPES.map(p => (
                <IonSelectOption key={p.value} value={p.value}>{p.label}</IonSelectOption>
              ))}
            </IonSelect>

            <IonSelect
              value={chickenTypeFilter}
              onIonChange={(e: SelectCustomEvent) => setChickenTypeFilter(e.detail.value || 'all')}
              interface="popover"
              style={{ fontSize: '13px', backgroundColor: '#f1f5f9', borderRadius: '6px', padding: '2px 8px' }}
            >
              <IonSelectOption value="all">All Chicken Types</IonSelectOption>
              {CHICKEN_TYPES.map(c => (
                <IonSelectOption key={c.value} value={c.value}>{c.label}</IonSelectOption>
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
        {/* Banner when navigated from map with a focused site */}
        {selectedSite && (
          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '1.5px solid #93c5fd',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              boxShadow: '0 2px 8px rgba(37,99,235,0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <IonIcon icon={businessOutline} style={{ color: '#1a365d', fontSize: '24px' }} />
              <div>
                <strong style={{ color: '#1a365d', fontSize: '15px' }}>
                  Viewing Site Details: {selectedSite.site_name}
                </strong>
                <span style={{ fontSize: '12px', color: '#475569', display: 'block' }}>
                  Code: {selectedSite.site_code} &bull; {selectedSite.address || 'Manolo Fortich'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <IonButton
                size="small"
                fill="outline"
                color="dark"
                onClick={() => history.push('/inspection-sites')}
              >
                View All Sites
              </IonButton>
              <IonButton
                size="small"
                fill="solid"
                color="primary"
                onClick={() => history.push('/dashboard')}
              >
                &larr; Back to Dashboard
              </IonButton>
            </div>
          </div>
        )}

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
              const isSelected = selectedSite && site.id === selectedSite.id;

              return (
                <IonItem
                  id={`site-card-${site.id}`}
                  key={site.id}
                  style={{
                    '--background': '#ffffff',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    boxShadow: isSelected ? '0 4px 16px rgba(37,99,235,0.22)' : '0 2px 8px rgba(0,0,0,0.04)',
                    borderLeft: `5px solid ${hasCritical ? '#dc2626' : site.is_active ? '#1a365d' : '#94a3b8'}`,
                    outline: isSelected ? '2px solid #2563eb' : 'none',
                    outlineOffset: isSelected ? '1px' : '0'
                  }}
                >
                  <IonLabel style={{ margin: '14px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <h2 style={{ color: '#1a365d', fontWeight: 'bold', fontSize: '17px', margin: 0 }}>
                        <IonIcon icon={businessOutline} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                        {site.site_name}
                      </h2>
                      {isSelected && (
                        <IonBadge color="primary" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <IonIcon icon={locationOutline} /> Selected From Map
                        </IonBadge>
                      )}
                      <IonBadge color="primary" style={{ fontSize: '11px' }}>
                        {site.site_code}
                      </IonBadge>
                      <IonBadge color="secondary" style={{ fontSize: '11px' }}>
                        {getSiteTypeLabel(site.site_type)}
                      </IonBadge>
                      {site.poultry_type && (
                        <IonBadge color="tertiary" style={{ fontSize: '11px' }}>
                          Poultry: {getPoultryTypeLabel(site.poultry_type)}
                        </IonBadge>
                      )}
                      {site.chicken_type && (
                        <IonBadge color="dark" style={{ fontSize: '11px' }}>
                          Chicken: {getChickenTypeLabel(site.chicken_type)}
                        </IonBadge>
                      )}
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

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '6px' }}>
                    <IonButton
                      size="small"
                      fill="outline"
                      color="primary"
                      onClick={() => handleOpenEditSite(site)}
                    >
                      <IonIcon icon={createOutline} slot="start" /> Edit
                    </IonButton>
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

        {/* Site Add / Edit Modal */}
        <SiteModal
          isOpen={showSiteModal}
          onClose={() => {
            setShowSiteModal(false);
            setSelectedSiteForEdit(null);
          }}
          site={selectedSiteForEdit}
          onSaved={() => {
            fetchInspectionSites();
          }}
        />

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
            siteId={mapTarget.id}
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
