import React from 'react';
import SpatialPolygonMap, {
  SensorReadingMarker,
  MonitoringSiteMarker,
  OdorZonePolygon
} from './SpatialPolygonMap';

export type { SensorReadingMarker, MonitoringSiteMarker, OdorZonePolygon };

// Backward-compatible export without grid cells
export const SiteGridMap = SpatialPolygonMap;
export default SpatialPolygonMap;
