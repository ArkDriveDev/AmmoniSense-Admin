import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

export interface GridCell {
  id: string;
  bounds: L.LatLngBounds;
  center: L.LatLng;
  row: number;
  col: number;
}

export interface SensorReadingMarker {
  id: number | string;
  latitude: number;
  longitude: number;
  ammonia: number;
  grid_cell_id?: string;
  device_uid?: string;
  created_at: string;
  photo_url?: string;
  status?: string;
  notes?: string;
}

interface SiteGridMapProps {
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  siteName?: string;
  readings?: SensorReadingMarker[];
  selectedCellId?: string;
  onSelectCell?: (cellId: string, lat: number, lng: number) => void;
  gridSize?: number;
  cellSizeMeters?: number;
  height?: string;
}

const metersToLatLngOffset = (meters: number, lat: number) => {
  const latOffset = meters / 111111;
  const lngOffset = meters / (111111 * Math.cos((lat * Math.PI) / 180));
  return { latOffset, lngOffset };
};

const getStatusColor = (ammonia: number, status?: string) => {
  if (status === 'critical' || ammonia > 50) return '#dc2626'; // Danger Red
  if (status === 'warning' || ammonia > 25) return '#f59e0b'; // Amber Warning
  return '#2d7d46'; // Emerald Green
};

export const SiteGridMap: React.FC<SiteGridMapProps> = ({
  centerLat = 14.5995,
  centerLng = 120.9842,
  zoom = 18,
  siteName = 'Monitoring Site',
  readings = [],
  selectedCellId = '',
  onSelectCell,
  gridSize = 6,
  cellSizeMeters = 50,
  height = '440px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const gridLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeCellId, setActiveCellId] = useState<string>(selectedCellId);
  const [currentZoom, setCurrentZoom] = useState<number>(zoom);

  useEffect(() => {
    setActiveCellId(selectedCellId);
  }, [selectedCellId]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: zoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | MENRO Admin',
      maxZoom: 21,
    }).addTo(map);

    gridLayerGroupRef.current = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = L.layerGroup().addTo(map);

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([centerLat, centerLng], currentZoom);
    }
  }, [centerLat, centerLng]);

  useEffect(() => {
    if (!mapRef.current || !gridLayerGroupRef.current || !markersLayerGroupRef.current) return;

    const gridGroup = gridLayerGroupRef.current;
    const markersGroup = markersLayerGroupRef.current;

    gridGroup.clearLayers();
    markersGroup.clearLayers();

    let effectiveCellMeters = cellSizeMeters;
    if (currentZoom < 16) {
      effectiveCellMeters = cellSizeMeters * 2;
    } else if (currentZoom >= 19) {
      effectiveCellMeters = cellSizeMeters / 2;
    }

    const { latOffset, lngOffset } = metersToLatLngOffset(effectiveCellMeters, centerLat);

    const halfGrid = Math.floor(gridSize / 2);
    const startLat = centerLat - halfGrid * latOffset;
    const startLng = centerLng - halfGrid * lngOffset;

    const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const colLetter = cols[c] || `C${c + 1}`;
        const rowNum = r + 1;
        const cellId = `${colLetter}${rowNum}`;

        const south = startLat + r * latOffset;
        const north = south + latOffset;
        const west = startLng + c * lngOffset;
        const east = west + lngOffset;

        const bounds = L.latLngBounds([
          [south, west],
          [north, east],
        ]);
        const center = bounds.getCenter();

        const isSelected = activeCellId === cellId;

        const rectangle = L.rectangle(bounds, {
          color: isSelected ? '#1a365d' : '#2d7d46',
          weight: isSelected ? 3 : 1.5,
          fillColor: isSelected ? '#1a365d' : '#2d7d46',
          fillOpacity: isSelected ? 0.35 : 0.08,
          dashArray: isSelected ? undefined : '4, 4',
        });

        const labelIcon = L.divIcon({
          className: 'grid-cell-label',
          html: `<div style="
            font-weight: 700;
            font-size: 11px;
            color: ${isSelected ? '#ffffff' : '#1a365d'};
            background: ${isSelected ? '#1a365d' : 'rgba(255, 255, 255, 0.9)'};
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid ${isSelected ? '#1a365d' : '#cbd5e1'};
            box-shadow: 0 1px 3px rgba(0,0,0,0.15);
            text-align: center;
            white-space: nowrap;
          ">${cellId}</div>`,
          iconSize: [36, 20],
          iconAnchor: [18, 10],
        });

        const labelMarker = L.marker(center, { icon: labelIcon, interactive: false });

        rectangle.on('click', () => {
          setActiveCellId(cellId);
          if (onSelectCell) {
            onSelectCell(cellId, center.lat, center.lng);
          }
        });

        gridGroup.addLayer(rectangle);
        gridGroup.addLayer(labelMarker);
      }
    }

    readings.forEach((reading) => {
      const color = getStatusColor(reading.ammonia, reading.status);

      const circleMarker = L.circleMarker([reading.latitude, reading.longitude], {
        radius: 9,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      });

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; min-width: 170px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <h4 style="margin: 0; font-size: 14px; color: ${color}; font-weight: 700;">
              NH₃: ${reading.ammonia.toFixed(1)} ppm
            </h4>
            <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; color: white; background: ${color}; text-transform: uppercase;">
              ${reading.status || (reading.ammonia > 50 ? 'Critical' : reading.ammonia > 25 ? 'Warning' : 'Normal')}
            </span>
          </div>
          <div style="font-size: 12px; color: #334155; margin-bottom: 2px;">
            <b>Grid Cell:</b> ${reading.grid_cell_id || 'N/A'}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
            <b>Device:</b> ${reading.device_uid || 'N/A'}
          </div>
          <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">
            ${new Date(reading.created_at).toLocaleString()}
          </div>
          ${
            reading.photo_url
              ? `<img src="${reading.photo_url}" style="width: 100%; max-height: 120px; object-fit: cover; border-radius: 6px; margin-top: 4px; border: 1px solid #cbd5e1;" alt="Inspection photo" />`
              : ''
          }
        </div>
      `;

      circleMarker.bindPopup(popupContent);
      markersGroup.addLayer(circleMarker);
    });
  }, [centerLat, centerLng, activeCellId, readings, gridSize, cellSizeMeters, currentZoom]);

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      <div style={{
        position: 'absolute',
        top: '12px',
        left: '50px',
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        padding: '6px 14px',
        borderRadius: '20px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.12)',
        fontSize: '12px',
        fontWeight: 600,
        color: '#1a365d',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2d7d46' }}></span>
        {siteName} {activeCellId ? `• Selected Grid: ${activeCellId}` : '• Tap grid cell to inspect'}
      </div>
    </div>
  );
};

export default SiteGridMap;
