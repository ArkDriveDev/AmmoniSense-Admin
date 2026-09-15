import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IonIcon } from '@ionic/react';
import {
  mapOutline,
  earthOutline,
  locateOutline
} from 'ionicons/icons';
import {
  MANOLO_FORTICH_DEFAULTS,
  MANOLO_FORTICH_BOUNDARY,
  TILE_LAYERS
} from './mapConstants';

interface SiteOdorMapProps {
  latitude: number;
  longitude: number;
  siteName: string;
  ammonia: number | null;
  areaHectares?: number;
  height?: string;
}

export const SiteOdorMap: React.FC<SiteOdorMapProps> = ({
  latitude = MANOLO_FORTICH_DEFAULTS.lat,
  longitude = MANOLO_FORTICH_DEFAULTS.lng,
  siteName = 'Monitoring Site',
  ammonia = 0,
  areaHectares = 1,
  height = '320px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const labelTileLayerRef = useRef<L.TileLayer | null>(null);
  const zonesLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapLayer, setMapLayer] = useState<'street' | 'satellite'>('street');

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      minZoom: 11,
      maxZoom: 18,
      zoomControl: true,
    });

    const streetLayer = L.tileLayer(TILE_LAYERS.street.url, {
      attribution: TILE_LAYERS.street.attribution,
      maxNativeZoom: TILE_LAYERS.street.maxNativeZoom,
      maxZoom: TILE_LAYERS.street.maxZoom,
    }).addTo(map);

    baseTileLayerRef.current = streetLayer;
    zonesLayerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Trigger invalidateSize to prevent tile split/slice on initial render or card expansion
    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 350);

    let resizeTimer: any = null;
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        }, 200);
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (resizeTimer) clearTimeout(resizeTimer);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update center when props change
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([latitude, longitude], 15);
    }
  }, [latitude, longitude]);

  // Handle Street / Satellite Tile Switching
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
      baseTileLayerRef.current = null;
    }
    if (labelTileLayerRef.current) {
      map.removeLayer(labelTileLayerRef.current);
      labelTileLayerRef.current = null;
    }

    if (mapLayer === 'satellite') {
      const satLayer = L.tileLayer(TILE_LAYERS.satellite.url, {
        attribution: TILE_LAYERS.satellite.attribution,
        maxNativeZoom: TILE_LAYERS.satellite.maxNativeZoom,
        maxZoom: TILE_LAYERS.satellite.maxZoom,
      }).addTo(map);

      const labelsLayer = L.tileLayer(TILE_LAYERS.satelliteLabels.url, {
        attribution: TILE_LAYERS.satelliteLabels.attribution,
        maxNativeZoom: TILE_LAYERS.satelliteLabels.maxNativeZoom,
        maxZoom: TILE_LAYERS.satelliteLabels.maxZoom,
      }).addTo(map);

      baseTileLayerRef.current = satLayer;
      labelTileLayerRef.current = labelsLayer;
    } else {
      const streetLayer = L.tileLayer(TILE_LAYERS.street.url, {
        attribution: TILE_LAYERS.street.attribution,
        maxNativeZoom: TILE_LAYERS.street.maxNativeZoom,
        maxZoom: TILE_LAYERS.street.maxZoom,
      }).addTo(map);
      baseTileLayerRef.current = streetLayer;
    }
  }, [mapLayer]);

  // Render Odor Dispersion Zones & Buffer Boundaries
  useEffect(() => {
    if (!mapRef.current || !zonesLayerGroupRef.current) return;
    const zonesGroup = zonesLayerGroupRef.current;
    zonesGroup.clearLayers();

    const nh3Val = ammonia || 0;
    let plumeColor = '#2d7d46';
    let plumeOpacity = 0.25;
    if (nh3Val > 50) {
      plumeColor = '#dc2626';
      plumeOpacity = 0.4;
    } else if (nh3Val > 25) {
      plumeColor = '#f59e0b';
      plumeOpacity = 0.35;
    }

    const baseRadius = Math.sqrt(((areaHectares || 1) * 10000) / Math.PI);
    const innerOdorRadius = Math.max(80, baseRadius + nh3Val * 3);
    const outerOdorRadius = innerOdorRadius * 2.2;

    // 0. Manolo Fortich Municipal Boundary (Subtle context)
    const boundaryPolygon = L.polygon(MANOLO_FORTICH_BOUNDARY, {
      color: '#1a365d',
      weight: 1.5,
      dashArray: '8, 6',
      fillColor: '#3b82f6',
      fillOpacity: 0.02,
      interactive: false,
    });
    zonesGroup.addLayer(boundaryPolygon);

    // 1. Extended Community Buffer Perimeter (1000m)
    const commBuffer = L.circle([latitude, longitude], {
      radius: 1000,
      color: '#64748b',
      weight: 1.5,
      dashArray: '6, 6',
      fillColor: '#94a3b8',
      fillOpacity: 0.05,
      interactive: false,
    });
    zonesGroup.addLayer(commBuffer);

    // 2. Residential Buffer Boundary (500m)
    const resBuffer = L.circle([latitude, longitude], {
      radius: 500,
      color: '#3b82f6',
      weight: 2,
      dashArray: '4, 4',
      fillColor: '#60a5fa',
      fillOpacity: 0.08,
      interactive: false,
    });
    zonesGroup.addLayer(resBuffer);

    // 3. Outer Odor Plume
    const outerPlume = L.circle([latitude, longitude], {
      radius: outerOdorRadius,
      color: plumeColor,
      weight: 1.5,
      fillColor: plumeColor,
      fillOpacity: plumeOpacity * 0.5,
      interactive: false,
    });
    zonesGroup.addLayer(outerPlume);

    // 4. Inner High Ammonia Core
    const innerPlume = L.circle([latitude, longitude], {
      radius: innerOdorRadius,
      color: plumeColor,
      weight: 2.5,
      fillColor: plumeColor,
      fillOpacity: plumeOpacity,
      interactive: false,
    });
    zonesGroup.addLayer(innerPlume);

    // 5. Site Center Pin Marker & Popup
    const siteIcon = L.divIcon({
      className: 'custom-site-pin',
      html: `<div style="background-color: ${plumeColor}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.3); border: 3px solid white;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 512 512" fill="currentColor"><path d="M448 64H64a32 32 0 00-32 32v320a32 32 0 0032 32h384a32 32 0 0032-32V96a32 32 0 00-32-32zm-32 336H96V112h320zM128 144h64v64h-64zm96 0h64v64h-64zm96 0h64v64h-64zM128 240h64v64h-64zm96 0h64v64h-64zm96 0h64v64h-64zM128 336h64v48h-64zm96 0h64v48h-64zm96 0h64v48h-64z"/></svg>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([latitude, longitude], { icon: siteIcon });
    marker.bindPopup(`
      <div style="font-family: system-ui, sans-serif; min-width: 180px; padding: 4px;">
        <h4 style="margin: 0 0 6px 0; color: #1a365d; font-size: 14px; font-weight: 700;">${siteName}</h4>
        <div style="font-size: 12px; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
          <span>Latest NH₃:</span>
          <strong style="color: ${plumeColor}; font-size: 13px;">${nh3Val > 0 ? nh3Val.toFixed(1) + ' ppm' : 'No Data'}</strong>
        </div>
        <div style="font-size: 11px; color: #475569;"><b>Primary Odor Radius:</b> ~${Math.round(innerOdorRadius)}m</div>
        <div style="font-size: 11px; color: #475569;"><b>Community Buffer:</b> 500m Boundary</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Manolo Fortich, Bukidnon</div>
      </div>
    `);
    zonesGroup.addLayer(marker);
  }, [latitude, longitude, siteName, ammonia, areaHectares]);

  const handleCenterSite = () => {
    if (mapRef.current) {
      mapRef.current.setView([latitude, longitude], 15);
    }
  };

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{ position: 'relative', width: '100%', height, borderRadius: '10px', overflow: 'hidden', border: '1px solid #cbd5e1' }}
    >
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Street / Satellite Controls */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(6px)',
        padding: '3px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      }}>
        <button
          type="button"
          onClick={() => setMapLayer('street')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 700,
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            backgroundColor: mapLayer === 'street' ? '#1a365d' : 'transparent',
            color: mapLayer === 'street' ? '#ffffff' : '#64748b',
          }}
        >
          <IonIcon icon={mapOutline} style={{ fontSize: '12px' }} />
          Street
        </button>

        <button
          type="button"
          onClick={() => setMapLayer('satellite')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 700,
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            backgroundColor: mapLayer === 'satellite' ? '#1a365d' : 'transparent',
            color: mapLayer === 'satellite' ? '#ffffff' : '#64748b',
          }}
        >
          <IonIcon icon={earthOutline} style={{ fontSize: '12px' }} />
          Satellite
        </button>

        <button
          type="button"
          onClick={handleCenterSite}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 6px',
            fontSize: '11px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            backgroundColor: '#f1f5f9',
            color: '#1a365d',
          }}
          title="Center on Site"
        >
          <IonIcon icon={locateOutline} style={{ fontSize: '13px', color: '#047857' }} />
        </button>
      </div>

      {/* Map Legend Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(6px)',
        padding: '8px 12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        fontSize: '11px',
        color: '#1e293b',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div style={{ fontWeight: 700, marginBottom: '2px', color: '#1a365d' }}>Spatial Impact Legend</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: ammonia && ammonia > 50 ? '#dc2626' : ammonia && ammonia > 25 ? '#f59e0b' : '#2d7d46' }}></span>
          <span>Odor Dispersion Plume</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px dashed #3b82f6', backgroundColor: 'rgba(96,165,250,0.2)' }}></span>
          <span>Community Buffer (500m)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px dashed #64748b' }}></span>
          <span>Perimeter Boundary (1000m)</span>
        </div>
      </div>
    </div>
  );
};

export default SiteOdorMap;
