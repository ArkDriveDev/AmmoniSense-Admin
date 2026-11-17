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
  IonToast
} from '@ionic/react';
import {
  businessOutline,
  hardwareChipOutline,
  alertCircleOutline,
  refreshOutline,
  mapOutline,
  shieldCheckmarkOutline,
  homeOutline,
  constructOutline,
  swapHorizontalOutline,
  eggOutline,
  nutritionOutline,
  heartOutline,
  ribbonOutline
} from 'ionicons/icons';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useSiteAnalytics, SiteAnalyticsData } from '../hooks/useSiteAnalytics';
import { useDashboardSummaryCounts } from '../hooks/useDashboardSummaryCounts';
import { StatsCard } from '../components/charts';
import SpatialPolygonMap, { SensorReadingMarker } from '../components/map/SpatialPolygonMap';
import { SiteDetailModal } from '../components/admin/SiteDetailModal';
import { supabase } from '../services/supabase';
import useSyncFeedback from '../hooks/useSyncFeedback';

export default function Dashboard() {
  const history = useHistory();
  const { sites, globalStats, loading, refresh } = useSiteAnalytics();
  const summaryCounts = useDashboardSummaryCounts();
  const { syncToast, triggerSync, dismissSyncToast } = useSyncFeedback();

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
          <IonButton slot="end" fill="clear" onClick={() => triggerSync(async () => { await refresh(); await fetchMapReadings(); await summaryCounts.refresh(); })} style={{ '--color': '#ffffff' }}>
            <IonIcon icon={refreshOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f1f5f9' }}>
        <IonRefresher slot="fixed" onIonRefresh={(e) => { handleRefresh(e); triggerSync(async () => { await refresh(); await fetchMapReadings(); await summaryCounts.refresh(); }); }}>
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

          {/* Summary Section: Clean Air (<5 PPM), Poultry by Type, Chicken by Type */}
          <IonRow style={{ marginTop: '8px' }}>
            {/* Sites with clean air / low ppm (< 5 ppm) */}
            <IonCol size="12" size-sm="6" size-md="3">
              <StatsCard
                title="Sites with Clean Air (<5 PPM)"
                value={summaryCounts.cleanAirCount}
                icon={shieldCheckmarkOutline}
                color="success"
                subtitle="Active sites, latest inspection"
              />
            </IonCol>

            {/* Poultry Housing: Conventional */}
            <IonCol size="4" size-sm="2" size-md="3">
              <StatsCard
                title="Conventional"
                value={summaryCounts.poultryCounts.conventional}
                icon={homeOutline}
                color="primary"
                subtitle="Poultry Type"
              />
            </IonCol>

            {/* Poultry Housing: Retrofitted */}
            <IonCol size="4" size-sm="2" size-md="3">
              <StatsCard
                title="Retrofitted"
                value={summaryCounts.poultryCounts.retrofitted}
                icon={constructOutline}
                color="primary"
                subtitle="Poultry Type"
              />
            </IonCol>

            {/* Poultry Housing: Tunnel Vent */}
            <IonCol size="4" size-sm="2" size-md="3">
              <StatsCard
                title="Tunnel Vent"
                value={summaryCounts.poultryCounts.tunnelVent}
                icon={swapHorizontalOutline}
                color="primary"
                subtitle="Poultry Type"
              />
            </IonCol>

            {/* Chicken: Layer */}
            <IonCol size="6" size-sm="3" size-md="3">
              <StatsCard
                title="Layer"
                value={summaryCounts.chickenCounts.layer}
                icon={eggOutline}
                color="tertiary"
                subtitle="Chicken Type"
              />
            </IonCol>

            {/* Chicken: Broiler */}
            <IonCol size="6" size-sm="3" size-md="3">
              <StatsCard
                title="Broiler"
                value={summaryCounts.chickenCounts.broiler}
                icon={nutritionOutline}
                color="tertiary"
                subtitle="Chicken Type"
              />
            </IonCol>

            {/* Chicken: Breeder */}
            <IonCol size="6" size-sm="3" size-md="3">
              <StatsCard
                title="Breeder"
                value={summaryCounts.chickenCounts.breeder}
                icon={heartOutline}
                color="tertiary"
                subtitle="Chicken Type"
              />
            </IonCol>

            {/* Chicken: Grand Parents / GP */}
            <IonCol size="6" size-sm="3" size-md="3">
              <StatsCard
                title="Grand Parents (GP)"
                value={summaryCounts.chickenCounts.grandParents}
                icon={ribbonOutline}
                color="tertiary"
                subtitle="Chicken Type"
              />
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
