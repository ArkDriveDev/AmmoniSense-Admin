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
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
  IonSpinner,
} from '@ionic/react';
import {
  closeOutline,
  businessOutline,
  locationOutline,
  calendarOutline,
  pricetagOutline,
  imageOutline,
  warningOutline,
  openOutline,
  timeOutline,
  shieldCheckmarkOutline,
  pulseOutline,
  analyticsOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { supabase } from '../../services/supabase';
import {
  getSiteTypeLabel,
  getPoultryTypeLabel,
  getChickenTypeLabel,
} from '../../constants/siteConstants';
import { SiteAnalyticsData } from '../../hooks/useSiteAnalytics';
import { InspectionSiteWithSummary } from '../../hooks/useInspectionSites';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Compatible interface for both SiteAnalyticsData and InspectionSiteWithSummary
export interface SiteDetailData {
  id: number;
  site_name: string;
  site_code?: string | null;
  site_type?: string | null;
  poultry_type?: string | null;
  chicken_type?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  current_latitude?: number | null;
  current_longitude?: number | null;
  area_size_hectares?: number | null;
  site_photo_url?: string | null;
  site_photo_thumbnail?: string | null;
  is_active?: boolean | null;
  notes?: string | null;

  schedule_count?: number | null;
  tag_count?: number | null;
  photo_count?: number | null;
  avg_ammonia?: number | null;
  critical_readings?: number | null;
  last_inspection_at?: string | null;

  latest_ammonia?: number | null;
  highest_ammonia?: number | null;
  max_ammonia?: number | null;
  alert_status?: string | null;
}

export interface SiteDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: SiteDetailData | null;
  onOpenInSites?: (siteId: number) => void;
}

export const SiteDetailModal: React.FC<SiteDetailModalProps> = ({
  isOpen,
  onClose,
  site,
  onOpenInSites,
}) => {
  const history = useHistory();

  // Handle Escape key to dismiss modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(false);
  const [siteAnalytics, setSiteAnalytics] = useState<{
    schedulesCount: number;
    tagsCount: number;
    readingsCount: number;
    avgPpm: number | null;
    maxPpm: number | null;
    criticalCount: number;
    lastInspectionDate: string | null;
    recentTags: {
      tagId: number;
      tagName: string;
      scheduleName: string;
      avgPpm: number;
      maxPpm: number;
      readingsCount: number;
      createdAt: string;
    }[];
  } | null>(null);

  // Single query for site-scoped sensor_data analytics
  useEffect(() => {
    if (!isOpen || !site?.id) {
      setSiteAnalytics(null);
      return;
    }

    let isMounted = true;
    const fetchSiteSensorAnalytics = async () => {
      setLoadingAnalytics(true);
      try {
        const { data: sensorRows, error } = await supabase
          .from('sensor_data')
          .select(`
            id,
            ammonia,
            created_at,
            inspection_tag_id,
            inspection_tags!inner (
              id,
              tag_name,
              inspection_site_id,
              inspection_schedule_id,
              created_at,
              inspection_schedules (
                id,
                schedule_name,
                scheduled_date
              )
            )
          `)
          .eq('inspection_tags.inspection_site_id', site.id)
          .not('ammonia', 'is', null)
          .order('created_at', { ascending: false });

        if (!isMounted) return;

        if (error) {
          console.warn('Could not fetch sensor_data for site detail:', error);
        }

        const rows = sensorRows || [];
        const uniqueScheduleIds = new Set<number>();
        const uniqueTagIds = new Set<number>();
        let ppmSum = 0;
        let maxVal = 0;
        let criticalCnt = 0;
        let latestDate: string | null = site.last_inspection_at || null;

        interface TagAccumulator {
          tagId: number;
          tagName: string;
          scheduleName: string;
          ppmSum: number;
          maxPpm: number;
          readingsCount: number;
          createdAt: string;
        }

        const tagMap = new Map<number, TagAccumulator>();

        rows.forEach((r: any) => {
          const val = Number(r.ammonia);
          if (isNaN(val)) return;

          ppmSum += val;
          if (val > maxVal) maxVal = val;
          if (val >= 25) criticalCnt++;

          const tag = r.inspection_tags;
          if (tag) {
            if (tag.id) uniqueTagIds.add(Number(tag.id));
            if (tag.inspection_schedule_id) uniqueScheduleIds.add(Number(tag.inspection_schedule_id));

            const candidateDate = r.created_at || tag.created_at;
            if (candidateDate) {
              if (!latestDate || new Date(candidateDate).getTime() > new Date(latestDate).getTime()) {
                latestDate = candidateDate;
              }
            }

            let tAcc = tagMap.get(tag.id);
            if (!tAcc) {
              const sched = tag.inspection_schedules;
              tAcc = {
                tagId: tag.id,
                tagName: tag.tag_name || `Tag #${tag.id}`,
                scheduleName: sched?.schedule_name || 'Regular Inspection',
                ppmSum: 0,
                maxPpm: 0,
                readingsCount: 0,
                createdAt: tag.created_at || r.created_at,
              };
              tagMap.set(tag.id, tAcc);
            }

            tAcc.ppmSum += val;
            tAcc.readingsCount++;
            if (val > tAcc.maxPpm) tAcc.maxPpm = val;
          }
        });

        const recentTagsList = Array.from(tagMap.values()).map((t) => ({
          tagId: t.tagId,
          tagName: t.tagName,
          scheduleName: t.scheduleName,
          avgPpm: t.readingsCount > 0 ? Math.round((t.ppmSum / t.readingsCount) * 10) / 10 : 0,
          maxPpm: Math.round(t.maxPpm * 10) / 10,
          readingsCount: t.readingsCount,
          createdAt: t.createdAt,
        }));

        const totalReadings = rows.length;
        const avgVal = totalReadings > 0 ? Math.round((ppmSum / totalReadings) * 10) / 10 : null;

        setSiteAnalytics({
          schedulesCount: Math.max(uniqueScheduleIds.size, site.schedule_count ?? 0),
          tagsCount: Math.max(uniqueTagIds.size, site.tag_count ?? 0),
          readingsCount: totalReadings,
          avgPpm: avgVal,
          maxPpm: totalReadings > 0 ? Math.round(maxVal * 10) / 10 : null,
          criticalCount: criticalCnt,
          lastInspectionDate: latestDate,
          recentTags: recentTagsList.slice(0, 8),
        });
      } catch (err) {
        console.error('Error fetching site detail analytics:', err);
      } finally {
        if (isMounted) setLoadingAnalytics(false);
      }
    };

    fetchSiteSensorAnalytics();
    return () => {
      isMounted = false;
    };
  }, [isOpen, site?.id]);

  if (!site) return null;

  const lat = site.latitude ?? site.current_latitude;
  const lng = site.longitude ?? site.current_longitude;
  const siteCode = site.site_code || `SITE-${site.id}`;
  const address = site.address || 'Address not specified';
  const photoUrl = site.site_photo_url || site.site_photo_thumbnail;

  const schedulesCount = site.schedule_count ?? 0;
  const tagsCount = site.tag_count ?? 0;
  const photosCount = site.photo_count ?? 0;
  const avgAmmonia = site.avg_ammonia;
  const criticalCount = site.critical_readings ?? 0;
  const highestAmmonia = site.highest_ammonia ?? site.max_ammonia ?? site.latest_ammonia;
  const lastInspection = site.last_inspection_at;

  const handleNavigateToSites = () => {
    onClose();
    if (onOpenInSites) {
      onOpenInSites(site.id);
    } else {
      history.push(`/inspection-sites?siteId=${site.id}`);
    }
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      backdropDismiss={true}
      style={{
        '--max-width': '720px',
        '--border-radius': '14px',
      }}
    >
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontSize: '16px', fontWeight: 'bold' }}>
            <IonIcon icon={businessOutline} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Inspection Site Details
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose} title="Close Modal (Esc)">
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f8fafc' }} scrollY={true}>
        <div style={{ paddingBottom: '16px' }}>
          {/* Site Photo Header (if available) */}
          {photoUrl ? (
            <div
              style={{
                width: '100%',
                height: '180px',
                borderRadius: '10px',
                overflow: 'hidden',
                marginBottom: '16px',
                border: '1px solid #e2e8f0',
                position: 'relative',
                backgroundColor: '#0f172a',
              }}
            >
              <img
                src={photoUrl}
                alt={site.site_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '12px',
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 600,
                  backdropFilter: 'blur(4px)',
                }}
              >
                Inspection Photo &bull; {siteCode}
              </div>
            </div>
          ) : null}

          {/* Site Title and Badges */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1a365d' }}>
                {site.site_name}
              </h2>
              <IonBadge color="primary" style={{ fontSize: '11px', fontWeight: 700 }}>
                {siteCode}
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
              {site.is_active === false && (
                <IonBadge color="medium" style={{ fontSize: '11px' }}>
                  INACTIVE
                </IonBadge>
              )}
            </div>

            {/* Address and Coordinates */}
            <div style={{ color: '#475569', fontSize: '13px', lineHeight: 1.5, marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <IonIcon icon={locationOutline} style={{ color: '#059669', fontSize: '16px' }} />
                <span>{address}</span>
              </div>
              {lat != null && lng != null && (
                <div style={{ fontSize: '12px', color: '#64748b', marginLeft: '21px', marginTop: '2px' }}>
                  GPS Coordinates: <b>{Number(lat).toFixed(5)}° N, {Number(lng).toFixed(5)}° E</b>
                  {site.area_size_hectares ? ` &bull; ${site.area_size_hectares} ha` : ''}
                </div>
              )}
            </div>
          </div>

          {/* Section Title */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IonIcon icon={analyticsOutline} style={{ color: '#1a365d', fontSize: '18px' }} />
              <strong style={{ color: '#1a365d', fontSize: '14px' }}>Sensor Telemetry & Inspection Analytics</strong>
            </div>
            {loadingAnalytics && (
              <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IonSpinner name="dots" style={{ width: '16px', height: '16px' }} /> Loading sensor data...
              </span>
            )}
          </div>

          {/* Real Analytics Metrics Grid computed from sensor_data */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px',
              margin: '8px 0 16px 0',
            }}
          >
            {/* Schedules Count */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IonIcon icon={calendarOutline} style={{ color: '#2563eb' }} /> Schedules
              </span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#1a365d', marginTop: '2px' }}>
                {siteAnalytics ? siteAnalytics.schedulesCount : schedulesCount}
              </div>
            </div>

            {/* Tags Count */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IonIcon icon={pricetagOutline} style={{ color: '#0891b2' }} /> Field Tags
              </span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#1a365d', marginTop: '2px' }}>
                {siteAnalytics ? siteAnalytics.tagsCount : tagsCount}
              </div>
            </div>

            {/* Total Sensor Readings */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IonIcon icon={pulseOutline} style={{ color: '#059669' }} /> Total Readings
              </span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#1a365d', marginTop: '2px' }}>
                {siteAnalytics ? siteAnalytics.readingsCount : 0}
              </div>
            </div>

            {/* Average Ammonia */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IonIcon icon={analyticsOutline} style={{ color: '#2563eb' }} /> Avg NH₃
              </span>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: siteAnalytics?.avgPpm && siteAnalytics.avgPpm >= 25 ? '#dc2626' : '#1a365d',
                  marginTop: '2px',
                }}
              >
                {siteAnalytics?.avgPpm != null ? `${siteAnalytics.avgPpm.toFixed(1)} ppm` : '—'}
              </div>
            </div>

            {/* Max / Peak Ammonia */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IonIcon icon={warningOutline} style={{ color: '#d97706' }} /> Max NH₃
              </span>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: siteAnalytics?.maxPpm && siteAnalytics.maxPpm >= 25 ? '#dc2626' : '#15803d',
                  marginTop: '2px',
                }}
              >
                {siteAnalytics?.maxPpm != null
                  ? `${siteAnalytics.maxPpm.toFixed(1)} ppm`
                  : highestAmmonia != null
                  ? `${Number(highestAmmonia).toFixed(1)} ppm`
                  : '—'}
              </div>
            </div>

            {/* Critical Readings (>= 25 ppm) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IonIcon icon={warningOutline} style={{ color: '#dc2626' }} /> Critical (&ge;25)
              </span>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: (siteAnalytics?.criticalCount || criticalCount) > 0 ? '#dc2626' : '#15803d',
                  marginTop: '2px',
                }}
              >
                {siteAnalytics ? siteAnalytics.criticalCount : criticalCount}
              </div>
            </div>
          </div>

          {/* Last Inspection Banner */}
          <div
            style={{
              backgroundColor: '#f1f5f9',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              fontSize: '12px',
              color: '#334155',
              border: '1px solid #e2e8f0',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IonIcon icon={timeOutline} style={{ color: '#0284c7', fontSize: '16px' }} />
              <span>
                <strong>Last Inspection:</strong>{' '}
                {siteAnalytics?.lastInspectionDate || lastInspection
                  ? new Date(siteAnalytics?.lastInspectionDate || lastInspection!).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'No inspections recorded yet'}
              </span>
            </div>

            {(siteAnalytics?.criticalCount || criticalCount) > 0 && (
              <span style={{ color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <IonIcon icon={warningOutline} /> {siteAnalytics ? siteAnalytics.criticalCount : criticalCount} Critical Reading(s)
              </span>
            )}
          </div>

          {/* Chart Visual: Average PPM per Tag */}
          {siteAnalytics && siteAnalytics.recentTags.length > 0 && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '12px', marginBottom: '16px' }}>
              <div style={{ height: '170px' }}>
                <Bar
                  data={{
                    labels: siteAnalytics.recentTags.map((t) => t.tagName),
                    datasets: [
                      {
                        label: 'Average Ammonia (PPM)',
                        data: siteAnalytics.recentTags.map((t) => t.avgPpm),
                        backgroundColor: siteAnalytics.recentTags.map((t) =>
                          t.avgPpm >= 25 ? 'rgba(239, 68, 68, 0.75)' : 'rgba(37, 99, 235, 0.75)'
                        ),
                        borderColor: siteAnalytics.recentTags.map((t) =>
                          t.avgPpm >= 25 ? '#dc2626' : '#1d4ed8'
                        ),
                        borderWidth: 1.5,
                        borderRadius: 4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      title: {
                        display: true,
                        text: 'Average Ammonia by Inspection Tag (PPM)',
                        font: { size: 12, weight: 'bold' as const },
                        color: '#1a365d',
                      },
                    },
                    scales: {
                      y: { beginAtZero: true, ticks: { font: { size: 9 } } },
                      x: { ticks: { font: { size: 9 }, maxRotation: 40, minRotation: 0 } },
                    },
                  }}
                />
              </div>

              {/* Lightweight Recent Tags Breakdown List */}
              <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                  Recent Tag Averages ({siteAnalytics.recentTags.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {siteAnalytics.recentTags.map((t) => (
                    <div
                      key={t.tagId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#f8fafc',
                        fontSize: '11.5px',
                      }}
                    >
                      <div>
                        <strong style={{ color: '#1a365d' }}>{t.tagName}</strong>
                        <span style={{ color: '#64748b', marginLeft: '6px', fontSize: '10.5px' }}>
                          &bull; {t.scheduleName} ({t.readingsCount} readings)
                        </span>
                      </div>
                      <span
                        style={{
                          fontWeight: 700,
                          color: t.avgPpm >= 25 ? '#dc2626' : '#059669',
                          backgroundColor: t.avgPpm >= 25 ? '#fee2e2' : '#dcfce7',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        Avg: {t.avgPpm.toFixed(1)} PPM
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <IonButton fill="outline" color="medium" onClick={onClose}>
              Close
            </IonButton>
            <IonButton
              fill="solid"
              style={{ '--background': '#1a365d', fontWeight: 700 }}
              onClick={handleNavigateToSites}
            >
              Open in Sites <IonIcon icon={openOutline} slot="end" />
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default SiteDetailModal;
