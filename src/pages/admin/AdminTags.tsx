import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonButtons,
  IonIcon,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonModal,
  IonRefresher,
  IonRefresherContent,
  IonToast,
  SearchbarCustomEvent,
  SelectCustomEvent,
  RefresherCustomEvent
} from '@ionic/react';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import {
  refreshOutline,
  printOutline,
  closeCircleOutline,
  filterOutline
} from 'ionicons/icons';

import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';
import TagTable from '../../components/admin/TagTable';
import TagDetail from './TagDetail';
import { InspectionTagDetails, InspectionSite, InspectionScheduleSummary } from '../../types/schema';
import useSyncFeedback from '../../hooks/useSyncFeedback';
import { useInspectionSites } from '../../hooks/useInspectionSites';
import { useInspectionSchedules } from '../../hooks/useInspectionSchedules';

export default function AdminTags() {
  const { syncToast, triggerSync, dismissSyncToast } = useSyncFeedback();
  const { sites } = useInspectionSites();
  const { schedules } = useInspectionSchedules();

  const [tags, setTags] = useState<InspectionTagDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [scheduleFilter, setScheduleFilter] = useState<string>('all');
  const [ammoniaFilter, setAmmoniaFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Selected tag for read-only detail view
  const [selectedTag, setSelectedTag] = useState<InspectionTagDetails | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Primary: inspection_tag_details view
      const { data, error } = await supabase
        .from('inspection_tag_details')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) {
        // Fallback to direct inspection_tags join if view is compiling
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
          .limit(300);

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
          violation_category: t.violation_category || null,
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
          schedule_id: t.inspection_schedule_id
        }));

        setTags(mapped);
      } else {
        const normalized: InspectionTagDetails[] = ((data || []) as (InspectionTagDetails & {
          tag_latitude?: number;
          reading_latitude?: number;
        })[]).map((t) => ({
          ...t,
          violation_category: t.violation_category || null,
          latitude: t.tag_latitude ?? t.reading_latitude ?? t.latitude,
          longitude: t.tag_longitude ?? t.reading_longitude ?? t.longitude,
          schedule_id: t.inspection_schedule_id ?? t.schedule_id
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
    fetchTags();

    if (realtimeEnabled) {
      const subscription = supabase
        .channel('admin_tags_channel')
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
  }, [realtimeEnabled, fetchTags]);

  const handleRefresh = async (event: RefresherCustomEvent) => {
    await fetchTags();
    event.detail.complete();
  };

  // Filter schedules available based on selected site (if any)
  const availableSchedules = useMemo(() => {
    if (siteFilter === 'all') return schedules;
    return schedules.filter((s) => s.inspection_site_id === Number(siteFilter));
  }, [schedules, siteFilter]);

  // Filtered tags list
  const filteredTags = useMemo(() => {
    let result = [...tags];

    // Filter by site
    if (siteFilter !== 'all') {
      result = result.filter((t) => t.inspection_site_id === Number(siteFilter));
    }

    // Filter by schedule
    if (scheduleFilter !== 'all') {
      const schedId = Number(scheduleFilter);
      result = result.filter(
        (t) => t.inspection_schedule_id === schedId || t.schedule_id === schedId
      );
    }

    // Filter by ammonia level
    if (ammoniaFilter !== 'all') {
      result = result.filter((t) => {
        const s = (t.status || '').toUpperCase();
        const ppm = Number(t.ammonia) || 0;
        if (ammoniaFilter === 'NORMAL') return s === 'NORMAL' || ppm <= 25;
        if (ammoniaFilter === 'WARNING') return s === 'WARNING' || (ppm > 25 && ppm <= 35);
        if (ammoniaFilter === 'HIGH') return s === 'HIGH' || (ppm > 35 && ppm <= 50);
        if (ammoniaFilter === 'CRITICAL') return s === 'CRITICAL' || ppm > 50;
        return true;
      });
    }

    // Filter by date range (from startDate to endDate)
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter((t) => {
        if (!t.created_at) return false;
        const d = new Date(t.created_at);
        return d >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((t) => {
        if (!t.created_at) return false;
        const d = new Date(t.created_at);
        return d <= end;
      });
    }

    // Search bar filter (by tag name, site name, schedule name, or date)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((t) => {
        const nameMatch = t.tag_name?.toLowerCase().includes(term);
        const siteMatch =
          t.site_name?.toLowerCase().includes(term) ||
          t.site_code?.toLowerCase().includes(term);
        const schedMatch = t.schedule_name?.toLowerCase().includes(term);
        const devMatch =
          t.device_name?.toLowerCase().includes(term) ||
          t.device_uid?.toLowerCase().includes(term);
        const notesMatch = t.notes?.toLowerCase().includes(term);
        const statusMatch = t.status?.toLowerCase().includes(term);

        // Date search
        const createdStr = t.created_at ? new Date(t.created_at).toLocaleDateString().toLowerCase() : '';
        const scheduledStr = t.scheduled_date ? new Date(t.scheduled_date).toLocaleDateString().toLowerCase() : '';
        const rawDate = t.created_at ? t.created_at.toLowerCase() : '';
        const dateMatch = createdStr.includes(term) || scheduledStr.includes(term) || rawDate.includes(term);

        return nameMatch || siteMatch || schedMatch || devMatch || notesMatch || statusMatch || dateMatch;
      });
    }

    return result;
  }, [tags, siteFilter, scheduleFilter, ammoniaFilter, startDate, endDate, searchTerm]);

  // Stats calculation
  const stats = useMemo(() => {
    if (filteredTags.length === 0) return { avg: 0, criticalCount: 0, max: 0 };
    const validAmmonia = filteredTags
      .map((t) => Number(t.ammonia))
      .filter((v) => !isNaN(v) && v !== null);

    const sum = validAmmonia.reduce((acc, v) => acc + v, 0);
    const avg = validAmmonia.length > 0 ? sum / validAmmonia.length : 0;
    const max = validAmmonia.length > 0 ? Math.max(...validAmmonia) : 0;
    const criticalCount = filteredTags.filter(
      (t) => (t.status || '').toUpperCase() === 'CRITICAL' || (Number(t.ammonia) || 0) > 50
    ).length;

    return { avg, criticalCount, max };
  }, [filteredTags]);

  const hasActiveFilters =
    searchTerm !== '' ||
    siteFilter !== 'all' ||
    scheduleFilter !== 'all' ||
    ammoniaFilter !== 'all' ||
    startDate !== '' ||
    endDate !== '';

  const clearAllFilters = () => {
    setSearchTerm('');
    setSiteFilter('all');
    setScheduleFilter('all');
    setAmmoniaFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const activeFiltersDescription = useMemo(() => {
    const parts: string[] = [];
    if (searchTerm) parts.push(`Search: "${searchTerm}"`);
    if (siteFilter !== 'all') {
      const s = sites.find((item) => item.id === Number(siteFilter));
      parts.push(`Site: ${s ? s.site_name : siteFilter}`);
    }
    if (scheduleFilter !== 'all') {
      const sc = schedules.find((item) => item.schedule_id === Number(scheduleFilter));
      parts.push(`Schedule: ${sc ? sc.schedule_name : scheduleFilter}`);
    }
    if (ammoniaFilter !== 'all') parts.push(`Ammonia Level: ${ammoniaFilter}`);
    if (startDate) parts.push(`From: ${startDate}`);
    if (endDate) parts.push(`To: ${endDate}`);
    return parts.length > 0 ? parts.join(', ') : 'All Sites & Schedules (No Filter)';
  }, [searchTerm, siteFilter, scheduleFilter, ammoniaFilter, startDate, endDate, sites, schedules]);

  const handlePrint = () => {
    window.print();
  };

  const handleCardClick = (tag: InspectionTagDetails) => {
    setSelectedTag(tag);
    setShowDetailModal(true);
  };

  return (
    <IonPage>
      {/* ====================================================================
          TOP BAR & NAVIGATION (Hidden during print)
          ==================================================================== */}
      <IonHeader className="no-print">
        {/* Main Toolbar */}
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
            INSPECTION TAGS
          </IonTitle>
          <IonButtons slot="end">
            {/* Print Button (Top-Right) */}
            <IonButton
              fill="solid"
              color="light"
              onClick={handlePrint}
              style={{
                fontWeight: 700,
                '--color': '#1a365d',
                '--background': '#ffffff',
                marginRight: '8px',
                borderRadius: '8px'
              }}
            >
              <IonIcon icon={printOutline} slot="start" />
              PRINT REPORT
            </IonButton>

            <IonButton onClick={() => setRealtimeEnabled(!realtimeEnabled)}>
              {realtimeEnabled ? 'LIVE' : 'PAUSED'}
            </IonButton>

            <IonButton onClick={() => triggerSync(fetchTags)} title="Refresh data">
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>

        {/* Search Bar */}
        <IonToolbar style={{ '--background': '#f8fafc', padding: '0 8px' }}>
          <IonSearchbar
            placeholder="SEARCH BY TAG NAME, SITE, SCHEDULE, OR DATE..."
            value={searchTerm}
            onIonInput={(e: SearchbarCustomEvent) => setSearchTerm(e.detail.value || '')}
            animated
            style={{ padding: '4px 0' }}
          />
        </IonToolbar>

        {/* Filter Controls Row */}
        <IonToolbar style={{ '--background': '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
          <div
            style={{
              display: 'flex',
              gap: '10px',
              padding: '8px 16px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}
          >
            {/* Filter by Site */}
            <div style={{ display: 'flex', alignItems: 'center', minWidth: '180px', flex: '1 1 auto' }}>
              <IonSelect
                value={siteFilter}
                onIonChange={(e: SelectCustomEvent) => setSiteFilter(e.detail.value || 'all')}
                interface="popover"
                placeholder="Filter By Site"
                style={{
                  width: '100%',
                  fontSize: '13px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '8px',
                  padding: '4px 12px',
                  color: '#1e293b'
                }}
              >
                <IonSelectOption value="all">ALL INSPECTION SITES</IonSelectOption>
                {sites.map((s) => (
                  <IonSelectOption key={s.id} value={s.id.toString()}>
                    {s.site_name} {s.site_code ? `(${s.site_code})` : ''}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </div>

            {/* Filter by Schedule */}
            <div style={{ display: 'flex', alignItems: 'center', minWidth: '180px', flex: '1 1 auto' }}>
              <IonSelect
                value={scheduleFilter}
                onIonChange={(e: SelectCustomEvent) => setScheduleFilter(e.detail.value || 'all')}
                interface="popover"
                placeholder="Filter By Schedule"
                style={{
                  width: '100%',
                  fontSize: '13px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '8px',
                  padding: '4px 12px',
                  color: '#1e293b'
                }}
              >
                <IonSelectOption value="all">ALL SCHEDULES</IonSelectOption>
                {availableSchedules.map((sc) => (
                  <IonSelectOption key={sc.schedule_id} value={sc.schedule_id.toString()}>
                    {sc.schedule_name} {sc.scheduled_date ? `(${new Date(sc.scheduled_date).toLocaleDateString()})` : ''}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </div>

            {/* Filter by Ammonia Level */}
            <div style={{ display: 'flex', alignItems: 'center', minWidth: '160px', flex: '1 1 auto' }}>
              <IonSelect
                value={ammoniaFilter}
                onIonChange={(e: SelectCustomEvent) => setAmmoniaFilter(e.detail.value || 'all')}
                interface="popover"
                placeholder="Ammonia Level"
                style={{
                  width: '100%',
                  fontSize: '13px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '8px',
                  padding: '4px 12px',
                  color: '#1e293b'
                }}
              >
                <IonSelectOption value="all">ALL AMMONIA LEVELS</IonSelectOption>
                <IonSelectOption value="NORMAL">NORMAL (&lt;= 25 PPM)</IonSelectOption>
                <IonSelectOption value="WARNING">WARNING (25 - 35 PPM)</IonSelectOption>
                <IonSelectOption value="HIGH">HIGH (35 - 50 PPM)</IonSelectOption>
                <IonSelectOption value="CRITICAL">CRITICAL (&gt; 50 PPM)</IonSelectOption>
              </IonSelect>
            </div>

            {/* Date Range Inputs */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flex: '1 1 auto',
                minWidth: '260px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
                  From:
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: '12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    backgroundColor: '#f8fafc',
                    color: '#1e293b'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
                  To:
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: '12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    backgroundColor: '#f8fafc',
                    color: '#1e293b'
                  }}
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <IonButton
                size="small"
                fill="clear"
                color="danger"
                onClick={clearAllFilters}
                style={{ fontWeight: 600, fontSize: '12px', height: '32px' }}
              >
                <IonIcon icon={closeCircleOutline} slot="start" />
                Clear Filters
              </IonButton>
            )}
          </div>
        </IonToolbar>
      </IonHeader>

      {/* ====================================================================
          MAIN CONTENT (Structured List matching user layout)
          ==================================================================== */}
      <IonContent className="ion-padding" style={{ '--background': '#f8fafc' }}>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh} className="no-print">
          <IonRefresherContent />
        </IonRefresher>

        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {/* Summary Metric Ribbon (Screen only) */}
          <div
            className="screen-only"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
              padding: '10px 16px',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px', color: '#334155' }}>
              <span>
                <strong>Total Tags:</strong> {filteredTags.length}
              </span>
              <span>•</span>
              <span>
                <strong>Avg NH₃:</strong> {stats.avg.toFixed(2)} PPM
              </span>
              <span>•</span>
              <span>
                <strong>Max NH₃:</strong> {stats.max.toFixed(2)} PPM
              </span>
              {stats.criticalCount > 0 && (
                <>
                  <span>•</span>
                  <span style={{ color: '#dc2626', fontWeight: 700 }}>
                    <strong>Critical:</strong> {stats.criticalCount}
                  </span>
                </>
              )}
            </div>

            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Click any tag to view full read-only details
            </div>
          </div>

          {/* Tag Data Display */}
          {loading ? (
            <LoadingSpinner />
          ) : filteredTags.length === 0 ? (
            <div className="screen-only">
              <EmptyState
                title="NO INSPECTION TAGS FOUND"
                message={
                  hasActiveFilters
                    ? 'No records match your filter criteria. Try clearing or broadening your search.'
                    : 'Awaiting inspection tags from mobile inspector app.'
                }
              />
            </div>
          ) : (
            <TagTable
              tags={filteredTags}
              activeFiltersText={activeFiltersDescription}
              onSelectTag={handleCardClick}
            />
          )}
        </div>

        {/* Read-Only Tag Detail Modal (Click Card → Expand Detail View) */}
        <IonModal
          isOpen={showDetailModal}
          onDidDismiss={() => setShowDetailModal(false)}
          className="no-print"
        >
          <IonHeader>
            <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
              <IonTitle style={{ fontSize: '16px', fontWeight: 'bold' }}>
                Inspection Tag Telemetry
              </IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowDetailModal(false)}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding" style={{ '--background': '#f1f5f9' }}>
            {selectedTag && (
              <TagDetail
                tag={selectedTag}
                onClose={() => setShowDetailModal(false)}
              />
            )}
          </IonContent>
        </IonModal>

        {/* Feedback Toast */}
        <IonToast
          isOpen={syncToast.isOpen}
          onDidDismiss={dismissSyncToast}
          message={syncToast.message}
          duration={syncToast.duration}
          color={syncToast.color}
          position="bottom"
          className="no-print"
        />
      </IonContent>
    </IonPage>
  );
}
