import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonBadge,
  IonButton,
  IonButtons,
  IonIcon,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonModal,
  IonRefresher,
  IonRefresherContent,
  IonToast
} from '@ionic/react';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import {
  refreshOutline,
  mapOutline,
  eyeOutline,
  locationOutline,
  hardwareChipOutline,
  imageOutline,
  calendarOutline,
  pricetagOutline,
  batteryChargingOutline,
  thermometerOutline
} from 'ionicons/icons';

import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import SpatialPolygonMap, { SensorReadingMarker } from '../components/map/SpatialPolygonMap';
import { InspectionTagDetails, InspectionSite } from '../types/schema';
import useSyncFeedback from '../hooks/useSyncFeedback';

export default function SensorData() {
  const { syncToast, triggerSync, dismissSyncToast } = useSyncFeedback();
  const [tags, setTags] = useState<InspectionTagDetails[]>([]);
  const [filteredTags, setFilteredTags] = useState<InspectionTagDetails[]>([]);
  const [sites, setSites] = useState<InspectionSite[]>([]);
  const [devices, setDevices] = useState<{ device_uid: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [showMap, setShowMap] = useState(true);

  const [selectedPhoto, setSelectedPhoto] = useState<InspectionTagDetails | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const fetchSites = useCallback(async () => {
    try {
      const { data } = await supabase.from('inspection_sites').select('*').order('site_name');
      setSites(data || []);
    } catch (err) {
      console.error('Error fetching inspection sites:', err);
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('devices')
        .select('device_uid')
        .order('device_uid');
      if (data && data.length > 0) {
        setDevices(data);
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      // Query inspection_tag_details view
      const { data, error } = await supabase
        .from('inspection_tag_details')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        // Fallback to direct inspection_tags query if view is compiling
        const { data: rawTags, error: rawErr } = await supabase
          .from('inspection_tags')
          .select(`
            *,
            inspection_sites (
              id,
              site_name,
              site_code
            ),
            inspection_schedules (
              id,
              schedule_name,
              scheduled_date
            )
          `)
          .order('created_at', { ascending: false })
          .limit(200);

        if (rawErr) throw rawErr;

        const mapped: InspectionTagDetails[] = (rawTags || []).map((t) => ({
          tag_id: t.id,
          tag_name: t.tag_name || `Tag #${t.id}`,
          inspection_site_id: t.inspection_site_id,
          inspection_schedule_id: t.inspection_schedule_id,
          sensor_data_id: null,
          tag_latitude: t.latitude,
          tag_longitude: t.longitude,
          photo_url: t.photo_url,
          photo_thumbnail_url: t.photo_thumbnail_url,
          photo_storage_path: null,
          photo_thumbnail_storage_path: null,
          created_at: t.created_at,
          notes: t.notes,
          offline_temp_id: t.offline_temp_id,
          created_by: t.created_by,
          ammonia: t.ammonia,
          temperature: t.temperature,
          humidity: t.humidity,
          battery: t.battery,
          status: t.status,
          reading_latitude: t.latitude,
          reading_longitude: t.longitude,
          reading_at: t.created_at,
          device_uid: t.device_uid,
          device_name: null,
          schedule_name: t.inspection_schedules?.schedule_name || null,
          scheduled_date: t.inspection_schedules?.scheduled_date || null,
          site_name: t.inspection_sites?.site_name || null,
          site_code: t.inspection_sites?.site_code || null,
          created_by_name: null,
          latitude: t.latitude,
          longitude: t.longitude,
          schedule_id: t.inspection_schedule_id,
        }));

        setTags(mapped);
      } else {
        const normalized: InspectionTagDetails[] = (data || []).map((t: any) => ({
          ...t,
          latitude: t.tag_latitude ?? t.reading_latitude ?? t.latitude,
          longitude: t.tag_longitude ?? t.reading_longitude ?? t.longitude,
          schedule_id: t.inspection_schedule_id ?? t.schedule_id,
        }));
        setTags(normalized);
      }
    } catch (err) {
      console.error('Error fetching inspection tags:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
    fetchDevices();
    fetchTags();

    if (realtimeEnabled) {
      const subscription = supabase
        .channel('inspection_tags_channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'inspection_tags'
          },
          () => {
            fetchTags();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [realtimeEnabled, fetchSites, fetchDevices, fetchTags]);

  useEffect(() => {
    let result = [...tags];

    if (siteFilter !== 'all') {
      result = result.filter(t => t.inspection_site_id === Number(siteFilter));
    }

    if (deviceFilter !== 'all') {
      result = result.filter(t => t.device_uid === deviceFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter(t => (t.status || '').toUpperCase() === statusFilter.toUpperCase());
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t =>
        t.tag_name?.toLowerCase().includes(term) ||
        t.site_name?.toLowerCase().includes(term) ||
        t.site_code?.toLowerCase().includes(term) ||
        t.device_uid?.toLowerCase().includes(term) ||
        t.schedule_name?.toLowerCase().includes(term) ||
        t.status?.toLowerCase().includes(term) ||
        t.notes?.toLowerCase().includes(term)
      );
    }

    setFilteredTags(result);
  }, [tags, searchTerm, siteFilter, deviceFilter, statusFilter]);

  const handleRefresh = async (event: CustomEvent) => {
    await fetchTags();
    event.detail.complete();
  };

  // Convert inspection tags to map markers
  const mapMarkers: SensorReadingMarker[] = filteredTags
    .filter(t => t.latitude != null && t.longitude != null && !isNaN(Number(t.latitude)) && !isNaN(Number(t.longitude)) && Number(t.latitude) !== 0)
    .map(t => ({
      id: t.tag_id,
      latitude: Number(t.latitude),
      longitude: Number(t.longitude),
      ammonia: Number(t.ammonia) || 0,
      device_uid: t.device_uid || t.tag_name,
      created_at: t.created_at,
      photo_url: t.photo_url || t.photo_thumbnail_url || undefined,
      status: t.status || undefined,
      site_name: t.site_name || undefined,
    }));

  const activeSiteObj = sites.find(s => s.id === Number(siteFilter));

  const getStatusBadgeColor = (status: string | null, ammonia: number | null) => {
    const s = (status || '').toUpperCase();
    if (s === 'CRITICAL' || (ammonia !== null && ammonia > 50)) return 'danger';
    if (s === 'HIGH' || (ammonia !== null && ammonia > 35)) return 'warning';
    if (s === 'WARNING' || (ammonia !== null && ammonia > 25)) return 'warning';
    return 'success';
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontWeight: 'bold' }}>
            INSPECTION TAGS & TELEMETRY
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowMap(!showMap)}>
              <IonIcon icon={mapOutline} slot="start" />
              {showMap ? 'HIDE MAP' : 'SHOW MAP'}
            </IonButton>
            <IonButton onClick={() => setRealtimeEnabled(!realtimeEnabled)}>
              {realtimeEnabled ? 'LIVE SYNC' : 'PAUSED'}
            </IonButton>
            <IonButton onClick={() => triggerSync(fetchTags)}>
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>

        <IonToolbar style={{ '--background': '#f8fafc' }}>
          <IonSearchbar
            placeholder="SEARCH TAGS, SITES, DEVICES, SCHEDULES..."
            value={searchTerm}
            onIonInput={(e) => setSearchTerm(e.detail.value || '')}
            animated
          />
        </IonToolbar>

        {/* Filter Controls */}
        <IonToolbar style={{ '--background': '#ffffff' }}>
          <IonGrid style={{ padding: '0 8px' }}>
            <IonRow>
              <IonCol size="12" size-md="4">
                <IonSelect
                  value={siteFilter}
                  placeholder="FILTER BY SITE"
                  onIonChange={(e) => setSiteFilter(e.detail.value)}
                  interface="popover"
                >
                  <IonSelectOption value="all">ALL INSPECTION SITES</IonSelectOption>
                  {sites.map((s) => (
                    <IonSelectOption key={s.id} value={s.id.toString()}>
                      {s.site_name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonCol>

              <IonCol size="6" size-md="4">
                <IonSelect
                  value={deviceFilter}
                  placeholder="FILTER BY DEVICE"
                  onIonChange={(e) => setDeviceFilter(e.detail.value)}
                  interface="popover"
                >
                  <IonSelectOption value="all">ALL DEVICES</IonSelectOption>
                  {devices.map((d) => (
                    <IonSelectOption key={d.device_uid} value={d.device_uid}>
                      {d.device_uid}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonCol>

              <IonCol size="6" size-md="4">
                <IonSelect
                  value={statusFilter}
                  placeholder="STATUS"
                  onIonChange={(e) => setStatusFilter(e.detail.value)}
                  interface="popover"
                >
                  <IonSelectOption value="all">ALL STATUSES</IonSelectOption>
                  <IonSelectOption value="NORMAL">NORMAL (&lt;=25 PPM)</IonSelectOption>
                  <IonSelectOption value="WARNING">WARNING (25-35 PPM)</IonSelectOption>
                  <IonSelectOption value="HIGH">HIGH (35-50 PPM)</IonSelectOption>
                  <IonSelectOption value="CRITICAL">CRITICAL (&gt;50 PPM)</IonSelectOption>
                </IonSelect>
              </IonCol>
            </IonRow>
          </IonGrid>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f1f5f9' }}>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {/* Spatial Map Display */}
        {showMap && (
          <IonCard style={{ margin: '0 0 20px 0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <IonCardHeader style={{ padding: '14px 16px 8px 16px', background: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
              <IonCardTitle style={{ fontSize: '16px', fontWeight: 'bold', color: '#1a365d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={mapOutline} style={{ color: '#2d7d46' }} />
                Spatial Inspection Map & Tag Pins ({mapMarkers.length} Mapped Locations)
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent style={{ padding: '12px 16px 16px 16px', background: '#ffffff' }}>
              <SpatialPolygonMap
                centerLat={activeSiteObj?.current_latitude ?? 8.3697}
                centerLng={activeSiteObj?.current_longitude ?? 124.8640}
                siteName={activeSiteObj?.site_name || 'All MENRO Inspection Sites'}
                sites={sites.map(s => ({
                  id: s.id,
                  site_name: s.site_name,
                  latitude: s.current_latitude || 8.3697,
                  longitude: s.current_longitude || 124.8640,
                  site_type: s.site_type,
                  area_size_hectares: s.area_size_hectares,
                }))}
                readings={mapMarkers}
                height="400px"
              />
            </IonCardContent>
          </IonCard>
        )}

        {/* Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1a365d' }}>
            Logged Inspection Tags ({filteredTags.length})
          </h3>
          {(siteFilter !== 'all' || deviceFilter !== 'all' || statusFilter !== 'all') && (
            <IonButton
              size="small"
              fill="clear"
              color="danger"
              onClick={() => { setSiteFilter('all'); setDeviceFilter('all'); setStatusFilter('all'); setSearchTerm(''); }}
            >
              Clear Filters
            </IonButton>
          )}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : filteredTags.length === 0 ? (
          <EmptyState
            title="NO INSPECTION TAGS FOUND"
            message={searchTerm || siteFilter !== 'all' ? 'TRY ADJUSTING YOUR FILTERS' : 'WAITING FOR INSPECTION TAGS FROM MOBILE APP'}
          />
        ) : (
          <IonGrid style={{ padding: 0 }}>
            <IonRow>
              {filteredTags.map((t) => {
                const badgeColor = getStatusBadgeColor(t.status, t.ammonia);

                return (
                  <IonCol key={t.tag_id} size="12" size-md="6" size-lg="4">
                    <IonCard style={{ height: '100%', margin: 0, borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <IonCardContent style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <h4 style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: 'bold', color: '#1a365d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <IonIcon icon={pricetagOutline} style={{ color: '#0891b2' }} />
                              {t.tag_name}
                            </h4>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              {t.site_name ? `${t.site_name} (${t.site_code})` : 'Unassigned Site'}
                            </span>
                          </div>

                          <IonBadge color={badgeColor} style={{ fontSize: '13px', padding: '6px 10px' }}>
                            NH₃: {t.ammonia?.toFixed(1) || '0'} PPM
                          </IonBadge>
                        </div>

                        {/* Photo Thumbnail */}
                        {(t.photo_url || t.photo_thumbnail_url) && (
                          <div
                            style={{
                              position: 'relative',
                              width: '100%',
                              height: '140px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              marginBottom: '12px',
                              cursor: 'pointer',
                              backgroundColor: '#0f172a'
                            }}
                            onClick={() => {
                              setSelectedPhoto(t);
                              setShowPhotoModal(true);
                            }}
                          >
                            <img
                              src={t.photo_thumbnail_url || t.photo_url || ''}
                              alt={t.tag_name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: 'rgba(26, 54, 93, 0.85)',
                              backdropFilter: 'blur(4px)',
                              padding: '4px 8px',
                              color: '#ffffff',
                              fontSize: '11px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <IonIcon icon={imageOutline} /> View Stamped Photo EXIF
                            </div>
                          </div>
                        )}

                        <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {t.schedule_name && (
                            <div>
                              <IonIcon icon={calendarOutline} style={{ marginRight: '6px', color: '#2563eb' }} />
                              <b>Schedule:</b> {t.schedule_name}
                            </div>
                          )}

                          {t.device_uid && (
                            <div>
                              <IonIcon icon={hardwareChipOutline} style={{ marginRight: '6px', color: '#1a365d' }} />
                              <b>Device:</b> {t.device_uid} {t.device_name ? `(${t.device_name})` : ''}
                            </div>
                          )}

                          {t.latitude && t.longitude && (
                            <div>
                              <IonIcon icon={locationOutline} style={{ marginRight: '6px', color: '#2d7d46' }} />
                              <b>GPS:</b> {t.latitude.toFixed(5)}°, {t.longitude.toFixed(5)}°
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '12px' }}>
                            {t.temperature !== null && t.temperature !== undefined && (
                              <span>
                                <IonIcon icon={thermometerOutline} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                                {t.temperature.toFixed(1)}°C
                              </span>
                            )}
                            {t.humidity !== null && t.humidity !== undefined && (
                              <span>Hum: {t.humidity.toFixed(0)}%</span>
                            )}
                            {t.battery !== null && t.battery !== undefined && (
                              <span>
                                <IonIcon icon={batteryChargingOutline} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                                {t.battery.toFixed(0)}%
                              </span>
                            )}
                          </div>

                          {t.notes && (
                            <div style={{ fontStyle: 'italic', color: '#64748b' }}>
                              <b>Notes:</b> {t.notes}
                            </div>
                          )}

                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                            Recorded: {new Date(t.created_at).toLocaleString()}
                          </div>
                        </div>
                      </IonCardContent>

                      {(t.photo_url || t.photo_thumbnail_url) && (
                        <div style={{ padding: '0 16px 14px 16px' }}>
                          <IonButton
                            expand="block"
                            fill="outline"
                            size="small"
                            style={{ '--color': '#1a365d', '--border-color': '#1a365d' }}
                            onClick={() => {
                              setSelectedPhoto(t);
                              setShowPhotoModal(true);
                            }}
                          >
                            <IonIcon icon={eyeOutline} slot="start" /> View Photo & Metadata
                          </IonButton>
                        </div>
                      )}
                    </IonCard>
                  </IonCol>
                );
              })}
            </IonRow>
          </IonGrid>
        )}

        {/* Stamped Photo Modal */}
        <IonModal isOpen={showPhotoModal} onDidDismiss={() => setShowPhotoModal(false)}>
          <IonHeader>
            <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
              <IonTitle style={{ fontSize: '16px', fontWeight: 'bold' }}>
                Inspection Stamped Photo & Metadata
              </IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowPhotoModal(false)}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            {selectedPhoto && (
              <div style={{ maxWidth: '650px', margin: '0 auto' }}>
                <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#0f172a', marginBottom: '16px', border: '1px solid #cbd5e1' }}>
                  <img
                    src={selectedPhoto.photo_url || selectedPhoto.photo_thumbnail_url || ''}
                    alt={selectedPhoto.tag_name}
                    style={{ width: '100%', maxHeight: '450px', objectFit: 'contain' }}
                  />
                </div>

                <IonCard style={{ margin: '0 0 16px 0', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <IonCardContent>
                    <h4 style={{ margin: '0 0 12px 0', fontWeight: 'bold', color: '#1a365d' }}>
                      {selectedPhoto.tag_name} Inspection Details
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', color: '#334155' }}>
                      <div><b>Ammonia Level:</b> {selectedPhoto.ammonia?.toFixed(1)} PPM</div>
                      <div><b>Status:</b> {selectedPhoto.status || 'NORMAL'}</div>
                      <div><b>Inspection Site:</b> {selectedPhoto.site_name || 'N/A'}</div>
                      <div><b>Schedule:</b> {selectedPhoto.schedule_name || 'N/A'}</div>
                      <div><b>Latitude:</b> {selectedPhoto.latitude?.toFixed(6) || 'N/A'}</div>
                      <div><b>Longitude:</b> {selectedPhoto.longitude?.toFixed(6) || 'N/A'}</div>
                      <div><b>Device UID:</b> {selectedPhoto.device_uid || 'N/A'}</div>
                      <div><b>Captured At:</b> {new Date(selectedPhoto.created_at).toLocaleString()}</div>
                    </div>
                  </IonCardContent>
                </IonCard>
              </div>
            )}
          </IonContent>
        </IonModal>

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