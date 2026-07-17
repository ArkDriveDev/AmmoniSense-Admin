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
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonSearchbar,
  IonSelect,
  IonSelectOption
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { refreshOutline } from 'ionicons/icons';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SensorData() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [devices, setDevices] = useState<any[]>([]);

  useEffect(() => {
    fetchDevices();
    fetchLogs();
    
    if (realtimeEnabled) {
      const subscription = supabase
        .channel('sensor_data_channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'sensor_data'
          },
          (payload) => {
            setLogs(prev => [payload.new, ...prev]);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [realtimeEnabled]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, deviceFilter]);

  const fetchDevices = async () => {
    const { data } = await supabase
      .from('devices')
      .select('device_uid')
      .order('device_uid');
    setDevices(data || []);
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sensor_data')
        .select(`
          *,
          devices (
            device_uid,
            livestock_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('Error fetching sensor data:', error);
        return;
      }

      setLogs(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let result = [...logs];

    if (deviceFilter !== 'all') {
      result = result.filter(l => l.device_uid === deviceFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(l =>
        l.device_uid?.toLowerCase().includes(term) ||
        l.status?.toLowerCase().includes(term) ||
        l.ammonia?.toString().includes(term) ||
        l.battery?.toString().includes(term)
      );
    }

    setFilteredLogs(result);
  };

  const handleRefresh = async (event: CustomEvent) => {
    await fetchLogs();
    event.detail.complete();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>SENSOR DATA</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setRealtimeEnabled(!realtimeEnabled)}>
              {realtimeEnabled ? 'LIVE' : 'PAUSED'}
            </IonButton>
            <IonButton onClick={fetchLogs}>
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            placeholder="SEARCH SENSOR DATA..."
            value={searchTerm}
            onIonChange={(e) => setSearchTerm(e.detail.value || '')}
            animated
          />
        </IonToolbar>
        <IonToolbar>
          <IonSelect
            value={deviceFilter}
            placeholder="FILTER BY DEVICE"
            onIonChange={(e) => setDeviceFilter(e.detail.value)}
            style={{ padding: '0 16px' }}
          >
            <IonSelectOption value="all">ALL DEVICES</IonSelectOption>
            {devices.map((d) => (
              <IonSelectOption key={d.device_uid} value={d.device_uid}>
                {d.device_uid}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {loading ? (
          <LoadingSpinner />
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            title="NO SENSOR DATA"
            message={searchTerm || deviceFilter !== 'all' ? 'TRY DIFFERENT FILTERS' : 'WAITING FOR DATA FROM DEVICES'}
          />
        ) : (
          <IonList>
            {filteredLogs.map((l) => (
              <IonItem key={l.id}>
                <IonLabel>
                  <h2>AMMONIA: {l.ammonia} PPM</h2>
                  <p>DEVICE: {l.device_uid || 'UNKNOWN'}</p>
                  <p>BATTERY: {l.battery}%</p>
                  <p>SUNLIGHT: {l.sunlight} LUX</p>
                  <p style={{ fontSize: '12px', color: 'gray' }}>
                    {new Date(l.created_at).toLocaleString()}
                  </p>
                </IonLabel>
                <IonBadge color={
                  l.status === 'SEVERE' ? 'danger' :
                  l.status === 'MODERATE' ? 'warning' :
                  l.status === 'LOW' ? 'success' :
                  'medium'
                }>
                  {l.status || 'UNKNOWN'}
                </IonBadge>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
}