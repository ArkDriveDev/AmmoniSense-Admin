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
      }
    } catch (err) {
      console.error('Unexpected error fetching notifications:', err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAlerts = () => {
    let result = [...alerts];

    if (filterSeverity !== 'all') {
      result = result.filter(a => a.severity === filterSeverity);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(a =>
        a.device_uid?.toLowerCase().includes(term) ||
        a.severity?.toLowerCase().includes(term) ||
        a.ammonia?.toString().includes(term)
      );
    }

    setFilteredAlerts(result);
  };

  const markAsRead = (id: number) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
  };

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontWeight: 'bold' }}>ENVIRONMENTAL ALERTS</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={markAllAsRead}>MARK ALL READ</IonButton>
            <IonButton onClick={fetchAlerts}>
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar style={{ '--background': '#f8fafc' }}>
          <IonSearchbar
            placeholder="SEARCH ALERTS OR DEVICE..."
            value={searchTerm}
            onIonChange={(e) => setSearchTerm(e.detail.value || '')}
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
              fill={filterSeverity === 'SEVERE' ? 'solid' : 'outline'}
              color="danger"
              onClick={() => setFilterSeverity('SEVERE')}
            >
              {"SEVERE (>50 PPM)"}
            </IonButton>
            <IonButton 
              size="small" 
              fill={filterSeverity === 'MODERATE' ? 'solid' : 'outline'}
              color="warning"
              onClick={() => setFilterSeverity('MODERATE')}
            >
              {"MODERATE (25-50 PPM)"}
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
            message={searchTerm || filterSeverity !== 'all' ? 'TRY DIFFERENT FILTERS' : 'ALL MONITORING SITES NORMAL'}
          />
        ) : (
          <IonList style={{ background: 'transparent' }}>
            {filteredAlerts.map((a) => (
              <IonItem key={a.id} button onClick={() => markAsRead(a.id)} style={{ '--background': '#ffffff', borderRadius: '10px', marginBottom: '8px' }}>
                <IonLabel>
                  <h2 style={{ color: a.severity === 'SEVERE' ? '#dc2626' : '#f59e0b', fontWeight: 'bold' }}>
                    <IonIcon icon={alertCircleOutline} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                    {a.severity} AMMONIA ALERT
                  </h2>
                  <p style={{ color: '#1a365d', fontWeight: 'bold' }}>AMMONIA: {a.ammonia} PPM</p>
                  <p style={{ color: '#475569' }}>DEVICE: {a.device_uid || 'N/A'}</p>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </IonLabel>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <IonBadge color={a.severity === 'SEVERE' ? 'danger' : 'warning'}>
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
      </IonContent>
    </IonPage>
  );
}