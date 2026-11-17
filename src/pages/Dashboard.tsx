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
  const [siteLatestScheduleAvgMap, setSiteLatestScheduleAvgMap] = useState<Record<number, number | null>>({});
  const [showGlobalMap, setShowGlobalMap] = useState<boolean>(false);
  const [selectedSiteForModal, setSelectedSiteForModal] = useState<SiteAnalyticsData | null>(null);
  const [showSiteDetailModal, setShowSiteDetailModal] = useState<boolean>(false);

  const fetchMapReadings = useCallback(async () => {
    try {
      // 1. Fetch inspection tags with coordinates and associated schedule/site
      const { data: tagsData } = await supabase
        .from('inspection_tags')
        .select(`
          *,
          inspection_schedules (
            id,
            schedule_name,
            scheduled_date,
            inspection_sites (
              id,
              site_name
            )
          )
        `)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(60);

      if (tagsData && tagsData.length > 0) {
        const tagIds = tagsData.map((d: any) => d.id).filter(Boolean);
        const tagPpmMap: Record<number, { sum: number; count: number }> = {};

        // 2. Query sensor_data for average ppm per tag
        if (tagIds.length > 0) {
          try {
            const { data: sensorRows } = await supabase
              .from('sensor_data')
              .select('inspection_tag_id, ammonia')
              .in('inspection_tag_id', tagIds)
              .not('ammonia', 'is', null);

            if (sensorRows && sensorRows.length > 0) {
              sensorRows.forEach((r: any) => {
                if (r.inspection_tag_id && r.ammonia !== null && r.ammonia !== undefined) {
                  const val = Number(r.ammonia);
                  if (!tagPpmMap[r.inspection_tag_id]) {
                    tagPpmMap[r.inspection_tag_id] = { sum: 0, count: 0 };
                  }
                  tagPpmMap[r.inspection_tag_id].sum += val;
                  tagPpmMap[r.inspection_tag_id].count += 1;
                }
              });
            }
          } catch (sErr) {
            console.warn('Could not query sensor_data for average ppm:', sErr);
          }
        }

        setMapReadings(tagsData.map((d: any) => {
          const stats = tagPpmMap[d.id];
          const hasSensorData = stats && stats.count > 0;
          const avgAmmonia = hasSensorData
            ? stats.sum / stats.count
            : (d.ammonia !== null && d.ammonia !== undefined ? Number(d.ammonia) : null);
          const readingCount = hasSensorData
            ? stats.count
            : (d.ammonia !== null && d.ammonia !== undefined ? 1 : 0);

          const schedObj = Array.isArray(d.inspection_schedules) ? d.inspection_schedules[0] : d.inspection_schedules;
          const siteObj = schedObj?.inspection_sites
            ? (Array.isArray(schedObj.inspection_sites) ? schedObj.inspection_sites[0] : schedObj.inspection_sites)
            : null;

          return {
            id: d.id,
            latitude: d.latitude,
            longitude: d.longitude,
            ammonia: avgAmmonia,
            avg_ammonia: avgAmmonia,
            reading_count: readingCount,
            device_uid: d.device_uid || d.tag_name,
            created_at: d.created_at,
            photo_url: d.photo_thumbnail_url || d.photo_url || undefined,
            status: d.status,
            site_name: siteObj?.site_name || d.site_name,
            notes: d.notes,
            inspection_schedule_id: d.inspection_schedule_id,
            scheduled_date: schedObj?.scheduled_date || null,
            schedule_name: schedObj?.schedule_name || null,
          };
        }));
      } else {
        setMapReadings([]);
      }
    } catch (err) {
      console.error('Error fetching map readings:', err);
    }
  }, []);

  const fetchSiteLatestAverages = useCallback(async (siteList: SiteAnalyticsData[]) => {
    if (!siteList || siteList.length === 0) return;
    try {
      const siteIds = siteList.map(s => s.id);
      const { data: schedules, error: schedErr } = await supabase
        .from('inspection_schedules')
        .select('id, inspection_site_id, scheduled_date')
        .in('inspection_site_id', siteIds)
        .order('scheduled_date', { ascending: false });

      if (schedErr || !schedules) return;

      const latestScheduleMap = new Map<number, number>();
      schedules.forEach((sc) => {
        if (!latestScheduleMap.has(sc.inspection_site_id)) {
          latestScheduleMap.set(sc.inspection_site_id, sc.id);
        }
      });

      const latestScheduleIds = Array.from(new Set(latestScheduleMap.values()));
      if (latestScheduleIds.length === 0) return;

      const schedToSite = new Map<number, number>();
      latestScheduleMap.forEach((schedId, siteId) => {
        schedToSite.set(schedId, siteId);
      });

      const { data: schedTags, error: tagsErr } = await supabase
        .from('inspection_tags')
        .select('id, inspection_schedule_id')
        .in('inspection_schedule_id', latestScheduleIds);

      if (tagsErr || !schedTags || schedTags.length === 0) return;

      const schedTagIds = schedTags.map(t => t.id);
      const tagToSite = new Map<number, number>();
      schedTags.forEach(t => {
        if (t.inspection_schedule_id) {
          const siteId = schedToSite.get(t.inspection_schedule_id);
          if (siteId) tagToSite.set(t.id, siteId);
        }
      });

      const { data: sensorRows, error: sensorErr } = await supabase
        .from('sensor_data')
        .select('inspection_tag_id, ammonia')
        .in('inspection_tag_id', schedTagIds)
        .not('ammonia', 'is', null);

      if (sensorErr || !sensorRows) return;

      const siteAgg: Record<number, { sum: number; count: number }> = {};
      sensorRows.forEach((r: any) => {
        const siteId = tagToSite.get(r.inspection_tag_id);
        if (siteId && r.ammonia !== null && r.ammonia !== undefined) {
          if (!siteAgg[siteId]) siteAgg[siteId] = { sum: 0, count: 0 };
          siteAgg[siteId].sum += Number(r.ammonia);
          siteAgg[siteId].count += 1;
        }
      });

      const resultMap: Record<number, number | null> = {};
      latestScheduleMap.forEach((_schedId, siteId) => {
        const agg = siteAgg[siteId];
        resultMap[siteId] = agg && agg.count > 0 ? agg.sum / agg.count : null;
      });

      setSiteLatestScheduleAvgMap(resultMap);
    } catch (err) {
      console.warn('Could not compute site latest schedule averages:', err);
    }
  }, []);

  useEffect(() => {
    fetchMapReadings();
  }, [fetchMapReadings]);

  useEffect(() => {
    if (sites.length > 0) {
      fetchSiteLatestAverages(sites);
    }
  }, [sites, fetchSiteLatestAverages]);

  const handleRefresh = async (event: CustomEvent) => {
    await refresh();
    await fetchMapReadings();
    if (sites.length > 0) await fetchSiteLatestAverages(sites);
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
          <IonButton slot="end" fill="clear" onClick={() => triggerSync(async () => { await refresh(); await fetchMapReadings(); await fetchSiteLatestAverages(sites); await summaryCounts.refresh(); })} style={{ '--color': '#ffffff' }}>
            <IonIcon icon={refreshOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f1f5f9' }}>
        <IonRefresher slot="fixed" onIonRefresh={(e) => { handleRefresh(e); triggerSync(async () => { await refresh(); await fetchMapReadings(); await fetchSiteLatestAverages(sites); await summaryCounts.refresh(); }); }}>
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
                      avg_ammonia_latest_schedule: siteLatestScheduleAvgMap[s.id] ?? null,
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
