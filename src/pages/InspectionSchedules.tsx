import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonInput,
  IonModal,
  IonButtons,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonToast,
  IonSearchbar,
  IonBadge,
  IonTextarea,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent
} from '@ionic/react';

import { useState } from 'react';
import {
  calendarOutline,
  addOutline,
  refreshOutline,
  checkmarkCircleOutline,
  playOutline,
  closeCircleOutline,
  trashOutline,
  personOutline,
  businessOutline,
  pricetagOutline,
  imageOutline,
  warningOutline
} from 'ionicons/icons';

import DeleteAlert from '../components/DeleteAlert';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useInspectionSchedules } from '../hooks/useInspectionSchedules';
import { useInspectionSites } from '../hooks/useInspectionSites';
import { InspectionScheduleSummary, ScheduleStatus } from '../types/schema';
import useSyncFeedback from '../hooks/useSyncFeedback';

export default function InspectionSchedules() {
  const { schedules, loading, refresh, createSchedule, updateScheduleStatus, deleteSchedule } = useInspectionSchedules();
  const { sites } = useInspectionSites();
  const { syncToast, triggerSync, dismissSyncToast } = useSyncFeedback();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<InspectionScheduleSummary | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');

  const [form, setForm] = useState({
    inspection_site_id: '',
    schedule_name: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '09:00:00',
    notes: ''
  });

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

  const handleCreate = async () => {
    if (!form.inspection_site_id || !form.schedule_name || !form.scheduled_date) {
      setToastMessage('Please fill in Site, Schedule Name, and Date');
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    try {
      await createSchedule({
        inspection_site_id: Number(form.inspection_site_id),
        schedule_name: form.schedule_name.trim(),
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time || undefined,
        notes: form.notes ? form.notes.trim() : undefined,
      });

      setToastMessage('Inspection schedule created successfully!');
      setToastColor('success');
      setShowToast(true);
      setShowModal(false);
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setToastMessage('Failed to create schedule: ' + message);
      setToastColor('danger');
      setShowToast(true);
    }
  };

  const handleStatusChange = async (scheduleId: number, status: ScheduleStatus) => {
    try {
      await updateScheduleStatus(scheduleId, status);
      if (status === 'CANCELLED') {
        setToastMessage('Inspection schedule deleted successfully!');
      } else {
        setToastMessage('Inspection schedule updated successfully!');
      }
      setToastColor('success');
      setShowToast(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setToastMessage('Failed to update status: ' + message);
      setToastColor('danger');
      setShowToast(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedSchedule) return;
    try {
      await deleteSchedule(selectedSchedule.schedule_id);
      setToastMessage('Inspection schedule deleted successfully!');
      setToastColor('success');
      setShowToast(true);
      setShowDeleteAlert(false);
      setSelectedSchedule(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setToastMessage('Failed to delete schedule: ' + message);
      setToastColor('danger');
      setShowToast(true);
    }
  };

  const resetForm = () => {
    setForm({
      inspection_site_id: '',
      schedule_name: '',
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '09:00:00',
      notes: ''
    });
  };

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
            <IonButton onClick={() => { resetForm(); setShowModal(true); }}>
              <IonIcon icon={addOutline} slot="start" /> NEW SCHEDULE
            </IonButton>
            <IonButton onClick={() => triggerSync(refresh)}>
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>

        <IonToolbar style={{ '--background': '#f8fafc' }}>
          <IonSearchbar
            placeholder="SEARCH SCHEDULES, INSPECTORS, SITES..."
            value={searchTerm}
            onIonInput={(e) => setSearchTerm(e.detail.value || '')}
            animated
          />
        </IonToolbar>

        <IonToolbar style={{ '--background': '#ffffff' }}>
          <div style={{ display: 'flex', gap: '8px', padding: '0 16px 8px 16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <IonSelect
              value={statusFilter}
              onIonChange={(e) => setStatusFilter(e.detail.value)}
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
              onIonChange={(e) => setSiteFilter(e.detail.value)}
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
            message={searchTerm || statusFilter !== 'all' ? 'TRY ADJUSTING YOUR FILTERS' : 'CLICK NEW SCHEDULE TO PLAN AN INSPECTION'}
          />
        ) : (
          <IonGrid style={{ padding: 0 }}>
            <IonRow>
              {filteredSchedules.map((s) => {
                const currentStatus = s.schedule_status || s.status || 'SCHEDULED';
                const statusUpper = currentStatus.toUpperCase();

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
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '8px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', marginBottom: '12px' }}>
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

                        {/* Status Action Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {statusUpper === 'SCHEDULED' && (
                              <IonButton
                                size="small"
                                fill="outline"
                                color="warning"
                                onClick={() => handleStatusChange(s.schedule_id, 'IN_PROGRESS')}
                              >
                                <IonIcon icon={playOutline} slot="start" /> Start
                              </IonButton>
                            )}

                            {statusUpper === 'IN_PROGRESS' && (
                              <IonButton
                                size="small"
                                fill="solid"
                                color="success"
                                onClick={() => handleStatusChange(s.schedule_id, 'COMPLETED')}
                              >
                                <IonIcon icon={checkmarkCircleOutline} slot="start" /> Complete
                              </IonButton>
                            )}

                            {statusUpper !== 'COMPLETED' && statusUpper !== 'CANCELLED' && (
                              <IonButton
                                size="small"
                                fill="clear"
                                color="medium"
                                onClick={() => handleStatusChange(s.schedule_id, 'CANCELLED')}
                              >
                                <IonIcon icon={closeCircleOutline} slot="start" /> Cancel
                              </IonButton>
                            )}
                          </div>

                          <IonButton
                            size="small"
                            fill="clear"
                            color="danger"
                            onClick={() => {
                              setSelectedSchedule(s);
                              setShowDeleteAlert(true);
                            }}
                          >
                            <IonIcon icon={trashOutline} />
                          </IonButton>
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                );
              })}
            </IonRow>
          </IonGrid>
        )}

        {/* Schedule Creation Modal */}
        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
              <IonTitle>NEW INSPECTION SCHEDULE</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>CLOSE</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            <IonSelect
              label="SELECT INSPECTION SITE"
              labelPlacement="floating"
              placeholder="CHOOSE A SITE"
              value={form.inspection_site_id}
              onIonChange={e => setForm({ ...form, inspection_site_id: e.detail.value })}
              style={{ marginBottom: '14px' }}
            >
              {sites.map(s => (
                <IonSelectOption key={s.id} value={s.id.toString()}>
                  {s.site_name} ({s.site_code})
                </IonSelectOption>
              ))}
            </IonSelect>

            <IonInput
              label="SCHEDULE NAME / PURPOSE"
              labelPlacement="floating"
              placeholder="E.G. ROUTINE QUARTERLY ODOR & NH3 AUDIT"
              value={form.schedule_name}
              onIonInput={e => setForm({ ...form, schedule_name: e.detail.value || '' })}
              style={{ marginBottom: '14px' }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <IonInput
                label="SCHEDULED DATE"
                labelPlacement="floating"
                type="date"
                value={form.scheduled_date}
                onIonInput={e => setForm({ ...form, scheduled_date: e.detail.value || '' })}
              />

              <IonInput
                label="SCHEDULED TIME"
                labelPlacement="floating"
                type="time"
                value={form.scheduled_time}
                onIonInput={e => setForm({ ...form, scheduled_time: e.detail.value || '' })}
              />
            </div>

            <IonTextarea
              label="SPECIAL INSTRUCTIONS / NOTES"
              labelPlacement="floating"
              placeholder="Focus on lagoon perimeter, check exhaust vents, inspect biofilters..."
              value={form.notes}
              onIonInput={e => setForm({ ...form, notes: e.detail.value || '' })}
              rows={3}
              style={{ marginBottom: '18px' }}
            />

            <IonButton expand="block" onClick={handleCreate} style={{ '--background': '#1a365d' }}>
              CREATE INSPECTION SCHEDULE
            </IonButton>
          </IonContent>
        </IonModal>

        <DeleteAlert
          isOpen={showDeleteAlert}
          onClose={() => setShowDeleteAlert(false)}
          onConfirm={handleDelete}
          title="DELETE INSPECTION SCHEDULE?"
          message={`Are you sure you want to delete "${selectedSchedule?.schedule_name}"?`}
          requireTypeConfirm={false}
        />

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={4000}
          color={toastColor}
          position="bottom"
        />

        <IonToast
          isOpen={syncToast.isOpen}
          onDidDismiss={dismissSyncToast}
          message={syncToast.message}
          duration={syncToast.duration}
          color={syncToast.color}
          position="bottom"