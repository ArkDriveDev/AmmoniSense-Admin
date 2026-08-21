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
  IonSelectOption
} from '@ionic/react';
import {
  businessOutline,
  hardwareChipOutline,
  alertCircleOutline,
  warningOutline,
  refreshOutline,
  funnelOutline,
  swapVerticalOutline,
  mapOutline,
  searchOutline
} from 'ionicons/icons';
import { useState, useMemo, useEffect } from 'react';
import { useSiteAnalytics, SiteAnalyticsData } from '../hooks/useSiteAnalytics';
import { StatsCard } from '../components/charts';
import SiteAnalyticsCard from '../components/dashboard/SiteAnalyticsCard';
import SiteGridMap, { SensorReadingMarker } from '../components/map/SiteGridMap';
import { supabase } from '../services/supabase';

export default function Dashboard() {
  const { sites, globalStats, loading, refresh } = useSiteAnalytics();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'last_reading' | 'site_name' | 'alert_level'>('last_reading');

  const [mapReadings, setMapReadings] = useState<SensorReadingMarker[]>([]);
  const [showGlobalMap, setShowGlobalMap] = useState<boolean>(false);

  useEffect(() => {
    fetchMapReadings();
  }, []);

  const fetchMapReadings = async () => {
    try {
      const { data } = await supabase.from('sensor_data').select('*').order('created_at', { ascending: false }).limit(50);
      if (data) {
        setMapReadings(data.filter((d) => d.latitude && d.longitude).map((d) => ({
          id: d.id, latitude: d.latitude, longitude: d.longitude, ammonia: d.ammonia || 0, grid_cell_id: d.grid_cell_id || undefined, device_uid: d.device_uid, created_at: d.created_at || d.submitted_at, status: d.status
        })));
      }
    } catch (err) {
      console.error('Error fetching map readings:', err);
    }
  };

  const handleRefresh = async (event: CustomEvent) => {
    await refresh();
    await fetchMapReadings();
    event.detail.complete();
  };

  const filteredAndSortedSites = useMemo(() => {
    let result = [...sites];
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter((s) => s.site_name.toLowerCase().includes(term) || s.owner_name.toLowerCase().includes(term) || s.site_type.toLowerCase().includes(term) || s.address.toLowerCase().includes(term));
    }
    if (selectedType !== 'all') result = result.filter((s) => s.site_type.toLowerCase() === selectedType.toLowerCase());
    if (selectedStatus !== 'all') result = result.filter((s) => s.alert_status.toLowerCase() === selectedStatus.toLowerCase());

    result.sort((a, b) => {
      if (sortBy === 'site_name') return a.site_name.localeCompare(b.site_name);
      if (sortBy === 'alert_level') {
        const score = { critical: 3, warning: 2, normal: 1 };
        return (score[b.alert_status] || 0) - (score[a.alert_status] || 0);
      }
      return (b.last_reading_at ? new Date(b.last_reading_at).getTime() : 0) - (a.last_reading_at ? new Date(a.last_reading_at).getTime() : 0);
    });
    return result;
  }, [sites, searchTerm, selectedType, selectedStatus, sortBy]);

  if (loading && sites.length === 0) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
            <IonTitle style={{ fontWeight: 'bold' }}>MENRO ADMIN DASHBOARD</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ textAlign: 'center', marginTop: '100px' }}>
            <IonSpinner name="crescent" color="primary" />
            <p style={{ color: '#64748b' }}>Loading Site Analytics...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontWeight: 'bold' }}>MENRO ADMIN DASHBOARD • PER SITE ANALYTICS</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => refresh()} style={{ '--color': '#ffffff' }}>
            <IonIcon icon={refreshOutline} slot="icon-only" />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f8fafc' }}>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <IonGrid style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Top Stats Overview */}
          <IonRow>
            <IonCol size="6" size-md="3">
              <StatsCard title="Total Sites" value={globalStats.totalSites} icon={businessOutline} color="primary" subtitle="Active locations" />
            </IonCol>
            <IonCol size="6" size-md="3">
              <StatsCard title="Active Devices" value={globalStats.activeDevices} icon={hardwareChipOutline} color="secondary" subtitle="Online nodes" />
            </IonCol>
            <IonCol size="6" size-md="3">
              <StatsCard title="Sites with Alerts" value={globalStats.sitesWithAlerts} icon={warningOutline} color={globalStats.sitesWithAlerts > 0 ? 'warning' : 'success'} subtitle={globalStats.sitesWithAlerts > 0 ? 'Action needed' : 'All clear'} />
            </IonCol>
            <IonCol size="6" size-md="3">
              <StatsCard title="Critical Alerts" value={globalStats.criticalAlerts} icon={alertCircleOutline} color={globalStats.criticalAlerts > 0 ? 'danger' : 'success'} subtitle={globalStats.criticalAlerts > 0 ? 'Immediate action!' : 'Normal levels'} />
            </IonCol>
          </IonRow>

          {/* Spatial Grid Map Toggle */}
          <IonRow style={{ margin: '8px 0 16px 0' }}>
            <IonCol size="12">
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <IonIcon icon={mapOutline} style={{ fontSize: '22px', color: '#1a365d' }} />
                  <div>
                    <strong style={{ color: '#1a365d', fontSize: '14px' }}>Live Environmental Coverage Map</strong>
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Interactive spatial overview grid map across municipality</span>
                  </div>
                </div>
                <IonButton size="small" fill="outline" color="primary" onClick={() => setShowGlobalMap(!showGlobalMap)}>
                  {showGlobalMap ? 'Hide Map' : 'Show Map'}
                </IonButton>
              </div>
              {showGlobalMap && <div style={{ marginTop: '12px' }}><SiteGridMap siteName="MENRO Spatial Environmental Grid Overview" readings={mapReadings} height="360px" /></div>}
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
                        <IonSearchbar value={searchTerm} onIonInput={(e) => setSearchTerm(e.detail.value || '')} placeholder="Search site name, owner, address..." style={{ padding: 0, '--background': '#f8fafc' }} />
                      </IonCol>
                      <IonCol size="6" size-sm="4" size-md="2.5">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f8fafc', padding: '4px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                          <IonIcon icon={funnelOutline} style={{ color: '#64748b' }} />
                          <IonSelect value={selectedType} onIonChange={(e) => setSelectedType(e.detail.value)} interface="popover" style={{ width: '100%', fontSize: '13px' }}>
                            <IonSelectOption value="all">Type: All Sites</IonSelectOption>
                            <IonSelectOption value="piggery">Piggery</IonSelectOption>
                            <IonSelectOption value="ambient">Ambient</IonSelectOption>
                            <IonSelectOption value="industrial">Industrial</IonSelectOption>
                          </IonSelect>
                        </div>
                      </IonCol>
                      <IonCol size="6" size-sm="4" size-md="2.5">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f8fafc', padding: '4px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                          <IonIcon icon={alertCircleOutline} style={{ color: '#64748b' }} />
                          <IonSelect value={selectedStatus} onIonChange={(e) => setSelectedStatus(e.detail.value)} interface="popover" style={{ width: '100%', fontSize: '13px' }}>
                            <IonSelectOption value="all">Status: All Levels</IonSelectOption>
                            <IonSelectOption value="normal">🟢 Normal</IonSelectOption>
                            <IonSelectOption value="warning">🟡 Warning</IonSelectOption>
                            <IonSelectOption value="critical">🔴 Critical</IonSelectOption>
                          </IonSelect>
                        </div>
                      </IonCol>
                      <IonCol size="12" size-sm="4" size-md="3">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f8fafc', padding: '4px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                          <IonIcon icon={swapVerticalOutline} style={{ color: '#64748b' }} />
                          <IonSelect value={sortBy} onIonChange={(e) => setSortBy(e.detail.value)} interface="popover" style={{ width: '100%', fontSize: '13px' }}>
                            <IonSelectOption value="last_reading">Sort: Latest Reading</IonSelectOption>
                            <IonSelectOption value="site_name">Sort: Site Name (A-Z)</IonSelectOption>
                            <IonSelectOption value="alert_level">Sort: Alert Level</IonSelectOption>
                          </IonSelect>
                        </div>
                      </IonCol>
                    </IonRow>
                  </IonGrid>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Monitoring Site Analytics List */}
          <IonRow>
            <IonCol size="12">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a365d', margin: 0 }}>
                  Monitoring Sites Analytics ({filteredAndSortedSites.length})
                </h3>
              </div>

              {filteredAndSortedSites.length === 0 ? (
                <IonCard style={{ borderRadius: '12px', margin: 0, padding: '32px', textAlign: 'center' }}>
                  <IonIcon icon={searchOutline} style={{ fontSize: '42px', color: '#94a3b8' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#334155' }}>No Monitoring Sites Found</h3>
                </IonCard>
              ) : (
                filteredAndSortedSites.map((site: SiteAnalyticsData) => (
                  <SiteAnalyticsCard key={site.id} site={site} />
                ))
              )}
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
}