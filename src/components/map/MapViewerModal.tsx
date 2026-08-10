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
import SiteGridMap, { SensorReadingMarker } from './SiteGridMap';

interface MapViewerModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  title?: string;
  latitude: number;
  longitude: number;
  siteName?: string;
  gridCellId?: string;
  readings?: SensorReadingMarker[];
}

export const MapViewerModal: React.FC<MapViewerModalProps> = ({
  isOpen,
  onDismiss,
  title = 'Spatial Location Map',
  latitude,
  longitude,
  siteName = 'Monitoring Site',
  gridCellId,
  readings = [],
}) => {
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
            {siteName} {gridCellId ? `(Grid Cell ${gridCellId})` : ''}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            GPS Coordinates: {latitude?.toFixed(6)}°, {longitude?.toFixed(6)}°
          </div>
        </div>

        <SiteGridMap
          centerLat={latitude || 14.5995}
          centerLng={longitude || 120.9842}
          siteName={siteName}
          selectedCellId={gridCellId}
          readings={readings.length > 0 ? readings : [
            {
              id: 'focus',
              latitude: latitude || 14.5995,
              longitude: longitude || 120.9842,
              ammonia: 0,
              grid_cell_id: gridCellId,
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
