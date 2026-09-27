import React from 'react';
import SpatialPolygonMap, {
  SensorReadingMarker,
  InspectionSiteMarker,
  MonitoringSiteMarker,
  OdorZonePolygon
} from './SpatialPolygonMap';

export type { SensorReadingMarker, InspectionSiteMarker, MonitoringSiteMarker, OdorZonePolygon };

// Backward-compatible export without grid cells
export const SiteGridMap = SpatialPolygonMap;
export default SpatialPolygonMap;
