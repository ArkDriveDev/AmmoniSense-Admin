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
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
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
  IonChip,
  IonModal
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { refreshOutline, mapOutline, eyeOutline, locationOutline, hardwareChipOutline, imageOutline, calendarOutline } from 'ionicons/icons';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import SiteGridMap, { SensorReadingMarker } from '../components/map/SiteGridMap';

export default function SensorData() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState<string | number>('all');
  const [cellFilter, setCellFilter] = useState('all');
  const [showMap, setShowMap] = useState(true);

  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  useEffect(() => {
    fetchSites();
    fetchDevices();
    fetchLogs();
    
    if (realtimeEnabled) {
      const subscription = supabase
        .channel('sensor_data_channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'sensor_data'
          },
          (payload) => {
            setLogs(prev => [payload.new, ...prev]);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [realtimeEnabled]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, deviceFilter, siteFilter, cellFilter]);

  const fetchSites = async () => {
    try {
      const { data } = await supabase.from('monitoring_sites').select('*').order('site_name');
      setSites(data || []);
    } catch (err) {
      console.error('Error fetching monitoring sites:', err);
    }
  };

  const fetchDevices = async () => {
    try {
      const { data } = await supabase
        .from('devices')
        .select('device_uid, site_id')
        .order('device_uid');
      setDevices(data || []);
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sensor_data')
        .select(`
          *,
          devices (
            device_uid,
            site_id,
            monitoring_sites (
              id,
              site_name,
              current_latitude,
              current_longitude
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('Error fetching sensor data:', error);
        return;
      }

      setLogs(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let result = [...logs];

    if (deviceFilter !== 'all') {
      result = result.filter(l => l.device_uid === deviceFilter);
    }

    if (cellFilter !== 'all') {
      result = result.filter(l => l.grid_cell_id === cellFilter);
    }

    if (siteFilter !== 'all') {
      const selectedSiteId = Number(siteFilter);
      result = result.filter(l => l.devices?.site_id === selectedSiteId);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(l =>
        l.device_uid?.toLowerCase().includes(term) ||
        l.status?.toLowerCase().includes(term) ||
        l.grid_cell_id?.toLowerCase().includes(term) ||
        l.ammonia?.toString().includes(term)
      );
    }

    setFilteredLogs(result);
  };

  const handleRefresh = async (event: CustomEvent) => {
    await fetchLogs();
    event.detail.complete();
  };

  // Convert sensor records into Leaflet map markers
  const mapMarkers: SensorReadingMarker[] = filteredLogs
    .filter(l => l.latitude && l.longitude)
    .map(l => ({
      id: l.id,
      latitude: l.latitude,
      longitude: l.longitude,
      ammonia: l.ammonia || 0,
      grid_cell_id: l.grid_cell_id || undefined,
      device_uid: l.device_uid,
      created_at: l.created_at || l.submitted_at,
      photo_url: l.photo_url || undefined,
      status: l.status,
    }));

  const activeSiteObj = sites.find(s => s.id === Number(siteFilter));

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontWeight: 'bold', fontSize: '18px' }}>
            MENRO SENSOR DATA & MAP INSPECTOR
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowMap(!showMap)}>
              <IonIcon icon={mapOutline} slot="start" />
              {showMap ? 'HIDE MAP' : 'SHOW MAP'}
            </IonButton>
            <IonButton onClick={() => setRealtimeEnabled(!realtimeEnabled)}>
              {realtimeEnabled ? 'LIVE' : 'PAUSED'}
            </IonButton>
            <IonButton onClick={fetchLogs}>
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>

        <IonToolbar style={{ '--background': '#f8fafc' }}>
          <IonSearchbar
            placeholder="SEARCH SENSOR DATA OR GRID CELL..."
            value={searchTerm}
            onIonChange={(e) => setSearchTerm(e.detail.value || '')}
            animated
          />
        </IonToolbar>

        {/* Filter Bar */}
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
                  <IonSelectOption value="all">ALL MONITORING SITES</IonSelectOption>
                  {sites.map((s) => (
                    <IonSelectOption key={s.id} value={s.id}>
                      {s.site_name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonCol>
              <IonCol size="12" size-md="4">
                <IonSelect
                  value={deviceFilter}
                  placeholder="FILTER BY DEVICE"
                  onIonChange={(e) => setDeviceFilter(e.detail.value)}
                  interface="popover"
                >
                  <IonSelectOption value="all">ALL SENSOR DEVICES</IonSelectOption>
                  {devices.map((d) => (
                    <IonSelectOption key={d.device_uid} value={d.device_uid}>
                      {d.device_uid}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonCol>
              <IonCol size="12" size-md="4">
                <IonSelect
                  value={cellFilter}
                  placeholder="FILTER BY GRID CELL"
                  onIonChange={(e) => setCellFilter(e.detail.value)}
                  interface="popover"
                >
                  <IonSelectOption value="all">ALL GRID CELLS</IonSelectOption>
                  {['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3', 'E1', 'E2', 'F1', 'F2'].map((cell) => (
                    <IonSelectOption key={cell} value={cell}>
                      Grid Cell {cell}
                    </IonSelectOption>
                  ))}
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

        {/* Spatial Leaflet Grid Map Overlay */}
        {showMap && (
          <IonCard style={{ margin: '0 0 20px 0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <IonCardHeader style={{ padding: '14px 16px 8px 16px', background: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
              <IonCardTitle style={{ fontSize: '16px', fontWeight: 'bold', color: '#1a365d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={mapOutline} style={{ color: '#2d7d46' }} />
                Spatial Grid Map & Reading Overlays ({mapMarkers.length} Mapped Pins)
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent style={{ padding: '12px 16px 16px 16px', background: '#ffffff' }}>
              <SiteGridMap
                centerLat={activeSiteObj?.current_latitude ?? 14.5995}
                centerLng={activeSiteObj?.current_longitude ?? 120.9842}
                siteName={activeSiteObj?.site_name || 'All MENRO Monitoring Sites'}
                readings={mapMarkers}
                selectedCellId={cellFilter !== 'all' ? cellFilter : ''}
                onSelectCell={(cellId) => setCellFilter(cellId)}
                height="420px"
              />
            </IonCardContent>
          </IonCard>
        )}

        {/* Sensor Logs Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1a365d' }}>
            Inspection Sensor Logs ({filteredLogs.length})
          </h3>
          {(cellFilter !== 'all' || siteFilter !== 'all' || deviceFilter !== 'all') && (
            <IonButton size="small" fill="clear" color="danger" onClick={() => { setCellFilter('all'); setSiteFilter('all'); setDeviceFilter('all'); setSearchTerm(''); }}>
              Clear Filters
            </IonButton>
          )}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            title="NO SENSOR DATA FOUND"
            message={searchTerm || deviceFilter !== 'all' || cellFilter !== 'all' ? 'TRY ADJUSTING YOUR FILTERS' : 'WAITING FOR SENSOR DATA FROM DEVICES'}
          />
        ) : (
          <IonGrid style={{ padding: 0 }}>
            <IonRow>
              {filteredLogs.map((l) => {
                const isDanger = l.ammonia > 50 || l.status === 'critical' || l.status === 'SEVERE';
                const isWarning = (l.ammonia > 25 && l.ammonia <= 50) || l.status === 'warning' || l.status === 'MODERATE';

                return (
                  <IonCol key={l.id} size="12" size-md="6" size-lg="4">
                    <IonCard style={{ height: '100%', margin: 0, borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <IonCardContent style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <IonBadge color={isDanger ? 'danger' : isWarning ? 'warning' : 'success'} style={{ fontSize: '13px', padding: '6px 10px' }}>
                            NH₃: {l.ammonia?.toFixed(1) || '0'} PPM
                          </IonBadge>

                          {l.grid_cell_id && (
                            <IonChip style={{ height: '24px', fontSize: '12px', margin: 0, backgroundColor: '#1a365d', color: '#ffffff' }}>
                              Cell: {l.grid_cell_id}
                            </IonChip>
                          )}
                        </div>

                        {/* Photo thumbnail */}
                        {l.photo_url ? (
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
                              setSelectedPhoto(l);
                              setShowPhotoModal(true);
                            }}
                          >
                            <img
                              src={l.photo_url}
                              alt="Inspection"
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
                              <IonIcon icon={imageOutline} /> View Stamped EXIF Photo
                            </div>
                          </div>
                        ) : null}

                        <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <div>
                            <IonIcon icon={hardwareChipOutline} style={{ marginRight: '6px', color: '#1a365d' }} />
                            <b>Device UID:</b> {l.device_uid || 'N/A'}
                          </div>

                          {l.latitude && l.longitude && (
                            <div>
                              <IonIcon icon={locationOutline} style={{ marginRight: '6px', color: '#2d7d46' }} />
                              <b>GPS:</b> {l.latitude.toFixed(5)}°, {l.longitude.toFixed(5)}°
                            </div>
                          )}

                          {l.temperature && (
                            <div>
                              <b>Temp / Humidity:</b> {l.temperature}°C / {l.humidity || '--'}%
                            </div>
                          )}

                          <div>
                            <IonIcon icon={calendarOutline} style={{ marginRight: '6px', color: '#64748b' }} />
                            <b>Recorded:</b> {new Date(l.created_at || l.submitted_at).toLocaleString()}
                          </div>
                        </div>
                      </IonCardContent>

                      {l.photo_url && (
                        <div style={{ padding: '0 16px 14px 16px' }}>
                          <IonButton
                            expand="block"
                            fill="outline"
                            size="small"
                            style={{ '--color': '#1a365d', '--border-color': '#1a365d' }}
                            onClick={() => {
                              setSelectedPhoto(l);
                              setShowPhotoModal(true);
                            }}
                          >
                            <IonIcon icon={eyeOutline} slot="start" /> View Stamped Photo EXIF
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

        {/* Stamped Photo Modal Viewer */}
        <IonModal isOpen={showPhotoModal} onDidDismiss={() => setShowPhotoModal(false)}>
          <IonHeader>
            <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
              <IonTitle style={{ fontSize: '16px', fontWeight: 'bold' }}>
                Inspection EXIF Photo Details
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
                    src={selectedPhoto.photo_url}
                    alt="Inspection EXIF Stamped"
                    style={{ width: '100%', maxHeight: '450px', objectFit: 'contain' }}
                  />
                </div>

                <IonCard style={{ margin: '0 0 16px 0', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <IonCardContent>
                    <h4 style={{ margin: '0 0 12px 0', fontWeight: 'bold', color: '#1a365d' }}>
                      Embedded EXIF Metadata & Reading Summary
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', color: '#334155' }}>
                      <div><b>Grid Cell ID:</b> {selectedPhoto.grid_cell_id || 'N/A'}</div>
                      <div><b>Ammonia Level:</b> {selectedPhoto.ammonia} PPM</div>
                      <div><b>Latitude:</b> {selectedPhoto.latitude?.toFixed(6) || 'N/A'}</div>
                      <div><b>Longitude:</b> {selectedPhoto.longitude?.toFixed(6) || 'N/A'}</div>
                      <div><b>Captured At:</b> {new Date(selectedPhoto.created_at || selectedPhoto.submitted_at).toLocaleString()}</div>
                      <div><b>Device UID:</b> {selectedPhoto.device_uid}</div>
                    </div>
                  </IonCardContent>
                </IonCard>
              </div>
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
}