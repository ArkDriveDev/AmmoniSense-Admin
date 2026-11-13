import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonGrid,
  IonRow,
  IonCol,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonIcon,
  IonButton,
  IonCard,
  IonCardContent,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonToast
} from '@ionic/react';
import {
  businessOutline,
  hardwareChipOutline,
  alertCircleOutline,
  refreshOutline,
  funnelOutline,
  swapVerticalOutline,
  mapOutline,
  searchOutline,
  calendarOutline
} from 'ionicons/icons';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useSiteAnalytics, SiteAnalyticsData } from '../hooks/useSiteAnalytics';
import { StatsCard } from '../components/charts';
import SiteAnalyticsCard from '../components/dashboard/SiteAnalyticsCard';
import SpatialPolygonMap, { SensorReadingMarker } from '../components/map/SpatialPolygonMap';
import { SiteDetailModal } from '../components/admin/SiteDetailModal';
import { supabase } from '../services/supabase';
import useSyncFeedback from '../hooks/useSyncFeedback';

export default function Dashboard() {
  const history = useHistory();
  const { sites, globalStats, loading, refresh } = useSiteAnalytics();
  const { syncToast, triggerSync, dismissSyncToast } = useSyncFeedback();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'last_reading' | 'site_name' | 'alert_level'>('last_reading');

  const [mapReadings, setMapReadings] = useState<SensorReadingMarker[]>([]);
  const [showGlobalMap, setShowGlobalMap] = useState<boolean>(false);
  const [selectedSiteForModal, setSelectedSiteForModal] = useState<SiteAnalyticsData | null>(null);
  const [showSiteDetailModal, setShowSiteDetailModal] = useState<boolean>(false);

  const fetchMapReadings = useCallback(async () => {
    try {
      // 1. Fetch inspection tags with coordinates
      const { data: tagsData } = await supabase
        .from('inspection_tags')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(60);

      if (tagsData && tagsData.length > 0) {
        const tagIds = tagsData.map((d) => d.id).filter(Boolean);
        let maxPpmMap: Record<number, number> = {};

        // 2. Query sensor_data for highest peak ppm per tag
        if (tagIds.length > 0) {
          try {
            const { data: sensorRows } = await supabase
              .from('sensor_data')
              .select('inspection_tag_id, ammonia')
              .in('inspection_tag_id', tagIds);

            if (sensorRows && sensorRows.length > 0) {
              sensorRows.forEach((r) => {
                if (r.inspection_tag_id && r.ammonia !== null && r.ammonia !== undefined) {
                  const val = Number(r.ammonia);
                  maxPpmMap[r.inspection_tag_id] = Math.max(maxPpmMap[r.inspection_tag_id] ?? 0, val);
                }
              });
            }
          } catch (sErr) {
            console.warn('Could not query sensor_data for highest ppm:', sErr);
          }
        }

        setMapReadings(tagsData.map((d) => {
          const sensorMax = maxPpmMap[d.id];
          const tagAmmonia = d.ammonia !== null && d.ammonia !== undefined ? Number(d.ammonia) : 0;
          const highestAmmonia = Math.max(sensorMax !== undefined ? sensorMax : 0, tagAmmonia);

          return {
            id: d.id,
            latitude: d.latitude,
            longitude: d.longitude,
            ammonia: highestAmmonia,
            device_uid: d.device_uid || d.tag_name,
            created_at: d.created_at,
            photo_url: d.photo_thumbnail_url || d.photo_url || undefined,
            status: d.status
          };
        }));
      } else {
        setMapReadings([]);
      }
    } catch (err) {
      console.error('Error fetching map readings:', err);
    }
  }, []);

  useEffect(() => {
    fetchMapReadings();
  }, [fetchMapReadings]);

  const handleRefresh = async (event: CustomEvent) => {
    await refresh();
    await fetchMapReadings();
    event.detail.complete();
  };

  const filteredAndSortedSites = useMemo(() => {
    let result = [...sites];
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter((s) =>
        s.site_name.toLowerCase().includes(term) ||
        (s.site_code && s.site_code.toLowerCase().includes(term)) ||
        s.site_type.toLowerCase().includes(term) ||
        s.address.toLowerCase().includes(term)
      );
    }
    if (selectedType !== 'all') {
      result = result.filter((s) => s.site_type.toLowerCase() === selectedType.toLowerCase());
    }
    if (selectedStatus !== 'all') {
      result = result.filter((s) => s.alert_status === selectedStatus);
    }

    result.sort((a, b) => {
      if (sortBy === 'site_name') {
        return a.site_name.localeCompare(b.site_name);
      }
      if (sortBy === 'alert_level') {
        const priority = { critical: 4, high: 3, warning: 2, normal: 1 };
        return priority[b.alert_status] - priority[a.alert_status];
      }
      const timeA = a.last_reading_at ? new Date(a.last_reading_at).getTime() : 0;
      const timeB = b.last_reading_at ? new Date(b.last_reading_at).getTime() : 0;
      return timeB - timeA;
    });

    return result;
  }, [sites, searchTerm, selectedType, selectedStatus, sortBy]);

  if (loading && sites.length === 0) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <IonSpinner name="crescent" style={{ width: '48px', height: '48px', color: '#1a365d' }} />
            <p style={{ marginTop: '16px', color: '#64748b', fontSize: '14px' }}>Loading MENRO environmental sites...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontWeight: 'bold' }}>MENRO SITES MONITORING DASHBOARD</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => triggerSync(async () => { await refresh(); await fetchMapReadings(); })} style={{ '--color': '#ffffff' }}>
            <IonIcon icon={refreshOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f1f5f9' }}>
        <IonRefresher slot="fixed" onIonRefresh={(e) => { handleRefresh(e); triggerSync(async () => { await refresh(); await fetchMapReadings(); }); }}>
          <IonRefresherContent />
        </IonRefresher>

        <IonGrid style={{ padding: 0 }}>
          {/* Top 4 KPI Metrics */}
          <IonRow>
            <IonCol size="12" size-sm="6" size-md="3">
              <StatsCard title="Total Monitored Sites" value={globalStats.totalSites} icon={businessOutline} color="primary" />
            </IonCol>
            <IonCol size="12" size-sm="6" size-md="3">
              <StatsCard title="Active Hardware Devices" value={globalStats.activeDevices} icon={hardwareChipOutline} color="success" />
            </IonCol>
            <IonCol size="12" size-sm="6" size-md="3">
              <StatsCard title="Sites With NH₃ Warnings" value={globalStats.sitesWithAlerts} icon={alertCircleOutline} color="warning" />
            </IonCol>
            <IonCol size="12" size-sm="6" size-md="3">
              <StatsCard title="Critical NH₃ Exceedances" value={globalStats.criticalAlerts} icon={alertCircleOutline} color="danger" />
            </IonCol>
          </IonRow>

          {/* Environmental Compliance Overview Card */}
          <IonRow style={{ marginTop: '12px' }}>
            <IonCol size="12">
              <IonCard style={{ margin: 0, borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', backgroundColor: '#ffffff' }}>
                <IonCardContent style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#1a365d' }}>
                        Municipality of Manolo Fortich &bull; MENRO Air Quality Surveillance
                      </h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                        Continuous agricultural and industrial ammonia telemetry monitoring pursuant to municipal environmental code.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#059669', backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: '16px', fontWeight: '700' }}>
                        Live Telemetry Online
                      </span>
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Spatial Polygon Map Toggle */}
          <IonRow style={{ margin: '8px 0 16px 0' }}>
            <IonCol size="12">
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <IonIcon icon={mapOutline} style={{ fontSize: '22px', color: '#1a365d' }} />
                  <div>
                    <strong style={{ color: '#1a365d', fontSize: '14px' }}>Live Environmental Odor & Plume Spatial Map</strong>
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Spatial overview with dynamic odor buffer perimeters across Manolo Fortich</span>
                  </div>
                </div>
                <IonButton size="small" fill="outline" color="primary" onClick={() => setShowGlobalMap(!showGlobalMap)}>
                  {showGlobalMap ? 'Hide Map' : 'Show Map'}
                </IonButton>
              </div>
              {showGlobalMap && (
                <div style={{ marginTop: '12px' }}>
                  <SpatialPolygonMap
                    siteName="MENRO Manolo Fortich Environmental Spatial Overview"
                    sites={sites.map(s => ({
                      id: s.id,
                      site_name: s.site_name,
                      latitude: s.latitude,
                      longitude: s.longitude,
                      site_type: s.site_type,
                      latest_ammonia: s.latest_ammonia,
                      highest_ammonia: s.highest_ammonia ?? s.max_ammonia ?? s.latest_ammonia,
                      alert_status: s.alert_status,
                      area_size_hectares: s.area_size_hectares
                    }))}
                    readings={mapReadings}
                    onSelectSite={(siteId) => {
                      const targetSite = sites.find(s => s.id === Number(siteId) || String(s.id) === String(siteId));
                      if (targetSite) {
                        setSelectedSiteForModal(targetSite);
                        setShowSiteDetailModal(true);
                      }
                    }}
                    height="380px"
                  />
                </div>
              )}
            </IonCol>
          </IonRow>

          {/* Search and Filters Bar */}
          <IonRow style={{ margin: '16px 0' }}>
            <IonCol size="12">
              <IonCard style={{ margin: 0, borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                <IonCardContent style={{ padding: '16px' }}>
                  <IonGrid style={{ padding: 0 }}>
                    <IonRow className="ion-align-items-center">
                      <IonCol size="12" size-md="4">
                        <IonSearchbar
                          value={searchTerm}
                          onIonInput={(e) => setSearchTerm(e.detail.value || '')}
                          placeholder="Search site name, code, address..."
                          style={{ padding: 0, '--background': '#f8fafc' }}
                        />
                      </IonCol>
                      <IonCol size="6" size-sm="4" size-md="2.5">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f8fafc', padding: '4px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                          <IonIcon icon={funnelOutline} style={{ color: '#64748b' }} />
                          <IonSelect value={selectedType} onIonChange={(e) => setSelectedType(e.detail.value)} interface="popover" style={{ width: '100%', fontSize: '13px' }}>
                            <IonSelectOption value="all">Type: All Sites</IonSelectOption>
                            <IonSelectOption value="piggery">Piggery</IonSelectOption>
                            <IonSelectOption value="poultry">Poultry</IonSelectOption>
                            <IonSelectOption value="industrial">Industrial</IonSelectOption>
                            <IonSelectOption value="ambient">Ambient</IonSelectOption>
                          </IonSelect>
                        </div>
                      </IonCol>
                      <IonCol size="6" size-sm="4" size-md="2.5">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f8fafc', padding: '4px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                          <IonIcon icon={alertCircleOutline} style={{ color: '#64748b' }} />
                          <IonSelect value={selectedStatus} onIonChange={(e) => setSelectedStatus(e.detail.value)} interface="popover" style={{ width: '100%', fontSize: '13px' }}>
                            <IonSelectOption value="all">Status: All Levels</IonSelectOption>
                            <IonSelectOption value="normal">Normal (&lt;=25 PPM)</IonSelectOption>
                            <IonSelectOption value="warning">Warning (25-35 PPM)</IonSelectOption>
                            <IonSelectOption value="high">High (35-50 PPM)</IonSelectOption>
                            <IonSelectOption value="critical">Critical (&gt;50 PPM)</IonSelectOption>
                          </IonSelect>
                        </div>
                      </IonCol>
                      <IonCol size="12" size-sm="4" size-md="3">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f8fafc', padding: '4px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                          <IonIcon icon={swapVerticalOutline} style={{ color: '#64748b' }} />
                          <IonSelect value={sortBy} onIonChange={(e) => setSortBy(e.detail.value)} interface="popover" style={{ width: '100%', fontSize: '13px' }}>
                            <IonSelectOption value="last_reading">Sort: Latest Reading</IonSelectOption>
                            <IonSelectOption value="site_name">Sort: Site Name (A-Z)</IonSelectOption>
                            <IonSelectOption value="alert_level">Sort: Alert Severity</IonSelectOption>
                          </IonSelect>
                        </div>
                      </IonCol>
                    </IonRow>
                  </IonGrid>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Inspection Site Analytics List */}
          <IonRow>
            <IonCol size="12">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a365d', margin: 0 }}>
                  Inspection Sites Analytics ({filteredAndSortedSites.length})
                </h3>
              </div>

              {filteredAndSortedSites.length === 0 ? (
                <IonCard style={{ borderRadius: '12px', margin: 0, padding: '32px', textAlign: 'center' }}>
                  <IonIcon icon={searchOutline} style={{ fontSize: '42px', color: '#94a3b8' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#334155' }}>No Inspection Sites Found</h3>
                </IonCard>
              ) : (
                filteredAndSortedSites.map((site: SiteAnalyticsData) => (
                  <SiteAnalyticsCard key={site.id} site={site} />
                ))
              )}
            </IonCol>
          </IonRow>
        </IonGrid>

        <SiteDetailModal
          isOpen={showSiteDetailModal}
          onClose={() => {
            setShowSiteDetailModal(false);
            setSelectedSiteForModal(null);
          }}
          site={selectedSiteForModal}
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
