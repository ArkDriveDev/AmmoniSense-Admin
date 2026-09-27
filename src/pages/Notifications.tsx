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
  IonButton,
  IonButtons,
  IonSearchbar,
  IonIcon,
  IonToast
} from '@ionic/react';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { refreshOutline, alertCircleOutline, businessOutline, hardwareChipOutline, pricetagOutline } from 'ionicons/icons';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { InspectionTagDetails, InspectionTag } from '../types/schema';
import useSyncFeedback from '../hooks/useSyncFeedback';

export interface AlertItem {
  id: number;
  tag_name: string;
  device_uid: string | null;
  site_name: string | null;
  site_code: string | null;
  schedule_name: string | null;
  ammonia: number | null;
  severity: 'CRITICAL' | 'HIGH' | 'WARNING';
  created_at: string;
  photo_url: string | null;
  is_read: boolean;
}

export default function Notifications() {
  const { syncToast, triggerSync, dismissSyncToast } = useSyncFeedback();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Query inspection_tag_details view or inspection_tags for warning/critical ammonia readings
      const { data, error } = await supabase
        .from('inspection_tag_details')
        .select('*')
        .or('status.eq.CRITICAL,status.eq.HIGH,status.eq.WARNING,ammonia.gt.25')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        const formatted: AlertItem[] = data.map((t: InspectionTagDetails) => {
          const isCritical = (t.status || '').toUpperCase() === 'CRITICAL' || (t.ammonia || 0) > 50;
          const isHigh = (t.status || '').toUpperCase() === 'HIGH' || ((t.ammonia || 0) > 35 && (t.ammonia || 0) <= 50);
          return {
            id: t.tag_id,
            tag_name: t.tag_name,
            device_uid: t.device_uid,
            site_name: t.site_name,
            site_code: t.site_code,
            schedule_name: t.schedule_name,
            ammonia: t.ammonia,
            severity: isCritical ? 'CRITICAL' : isHigh ? 'HIGH' : 'WARNING',
            created_at: t.created_at,
            photo_url: t.photo_thumbnail_url || t.photo_url,
            is_read: false
          };
        });
        setAlerts(formatted);
      } else {
        // Fallback to direct inspection_tags query
        const { data: rawTags } = await supabase
          .from('inspection_tags')
          .select('*')
          .or('status.eq.CRITICAL,status.eq.HIGH,status.eq.WARNING,ammonia.gt.25')
          .order('created_at', { ascending: false })
          .limit(100);

        if (rawTags) {
          const formatted: AlertItem[] = rawTags.map((t: InspectionTag) => {
            const isCritical = (t.status || '').toUpperCase() === 'CRITICAL' || (t.ammonia || 0) > 50;
            const isHigh = (t.status || '').toUpperCase() === 'HIGH' || ((t.ammonia || 0) > 35 && (t.ammonia || 0) <= 50);
            return {
              id: t.id,
              tag_name: t.tag_name,
              device_uid: t.device_uid || null,
              site_name: null,
              site_code: null,
              schedule_name: null,
              ammonia: t.ammonia ?? null,
              severity: isCritical ? 'CRITICAL' : isHigh ? 'HIGH' : 'WARNING',
              created_at: t.created_at || new Date().toISOString(),
              photo_url: t.photo_thumbnail_url || t.photo_url || null,
              is_read: false
            };
          });
          setAlerts(formatted);
        } else {
          setAlerts([]);
        }
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    let result = [...alerts];

    if (filterSeverity !== 'all') {
      result = result.filter(a => a.severity === filterSeverity);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(a =>
        a.tag_name?.toLowerCase().includes(term) ||
        a.device_uid?.toLowerCase().includes(term) ||
        a.site_name?.toLowerCase().includes(term) ||
        a.severity?.toLowerCase().includes(term) ||
        a.ammonia?.toString().includes(term)
      );
    }

    setFilteredAlerts(result);
  }, [alerts, searchTerm, filterSeverity]);

  const markAsRead = (id: number) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
  };

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
  };

  const getBadgeColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'warning';
      case 'WARNING': return 'warning';
      default: return 'medium';
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontWeight: 'bold' }}>ENVIRONMENTAL ALERTS & CRITICAL READINGS</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={markAllAsRead}>MARK ALL READ</IonButton>
            <IonButton onClick={() => triggerSync(fetchAlerts)}>
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>

        <IonToolbar style={{ '--background': '#f8fafc' }}>
          <IonSearchbar
            placeholder="SEARCH ALERTS, TAGS, DEVICES, SITES..."
            value={searchTerm}
            onIonInput={(e) => setSearchTerm(e.detail.value || '')}
            animated
          />
        </IonToolbar>

        <IonToolbar style={{ '--background': '#ffffff' }}>
          <div style={{ display: 'flex', gap: '8px', padding: '0 16px 8px 16px', flexWrap: 'wrap' }}>
            <IonButton 
              size="small" 
              fill={filterSeverity === 'all' ? 'solid' : 'outline'}
              onClick={() => setFilterSeverity('all')}
            >
              ALL
            </IonButton>
            <IonButton 
              size="small" 
              fill={filterSeverity === 'CRITICAL' ? 'solid' : 'outline'}
              color="danger"
              onClick={() => setFilterSeverity('CRITICAL')}
            >
              {"CRITICAL (>50 PPM)"}
            </IonButton>
            <IonButton 
              size="small" 
              fill={filterSeverity === 'HIGH' ? 'solid' : 'outline'}
              color="warning"
              onClick={() => setFilterSeverity('HIGH')}
            >
              {"HIGH (35-50 PPM)"}
            </IonButton>
            <IonButton 
              size="small" 
              fill={filterSeverity === 'WARNING' ? 'solid' : 'outline'}
              color="warning"
              onClick={() => setFilterSeverity('WARNING')}
            >
              {"WARNING (25-35 PPM)"}
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f1f5f9' }}>
        {loading ? (
          <LoadingSpinner />
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            title="NO ACTIVE ALERTS"
            message={searchTerm || filterSeverity !== 'all' ? 'TRY DIFFERENT FILTERS' : 'ALL INSPECTION SITES AND TAGS ARE WITHIN SAFE AMMONIA LIMITS'}
          />
        ) : (
          <IonList style={{ background: 'transparent' }}>
            {filteredAlerts.map((a) => (
              <IonItem
                key={a.id}
                button
                onClick={() => markAsRead(a.id)}
                style={{
                  '--background': '#ffffff',
                  borderRadius: '12px',
                  marginBottom: '10px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  borderLeft: `4px solid ${a.severity === 'CRITICAL' ? '#dc2626' : '#f59e0b'}`
                }}
              >
                <IonLabel style={{ margin: '14px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <IonIcon icon={alertCircleOutline} style={{ color: a.severity === 'CRITICAL' ? '#dc2626' : '#f59e0b', fontSize: '18px' }} />
                    <h2 style={{ color: a.severity === 'CRITICAL' ? '#dc2626' : '#d97706', fontWeight: 'bold', margin: 0, fontSize: '16px' }}>
                      {a.severity} AMMONIA EXCEEDANCE
                    </h2>
                  </div>

                  <p style={{ color: '#1a365d', fontWeight: 'bold', fontSize: '14px', margin: '3px 0' }}>
                    AMMONIA: {a.ammonia?.toFixed(1) || '0'} PPM
                  </p>

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', color: '#475569', fontSize: '12px', margin: '4px 0' }}>
                    {a.tag_name && (
                      <span>
                        <IonIcon icon={pricetagOutline} style={{ verticalAlign: 'middle', marginRight: '3px', color: '#0891b2' }} />
                        Tag: {a.tag_name}
                      </span>
                    )}

                    {a.site_name && (
                      <span>
                        <IonIcon icon={businessOutline} style={{ verticalAlign: 'middle', marginRight: '3px', color: '#059669' }} />
                        Site: {a.site_name}
                      </span>
                    )}

                    {a.device_uid && (
                      <span>
                        <IonIcon icon={hardwareChipOutline} style={{ verticalAlign: 'middle', marginRight: '3px', color: '#1a365d' }} />
                        Device: {a.device_uid}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                    Logged: {new Date(a.created_at).toLocaleString()}
                  </p>
                </IonLabel>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <IonBadge color={getBadgeColor(a.severity)}>
                    {a.severity}
                  </IonBadge>
                  {a.is_read ? (
                    <IonBadge color="medium">READ</IonBadge>
                  ) : (
                    <IonBadge color="primary">NEW</IonBadge>
                  )}
                </div>
              </IonItem>
            ))}
          </IonList>
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