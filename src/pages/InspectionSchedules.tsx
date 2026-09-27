import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonButtons,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonToast,
  IonSearchbar,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent,
  SearchbarCustomEvent,
  SelectCustomEvent
} from '@ionic/react';

import { useState } from 'react';
import {
  calendarOutline,
  refreshOutline,
  personOutline,
  businessOutline,
  pricetagOutline,
  imageOutline,
  warningOutline
} from 'ionicons/icons';

import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useInspectionSchedules } from '../hooks/useInspectionSchedules';
import { useInspectionSites } from '../hooks/useInspectionSites';
import useSyncFeedback from '../hooks/useSyncFeedback';

export default function InspectionSchedules() {
  const { schedules, loading, refresh } = useInspectionSchedules();
  const { sites } = useInspectionSites();
  const { syncToast, triggerSync, dismissSyncToast } = useSyncFeedback();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');

  const filteredSchedules = schedules.filter(s => {
    if (statusFilter !== 'all' && s.status?.toUpperCase() !== statusFilter.toUpperCase()) {
      return false;
    }
    if (siteFilter !== 'all' && s.inspection_site_id !== Number(siteFilter)) {
      return false;
    }
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.schedule_name?.toLowerCase().includes(term) ||
      s.site_name?.toLowerCase().includes(term) ||
      s.site_code?.toLowerCase().includes(term) ||
      s.created_by_name?.toLowerCase().includes(term)
    );
  });

  const getStatusColor = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED': return 'success';
      case 'IN_PROGRESS': return 'warning';
      case 'SCHEDULED': return 'primary';
      case 'CANCELLED': return 'medium';
      default: return 'medium';
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontWeight: 'bold' }}>MENRO INSPECTION SCHEDULES</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => triggerSync(refresh)}>
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>

        <IonToolbar style={{ '--background': '#f8fafc' }}>
          <IonSearchbar
            placeholder="SEARCH SCHEDULES, INSPECTORS, SITES..."
            value={searchTerm}
            onIonInput={(e: SearchbarCustomEvent) => setSearchTerm(e.detail.value || '')}
            animated
          />
        </IonToolbar>

        <IonToolbar style={{ '--background': '#ffffff' }}>
          <div style={{ display: 'flex', gap: '8px', padding: '0 16px 8px 16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <IonSelect
              value={statusFilter}
              onIonChange={(e: SelectCustomEvent) => setStatusFilter(e.detail.value || 'all')}
              interface="popover"
              style={{ fontSize: '13px', backgroundColor: '#f1f5f9', borderRadius: '6px', padding: '2px 8px' }}
            >
              <IonSelectOption value="all">All Statuses</IonSelectOption>
              <IonSelectOption value="SCHEDULED">Scheduled</IonSelectOption>
              <IonSelectOption value="IN_PROGRESS">In Progress</IonSelectOption>
              <IonSelectOption value="COMPLETED">Completed</IonSelectOption>
              <IonSelectOption value="CANCELLED">Cancelled</IonSelectOption>
            </IonSelect>

            <IonSelect
              value={siteFilter}
              onIonChange={(e: SelectCustomEvent) => setSiteFilter(e.detail.value || 'all')}
              interface="popover"
              style={{ fontSize: '13px', backgroundColor: '#f1f5f9', borderRadius: '6px', padding: '2px 8px' }}
            >
              <IonSelectOption value="all">All Sites</IonSelectOption>
              {sites.map(s => (
                <IonSelectOption key={s.id} value={s.id.toString()}>{s.site_name}</IonSelectOption>
              ))}
            </IonSelect>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f1f5f9' }}>
        {loading ? (
          <LoadingSpinner />
        ) : filteredSchedules.length === 0 ? (
          <EmptyState
            title="NO INSPECTION SCHEDULES FOUND"
            message={searchTerm || statusFilter !== 'all' ? 'TRY ADJUSTING YOUR FILTERS' : 'NO SCHEDULES FOUND'}
          />
        ) : (
          <IonGrid style={{ padding: 0 }}>
            <IonRow>
              {filteredSchedules.map((s) => {
                const currentStatus = s.schedule_status || s.status || 'SCHEDULED';

                return (
                  <IonCol key={s.schedule_id} size="12" size-md="6">
                    <IonCard style={{ margin: '0 0 16px 0', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                      <IonCardContent style={{ padding: '18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1a365d', margin: '0 0 4px 0' }}>
                              {s.schedule_name}
                            </h3>
                            <div style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <IonIcon icon={businessOutline} style={{ color: '#059669' }} />
                              <b>{s.site_name}</b> ({s.site_code})
                            </div>
                          </div>

                          <IonBadge color={getStatusColor(currentStatus)} style={{ fontSize: '12px', padding: '4px 8px' }}>
                            {currentStatus}
                          </IonBadge>
                        </div>

                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '4px', margin: '12px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <IonIcon icon={calendarOutline} style={{ color: '#2563eb' }} />
                            <span>Scheduled Date: <b>{new Date(s.scheduled_date).toLocaleDateString()}</b></span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <IonIcon icon={personOutline} style={{ color: '#7c3aed' }} />
                            <span>Created By: <b>{s.created_by_name || 'MENRO Staff'}</b></span>
                          </div>
                        </div>

                        {/* Schedule Metric Badges */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '8px 0', borderTop: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: '11px', color: '#1e293b', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <IonIcon icon={pricetagOutline} style={{ color: '#0891b2' }} />
                            <b>{s.tag_count || 0}</b> Tags
                          </span>

                          <span style={{ fontSize: '11px', color: '#1e293b', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <IonIcon icon={imageOutline} style={{ color: '#7c3aed' }} />
                            <b>{s.photo_count || 0}</b> Photos
                          </span>

                          {s.avg_ammonia !== null && s.avg_ammonia !== undefined && (
                            <span style={{ fontSize: '11px', color: s.avg_ammonia > 25 ? '#dc2626' : '#15803d', backgroundColor: s.avg_ammonia > 25 ? '#fee2e2' : '#dcfce7', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                              Avg NH₃: {s.avg_ammonia.toFixed(1)} PPM
                            </span>
                          )}

                          {(s.critical_readings || 0) > 0 && (
                            <span style={{ fontSize: '11px', color: '#dc2626', backgroundColor: '#fee2e2', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                              <IonIcon icon={warningOutline} />
                              {s.critical_readings} Critical
                            </span>
                          )}
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                );
              })}
            </IonRow>
          </IonGrid>
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
