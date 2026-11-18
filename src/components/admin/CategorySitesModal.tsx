import React, { useEffect, useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonSpinner,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
} from '@ionic/react';
import {
  closeOutline,
  businessOutline,
  chevronForwardOutline,
  shieldCheckmarkOutline,
  warningOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import { supabase } from '../../services/supabase';
import { getPoultryTypeLabel, getChickenTypeLabel } from '../../constants/siteConstants';
import { normalizePoultryType, normalizeChickenType } from '../../hooks/useDashboardSummaryCounts';

export interface CategorySiteItem {
  id: number;
  site_name: string;
  site_code?: string | null;
  poultry_type?: string | null;
  chicken_type?: string | null;
  avg_ammonia?: number | null;
  worst_ammonia?: number | null;
  address?: string | null;
  area_size_hectares?: number | null;
  is_active?: boolean;
}

export interface CategorySitesModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartType: 'status' | 'poultry' | 'chicken' | null;
  category: string | null;
  onSelectSite: (site: CategorySiteItem) => void;
}

export default function CategorySitesModal({
  isOpen,
  onClose,
  chartType,
  category,
  onSelectSite,
}: CategorySitesModalProps) {
  const [sites, setSites] = useState<CategorySiteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Compute dynamic title based on chart type and category
  const modalTitle = React.useMemo(() => {
    if (!category) return 'Inspection Sites';
    if (chartType === 'status') {
      const catUpper = category.toUpperCase();
      if (catUpper.includes('SAFE')) return 'Sites with SAFE Ammonia Status';
      if (catUpper.includes('WARNING')) return 'Sites with WARNING Ammonia Status';
      if (catUpper.includes('CRITICAL')) return 'Sites with CRITICAL Ammonia Status';
      return `Sites with ${category} Status`;
    }
    if (chartType === 'poultry') {
      return `${category} Poultry Housing Sites`;
    }
    if (chartType === 'chicken') {
      return `${category} Chicken Type Sites`;
    }
    return `${category} Sites`;
  }, [chartType, category]);

  // Fetch sites on demand when modal opens
  useEffect(() => {
    if (!isOpen || !chartType || !category) {
      setSites([]);
      return;
    }

    let isMounted = true;
    const fetchCategorySites = async () => {
      setLoading(true);
      try {
        if (chartType === 'status') {
          const catUpper = category.toUpperCase();
          let targetStatus: 'SAFE' | 'WARNING' | 'CRITICAL' | null = null;
          if (catUpper.includes('SAFE')) targetStatus = 'SAFE';
          else if (catUpper.includes('WARNING')) targetStatus = 'WARNING';
          else if (catUpper.includes('CRITICAL')) targetStatus = 'CRITICAL';

          if (!targetStatus) {
            if (isMounted) setSites([]);
            return;
          }

          // 1. Fetch active sites
          const { data: sitesData, error: sitesErr } = await supabase
            .from('inspection_sites')
            .select('id, site_name, site_code, poultry_type, chicken_type, address, area_size_hectares, is_active');

          if (sitesErr || !sitesData) {
            console.warn('Could not fetch inspection_sites for status category:', sitesErr);
            if (isMounted) setSites([]);
            return;
          }

          const activeSitesList = sitesData.filter((s) => s.is_active !== false);
          const activeSiteIds = activeSitesList.map((s) => s.id);

          if (activeSiteIds.length === 0) {
            if (isMounted) setSites([]);
            return;
          }

          // 2. Fetch schedules for active sites
          const { data: schedules, error: schedErr } = await supabase
            .from('inspection_schedules')
            .select('id, inspection_site_id, scheduled_date')
            .in('inspection_site_id', activeSiteIds)
            .order('scheduled_date', { ascending: false });

          if (schedErr) {
            console.warn('Could not fetch inspection_schedules for status category:', schedErr);
          }

          const scheduleToSiteMap = new Map<number, number>();
          const latestScheduleMap = new Map<number, number>();
          const scheduleIds: number[] = [];

          (schedules || []).forEach((sc) => {
            if (sc.id && sc.inspection_site_id) {
              scheduleToSiteMap.set(sc.id, sc.inspection_site_id);
              scheduleIds.push(sc.id);
              if (!latestScheduleMap.has(sc.inspection_site_id)) {
                latestScheduleMap.set(sc.inspection_site_id, sc.id);
              }
            }
          });

          // 3. Fetch tags for these schedules
          const tagToSiteMap = new Map<number, number>();
          const tagToScheduleMap = new Map<number, number>();
          const tagIds: number[] = [];

          if (scheduleIds.length > 0) {
            const { data: tags, error: tagsErr } = await supabase
              .from('inspection_tags')
              .select('id, inspection_schedule_id')
              .in('inspection_schedule_id', scheduleIds);

            if (tagsErr) {
              console.warn('Could not fetch inspection_tags for status category:', tagsErr);
            }

            (tags || []).forEach((t) => {
              if (t.id && t.inspection_schedule_id) {
                const siteId = scheduleToSiteMap.get(t.inspection_schedule_id);
                if (siteId) {
                  tagToSiteMap.set(t.id, siteId);
                  tagToScheduleMap.set(t.id, t.inspection_schedule_id);
                  tagIds.push(t.id);
                }
              }
            });
          }

          // 4. Fetch sensor_data for tags and compute worst_ppm & latest average ppm per site
          const siteMaxPpm = new Map<number, number>();
          const siteReadingsCount = new Map<number, number>();
          const siteAllSum = new Map<number, number>();
          const siteLatestSchedSum = new Map<number, number>();
          const siteLatestSchedCount = new Map<number, number>();

          if (tagIds.length > 0) {
            const { data: sensorRows, error: sensorErr } = await supabase
              .from('sensor_data')
              .select('inspection_tag_id, ammonia')
              .in('inspection_tag_id', tagIds)
              .not('ammonia', 'is', null);

            if (sensorErr) {
              console.warn('Could not fetch sensor_data for status category:', sensorErr);
            }

            (sensorRows || []).forEach((r) => {
              const siteId = tagToSiteMap.get(r.inspection_tag_id);
              if (siteId && r.ammonia !== null && r.ammonia !== undefined) {
                const ppm = Number(r.ammonia);
                const currMax = siteMaxPpm.get(siteId);
                if (currMax === undefined || ppm > currMax) {
                  siteMaxPpm.set(siteId, ppm);
                }
                siteReadingsCount.set(siteId, (siteReadingsCount.get(siteId) || 0) + 1);
                siteAllSum.set(siteId, (siteAllSum.get(siteId) || 0) + ppm);

                const schedId = tagToScheduleMap.get(r.inspection_tag_id);
                const latestSchedId = latestScheduleMap.get(siteId);
                if (schedId && latestSchedId && schedId === latestSchedId) {
                  siteLatestSchedSum.set(siteId, (siteLatestSchedSum.get(siteId) || 0) + ppm);
                  siteLatestSchedCount.set(siteId, (siteLatestSchedCount.get(siteId) || 0) + 1);
                }
              }
            });
          }

          // 5. Filter active sites matching targetStatus
          const matched: CategorySiteItem[] = [];

          activeSitesList.forEach((site) => {
            const count = siteReadingsCount.get(site.id) || 0;
            const worstPpm = siteMaxPpm.get(site.id);

            // Sites with no readings are excluded from all three slices
            if (count === 0 || worstPpm === undefined) {
              return;
            }

            let status: 'SAFE' | 'WARNING' | 'CRITICAL';
            if (worstPpm >= 25) {
              status = 'CRITICAL';
            } else if (worstPpm >= 5) {
              status = 'WARNING';
            } else {
              status = 'SAFE';
            }

            if (status === targetStatus) {
              const latestCount = siteLatestSchedCount.get(site.id) || 0;
              const avgPpm =
                latestCount > 0
                  ? (siteLatestSchedSum.get(site.id) || 0) / latestCount
                  : (siteAllSum.get(site.id) || 0) / count;

              matched.push({
                id: site.id,
                site_name: site.site_name,
                site_code: site.site_code,
                poultry_type: site.poultry_type,
                chicken_type: site.chicken_type,
                address: site.address,
                area_size_hectares: site.area_size_hectares,
                is_active: site.is_active,
                avg_ammonia: avgPpm,
                worst_ammonia: worstPpm,
              });
            }
          });

          matched.sort((a, b) => a.site_name.localeCompare(b.site_name));
          if (isMounted) setSites(matched);
        } else if (chartType === 'poultry') {
          const targetPoultryNormalized = normalizePoultryType(category);

          const { data: sitesData, error: sitesErr } = await supabase
            .from('inspection_sites')
            .select('id, site_name, site_code, poultry_type, chicken_type, address, area_size_hectares, is_active');

          if (sitesErr || !sitesData) {
            console.warn('Could not fetch inspection_sites for poultry category:', sitesErr);
            if (isMounted) setSites([]);
            return;
          }

          const activeSitesList = sitesData.filter((s) => s.is_active !== false);
          const matched: CategorySiteItem[] = activeSitesList
            .filter((s) => normalizePoultryType(s.poultry_type) === targetPoultryNormalized)
            .map((s) => ({
              id: s.id,
              site_name: s.site_name,
              site_code: s.site_code,
              poultry_type: s.poultry_type,
              chicken_type: s.chicken_type,
              address: s.address,
              area_size_hectares: s.area_size_hectares,
              is_active: s.is_active,
            }))
            .sort((a, b) => a.site_name.localeCompare(b.site_name));

          if (isMounted) setSites(matched);
        } else if (chartType === 'chicken') {
          const targetChickenNormalized = normalizeChickenType(category);

          const { data: sitesData, error: sitesErr } = await supabase
            .from('inspection_sites')
            .select('id, site_name, site_code, poultry_type, chicken_type, address, area_size_hectares, is_active');

          if (sitesErr || !sitesData) {
            console.warn('Could not fetch inspection_sites for chicken category:', sitesErr);
            if (isMounted) setSites([]);
            return;
          }

          const activeSitesList = sitesData.filter((s) => s.is_active !== false);
          const matched: CategorySiteItem[] = activeSitesList
            .filter((s) => normalizeChickenType(s.chicken_type) === targetChickenNormalized)
            .map((s) => ({
              id: s.id,
              site_name: s.site_name,
              site_code: s.site_code,
              poultry_type: s.poultry_type,
              chicken_type: s.chicken_type,
              address: s.address,
              area_size_hectares: s.area_size_hectares,
              is_active: s.is_active,
            }))
            .sort((a, b) => a.site_name.localeCompare(b.site_name));

          if (isMounted) setSites(matched);
        } else {
          if (isMounted) setSites([]);
        }
      } catch (err) {
        console.error('Error fetching sites for category:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCategorySites();
    return () => {
      isMounted = false;
    };
  }, [isOpen, chartType, category]);

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      style={{
        '--max-width': '620px',
        '--border-radius': '16px',
        '--box-shadow': '0 20px 40px rgba(0,0,0,0.2)',
      }}
    >
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontSize: '15px', fontWeight: 700 }}>
            {modalTitle}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose} fill="clear" style={{ '--color': '#ffffff' }}>
              <IonIcon icon={closeOutline} style={{ fontSize: '22px' }} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f8fafc' }}>
        {/* Count Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
            paddingBottom: '10px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
            Matching Active Sites
          </div>
          <IonBadge color="primary" style={{ fontSize: '12px', padding: '4px 10px' }}>
            {loading ? 'Loading...' : `${sites.length} site${sites.length === 1 ? '' : 's'}`}
          </IonBadge>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '180px',
            }}
          >
            <IonSpinner name="crescent" style={{ width: '40px', height: '40px', color: '#1a365d' }} />
            <p style={{ marginTop: '12px', fontSize: '13px', color: '#64748b' }}>
              Loading matching sites...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && sites.length === 0 && (
          <div
            style={{
              padding: '36px 16px',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
              margin: '12px 0',
            }}
          >
            <IonIcon icon={businessOutline} style={{ fontSize: '36px', color: '#94a3b8', marginBottom: '8px' }} />
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 600 }}>
              No sites match this category.
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              No active inspection sites found for {category}.
            </p>
          </div>
        )}

        {/* Site List */}
        {!loading && sites.length > 0 && (
          <IonList style={{ background: 'transparent', padding: 0 }}>
            {sites.map((site) => (
              <IonItem
                key={site.id}
                button
                onClick={() => onSelectSite(site)}
                style={{
                  '--background': '#ffffff',
                  marginBottom: '8px',
                  borderRadius: '10px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  border: '1px solid #e2e8f0',
                }}
              >
                <IonLabel style={{ margin: '12px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <strong style={{ fontSize: '14px', color: '#1a365d' }}>
                      {site.site_name}
                    </strong>
                    {site.site_code && (
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          backgroundColor: '#f1f5f9',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                        }}
                      >
                        {site.site_code}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '12px',
                      marginTop: '6px',
                      fontSize: '12px',
                      color: '#64748b',
                    }}
                  >
                    {site.poultry_type && (
                      <span>
                        Housing: <strong>{getPoultryTypeLabel(site.poultry_type)}</strong>
                      </span>
                    )}
                    {site.chicken_type && (
                      <span>
                        Chicken: <strong>{getChickenTypeLabel(site.chicken_type)}</strong>
                      </span>
                    )}
                    {chartType === 'status' && site.avg_ammonia !== null && site.avg_ammonia !== undefined && (
                      <span style={{ color: '#0f766e', fontWeight: 600 }}>
                        Latest Avg NH₃: {site.avg_ammonia.toFixed(2)} ppm
                      </span>
                    )}
                  </div>
                </IonLabel>
                <IonIcon icon={chevronForwardOutline} slot="end" style={{ color: '#94a3b8', fontSize: '18px' }} />
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonModal>
  );
}
