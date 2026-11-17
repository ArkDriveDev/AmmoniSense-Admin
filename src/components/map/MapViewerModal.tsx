import React, { useEffect, useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon
} from '@ionic/react';
import { closeOutline, locationOutline } from 'ionicons/icons';
import SpatialPolygonMap, { SensorReadingMarker } from './SpatialPolygonMap';
import { MANOLO_FORTICH_DEFAULTS } from './mapConstants';
import { supabase } from '../../services/supabase';

interface MapViewerModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  title?: string;
  latitude: number;
  longitude: number;
  siteName?: string;
  siteId?: number;
  areaHectares?: number | null;
  readings?: SensorReadingMarker[];
  onSelectSite?: (siteId: number) => void;
}

export const MapViewerModal: React.FC<MapViewerModalProps> = ({
  isOpen,
  onDismiss,
  title = 'Spatial Polygon Map',
  latitude,
  longitude,
  siteName = 'Inspection Site',
  siteId,
  areaHectares,
  readings = [],
  onSelectSite,
}) => {
  const currentLat = latitude || MANOLO_FORTICH_DEFAULTS.lat;
  const currentLng = longitude || MANOLO_FORTICH_DEFAULTS.lng;

  const [siteReadings, setSiteReadings] = useState<SensorReadingMarker[]>(readings);
  const [siteHighestPpm, setSiteHighestPpm] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (readings && readings.length > 0) {
      setSiteReadings(readings);
      const maxVal = Math.max(...readings.map((r) => r.ammonia || 0));
      setSiteHighestPpm(maxVal > 0 ? maxVal : null);
      return;
    }

    if (!siteId) return;

    // Fetch site tags and sensor_data to get the highest PPM for this site
    const loadSiteMapData = async () => {
      try {
        const { data: tagRows } = await supabase
          .from('inspection_tags')
          .select('*')
          .eq('inspection_site_id', siteId)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('created_at', { ascending: false });

        if (tagRows && tagRows.length > 0) {
          const tagIds = tagRows.map((t) => t.id).filter(Boolean);
          let tagPpmMap: Record<number, { sum: number; count: number }> = {};

          if (tagIds.length > 0) {
            try {
              const { data: sData } = await supabase
                .from('sensor_data')
                .select('inspection_tag_id, ammonia')
                .in('inspection_tag_id', tagIds)
                .not('ammonia', 'is', null);

              if (sData) {
                sData.forEach((sd) => {
                  if (sd.inspection_tag_id && sd.ammonia !== null && sd.ammonia !== undefined) {
                    const val = Number(sd.ammonia);
                    if (!tagPpmMap[sd.inspection_tag_id]) {
                      tagPpmMap[sd.inspection_tag_id] = { sum: 0, count: 0 };
                    }
                    tagPpmMap[sd.inspection_tag_id].sum += val;
                    tagPpmMap[sd.inspection_tag_id].count += 1;
                  }
                });
              }
            } catch (err) {
              console.warn('Could not query sensor_data for modal:', err);
            }
          }

          let overallSum = 0;
          let overallCount = 0;
          const mapped = tagRows.map((t) => {
            const stats = tagPpmMap[t.id];
            const hasSensors = stats && stats.count > 0;
            const tagAvg = hasSensors
              ? stats.sum / stats.count
              : (t.ammonia !== null && t.ammonia !== undefined ? Number(t.ammonia) : null);
            const count = hasSensors ? stats.count : (t.ammonia !== null && t.ammonia !== undefined ? 1 : 0);

            if (tagAvg !== null && !isNaN(tagAvg)) {
              overallSum += tagAvg;
              overallCount++;
            }

            return {
              id: t.id,
              latitude: t.latitude,
              longitude: t.longitude,
              ammonia: tagAvg,
              avg_ammonia: tagAvg,
              reading_count: count,
              device_uid: t.device_uid || t.tag_name,
              created_at: t.created_at,
              photo_url: t.photo_thumbnail_url || t.photo_url || undefined,
              status: t.status,
              site_name: siteName,
            };
          });

          setSiteReadings(mapped);
          setSiteHighestPpm(overallCount > 0 ? overallSum / overallCount : null);
        } else {
          setSiteReadings([]);
          setSiteHighestPpm(null);
        }
      } catch (err) {
        console.warn('Could not load site readings for map viewer:', err);
      }
    };

    loadSiteMapData();
  }, [isOpen, siteId, readings, siteName]);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontSize: '16px', fontWeight: 'bold' }}>
            <IonIcon icon={locationOutline} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            {title}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDismiss}>
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a365d', marginBottom: '2px' }}>
              {siteName}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              GPS Coordinates: {currentLat?.toFixed(6)}°, {currentLng?.toFixed(6)}° &bull; Manolo Fortich, Bukidnon
            </div>
          </div>
          {siteHighestPpm !== null && (
            <div style={{ backgroundColor: siteHighestPpm > 25 ? '#fee2e2' : '#dcfce7', color: siteHighestPpm > 25 ? '#dc2626' : '#15803d', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>
              Avg Level: {siteHighestPpm.toFixed(2)} PPM
            </div>
          )}
        </div>

        <SpatialPolygonMap
          centerLat={currentLat}
          centerLng={currentLng}
          siteName={siteName}
          markerStyle="default"
          showAreaCircle={false}
          sites={[
            {
              id: siteId || 'focus-site',
              site_name: siteName,
              latitude: currentLat,
              longitude: currentLng,
              highest_ammonia: siteHighestPpm,
              latest_ammonia: siteHighestPpm,
              avg_ammonia_latest_schedule: siteHighestPpm,
            }
          ]}
          readings={siteReadings.length > 0 ? siteReadings : []}
          onSelectSite={(id) => {
            onDismiss();
            if (onSelectSite && typeof id === 'number') {
              onSelectSite(id);
            }
          }}
          height="500px"
        />

        <div style={{ marginTop: '16px' }}>
          <IonButton expand="block" fill="outline" color="dark" onClick={onDismiss}>
            Close Map
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default MapViewerModal;
