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
  IonIcon
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { refreshOutline, alertCircleOutline } from 'ionicons/icons';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Notifications() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    filterAlerts();
  }, [alerts, searchTerm, filterSeverity]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      // 1. Query sensor_data for high NH3 readings / warnings / critical status
      const { data: sensorAlerts, error: sensorErr } = await supabase
        .from('sensor_data')
        .select('*')
        .or('status.eq.warning,status.eq.critical,ammonia.gt.25')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!sensorErr && sensorAlerts && sensorAlerts.length > 0) {
        const formatted = sensorAlerts.map(s => {
          const isCritical = s.ammonia > 50 || s.status === 'critical';
          return {
            id: s.id,
            device_uid: s.device_uid,
            ammonia: s.ammonia,
            severity: isCritical ? 'SEVERE' : 'MODERATE',
            created_at: s.created_at || s.submitted_at,
            grid_cell_id: s.grid_cell_id,
            is_read: false
          };
        });
        setAlerts(formatted);
        return;
      }

      // 2. Fallback query on legacy alerts table if present
      const { data: legacyData, error: legacyErr } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!legacyErr && legacyData) {
        setAlerts(legacyData);
      } else {
        setAlerts([]);
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
        a.grid_cell_id?.toLowerCase().includes(term) ||
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
                  <p style={{ color: '#475569' }}>DEVICE: {a.device_uid || 'N/A'} {a.grid_cell_id ? `• Grid: ${a.grid_cell_id}` : ''}</p>
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