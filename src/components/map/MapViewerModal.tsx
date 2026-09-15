import React from 'react';
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

interface MapViewerModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  title?: string;
  latitude: number;
  longitude: number;
  siteName?: string;
  readings?: SensorReadingMarker[];
}

export const MapViewerModal: React.FC<MapViewerModalProps> = ({
  isOpen,
  onDismiss,
  title = 'Spatial Polygon Map',
  latitude,
  longitude,
  siteName = 'Monitoring Site',
  readings = [],
}) => {
  const currentLat = latitude || MANOLO_FORTICH_DEFAULTS.lat;
  const currentLng = longitude || MANOLO_FORTICH_DEFAULTS.lng;

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
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a365d', marginBottom: '4px' }}>
            {siteName}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            GPS Coordinates: {currentLat?.toFixed(6)}°, {currentLng?.toFixed(6)}° • Manolo Fortich, Bukidnon
          </div>
        </div>

        <SpatialPolygonMap
          centerLat={currentLat}
          centerLng={currentLng}
          siteName={siteName}
          sites={[
            {
              id: 'focus-site',
              site_name: siteName,
              latitude: currentLat,
              longitude: currentLng,
            }
          ]}
          readings={readings.length > 0 ? readings : [
            {
              id: 'focus',
              latitude: currentLat,
              longitude: currentLng,
              ammonia: 0,
              created_at: new Date().toISOString(),
              status: 'normal'
            }
          ]}
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
