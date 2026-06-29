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
  IonSpinner,
  IonSearchbar,
  IonIcon
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { refreshOutline, checkmarkCircleOutline } from 'ionicons/icons';
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
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching alerts:', error);
        return;
      }

      setAlerts(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
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

  const markAsRead = async (id: number) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', id);

      if (error) {
        console.error('Error marking alert as read:', error);
        return;
      }

      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = alerts.filter(a => !a.is_read).map(a => a.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) {
        console.error('Error marking all as read:', error);
        return;
      }

      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>ALERTS</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={markAllAsRead}>MARK ALL READ</IonButton>
            <IonButton onClick={fetchAlerts}>
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            placeholder="SEARCH ALERTS..."
            value={searchTerm}
            onIonChange={(e) => setSearchTerm(e.detail.value || '')}
            animated
          />
        </IonToolbar>
        <IonToolbar>
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
              SEVERE
            </IonButton>
            <IonButton 
              size="small" 
              fill={filterSeverity === 'MODERATE' ? 'solid' : 'outline'}
              color="warning"
              onClick={() => setFilterSeverity('MODERATE')}
            >
              MODERATE
            </IonButton>
            <IonButton 
              size="small" 
              fill={filterSeverity === 'LOW' ? 'solid' : 'outline'}
              color="success"
              onClick={() => setFilterSeverity('LOW')}
            >
              LOW
            </IonButton>
            <IonButton 
              size="small" 
              color="medium"
              fill="outline"
              onClick={() => {
                setSearchTerm('');
                setFilterSeverity('all');
              }}
            >
              RESET
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {loading ? (
          <LoadingSpinner />
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            title="NO ALERTS"
            message={searchTerm || filterSeverity !== 'all' ? 'TRY DIFFERENT FILTERS' : 'ALL SYSTEMS NORMAL'}
          />
        ) : (
          <IonList>
            {filteredAlerts.map((a) => (
              <IonItem key={a.id} button onClick={() => markAsRead(a.id)}>
                <IonLabel>
                  <h2 style={{ color: a.severity === 'SEVERE' ? 'red' : a.severity === 'MODERATE' ? 'orange' : 'green' }}>
                    {a.severity} ALERT
                  </h2>
                  <p>AMMONIA: {a.ammonia} PPM</p>
                  <p>DEVICE: {a.device_uid || 'UNKNOWN'}</p>
                  <p style={{ fontSize: '12px', color: 'gray' }}>
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </IonLabel>
                <div style={{ textAlign: 'right' }}>
                  <IonBadge color={a.severity === 'SEVERE' ? 'danger' : a.severity === 'MODERATE' ? 'warning' : 'success'}>
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