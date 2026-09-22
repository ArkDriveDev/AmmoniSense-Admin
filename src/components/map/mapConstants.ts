/**
 * Manolo Fortich, Bukidnon Geographic Constants and Tile Layers
 */

export const MANOLO_FORTICH_DEFAULTS = {
  lat: 8.3697,
  lng: 124.8640,
  zoom: 13,
  minZoom: 11,
  maxZoom: 18,
  municipalityName: 'Municipality of Manolo Fortich, Bukidnon',
};

// Manolo Fortich, Bukidnon municipal boundary polygon
export const MANOLO_FORTICH_BOUNDARY: [number, number][] = [
  [8.4900, 124.8250], // North / Alae boundary (bordering Misamis Oriental)
  [8.4850, 124.8750], // North-East (Malitbog border)
  [8.4550, 124.9200], // East
  [8.4000, 124.9600], // East / Impasug-ong border
  [8.3500, 124.9750], // South-East (Dahilayan / Lindaban)
  [8.2800, 124.9450], // South-East (Sankanan / Kalugmanan)
  [8.2300, 124.8750], // South / Mount Kitanglad Range (Sumilao border)
  [8.2500, 124.8150], // South-West (Libona border)
  [8.3150, 124.7700], // West (Baungon border / Canyon)
  [8.3850, 124.7450], // North-West (Alae / Puerto border)
  [8.4500, 124.7600], // North-West upper
  [8.4900, 124.8250], // Close loop
];

export const TILE_LAYERS = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | MENRO Manolo Fortich',
    maxNativeZoom: 18,
    maxZoom: 18,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    maxNativeZoom: 17, // Prevents Esri "Map data not available" tile when zooming in close
    maxZoom: 18,
  },
  satelliteLabels: {
    url: 'https://basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png',
    attribution: '&copy; CartoDB',
    maxNativeZoom: 18,
    maxZoom: 18,
  },
};

/**
 * Generate circular polygon coordinates around a center point for odor zones
 */
export function generateOdorZonePolygon(lat: number, lng: number, radiusMeters: number, points = 24): [number, number][] {
  const coords: [number, number][] = [];
  const earthRadius = 6378137; // in meters
  
  for (let i = 0; i <= points; i++) {
    const angle = (i * 360) / points;
    const rad = (angle * Math.PI) / 180;
    
    const latOffset = (radiusMeters * Math.cos(rad)) / earthRadius;
    const lngOffset = (radiusMeters * Math.sin(rad)) / (earthRadius * Math.cos((lat * Math.PI) / 180));
    
    const pointLat = lat + (latOffset * 180) / Math.PI;
    const pointLng = lng + (lngOffset * 180) / Math.PI;
    coords.push([pointLat, pointLng]);
  }
  return coords;
}
