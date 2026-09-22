import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IonIcon } from '@ionic/react';
import {
  mapOutline,
  earthOutline,
  locateOutline,
  shieldCheckmarkOutline,
  warningOutline
} from 'ionicons/icons';
import {
  MANOLO_FORTICH_DEFAULTS,
  MANOLO_FORTICH_BOUNDARY,
  TILE_LAYERS,
  generateOdorZonePolygon
} from './mapConstants';
import { supabase } from '../../services/supabase';

export interface OdorZonePolygon {
  id: string | number;
  name?: string;
  coordinates?: [number, number][];
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  ammoniaLevel?: number;
  status?: string;
  siteName?: string;
}

export interface SensorReadingMarker {
  id: number | string;
  latitude: number;
  longitude: number;
  ammonia: number;
  device_uid?: string;
  created_at: string;
  photo_url?: string;
  status?: string;
  site_name?: string;
  notes?: string;
}

export interface MonitoringSiteMarker {
  id: number | string;
  site_name: string;
  latitude: number;
  longitude: number;
  site_type?: string;
  owner_name?: string;
  latest_ammonia?: number | null;
  alert_status?: string;
  area_size_hectares?: number;
}

interface SpatialPolygonMapProps {
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  siteName?: string;
  readings?: SensorReadingMarker[];
  sites?: MonitoringSiteMarker[];
  odorZones?: OdorZonePolygon[];
  selectedSiteId?: string | number;
  onSelectSite?: (siteId: string | number, lat: number, lng: number) => void;
  height?: string;
  showSitesList?: boolean;
}

const getReadingColor = (ammonia: number, status?: string) => {
  if (status === 'critical' || ammonia > 50) return '#dc2626'; // Danger Red
  if (status === 'warning' || ammonia > 25) return '#f59e0b'; // Amber Warning
  return '#16a34a'; // Forest Green
};

export const SpatialPolygonMap: React.FC<SpatialPolygonMapProps> = ({
  centerLat = MANOLO_FORTICH_DEFAULTS.lat,
  centerLng = MANOLO_FORTICH_DEFAULTS.lng,
  zoom = 13,
  siteName = 'Manolo Fortich Environmental Monitoring Area',
  readings = [],
  sites = [],
  odorZones = [],
  selectedSiteId,
  onSelectSite,
  height = '460px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const labelTileLayerRef = useRef<L.TileLayer | null>(null);
  const boundaryLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const odorZonesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const sitesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const readingsLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapLayer, setMapLayer] = useState<'street' | 'satellite'>('satellite');
  const [showBoundary, setShowBoundary] = useState<boolean>(true);
  const [showOdorZones, setShowOdorZones] = useState<boolean>(true);
  const [dbOdorZones, setDbOdorZones] = useState<OdorZonePolygon[]>([]);

  // Fetch odor zones from database table if present
  useEffect(() => {
    const fetchDbOdorZones = async () => {
      try {
        const { data, error } = await supabase.from('odor_zones').select('*');
        if (!error && data && data.length > 0) {
          const mapped: OdorZonePolygon[] = data.map((z: any) => ({
            id: z.id,
            name: z.name || z.zone_name || `Zone ${z.id}`,
            coordinates: z.coordinates || z.polygon_coordinates || z.boundary_coordinates,
            centerLat: z.center_lat || z.latitude,
            centerLng: z.center_lng || z.longitude,
            radiusMeters: z.radius_meters || z.radius,
            ammoniaLevel: z.ammonia_level || z.ammonia || z.nh3_level,
            status: z.status,
            siteName: z.site_name,
          }));
          setDbOdorZones(mapped);
        }
      } catch (err) {
        console.warn('Note: odor_zones table fetch skipped/not found, using dynamic polygon generation.');
      }
    };
    fetchDbOdorZones();
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: zoom,
      minZoom: 11,
      maxZoom: 18,
      zoomControl: true,
    });

    // Default to Realistic Satellite View (Esri World Imagery + CartoDB Voyager Labels)
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

    boundaryLayerGroupRef.current = L.layerGroup().addTo(map);
    odorZonesLayerGroupRef.current = L.layerGroup().addTo(map);
    sitesLayerGroupRef.current = L.layerGroup().addTo(map);
    readingsLayerGroupRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    // Fix tile sizing / slicing issues
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 300);

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
      clearTimeout(t1);
      clearTimeout(t2);
      if (resizeTimer) clearTimeout(resizeTimer);
      if (resizeObserver) resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map center on coordinates change
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([centerLat, centerLng], mapRef.current.getZoom() || zoom);
    }
  }, [centerLat, centerLng]);

  // Handle Street / Satellite Layer Switching
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

  // Render Manolo Fortich Municipal Boundary Polygon (Background jurisdiction overlay)
  useEffect(() => {
    if (!mapRef.current || !boundaryLayerGroupRef.current) return;
    const boundaryGroup = boundaryLayerGroupRef.current;
    boundaryGroup.clearLayers();

    if (showBoundary) {
      const boundaryPolygon = L.polygon(MANOLO_FORTICH_BOUNDARY, {
        color: '#2563eb',
        weight: 2.5,
        dashArray: '8, 6',
        fillColor: '#3b82f6',
        fillOpacity: 0.04,
        interactive: false, // Prevents intercepting mouse moves and hover events
      });

      boundaryGroup.addLayer(boundaryPolygon);
    }
  }, [showBoundary]);

  // Render Odor Zone Polygons (Orange Polygons)
  useEffect(() => {
    if (!mapRef.current || !odorZonesLayerGroupRef.current) return;
    const odorGroup = odorZonesLayerGroupRef.current;
    odorGroup.clearLayers();

    if (!showOdorZones) return;

    const allOdorZones = [...odorZones, ...dbOdorZones];

    // 1. Render explicit odor zone polygons if provided or fetched from database
    allOdorZones.forEach((zone) => {
      let polyCoords = zone.coordinates;
      if (!polyCoords && zone.centerLat && zone.centerLng) {
        const radius = zone.radiusMeters || 350;
        polyCoords = generateOdorZonePolygon(zone.centerLat, zone.centerLng, radius);
      }

      if (polyCoords && polyCoords.length > 0) {
        const isCritical = (zone.ammoniaLevel && zone.ammoniaLevel > 50) || zone.status === 'critical';
        const polygon = L.polygon(polyCoords, {
          color: isCritical ? '#dc2626' : '#ea580c', // Bright Orange
          weight: 2,
          dashArray: '5, 5',
          fillColor: isCritical ? '#ef4444' : '#f97316', // Orange fill
          fillOpacity: 0.28,
        });

        polygon.bindPopup(`
          <div style="font-family: system-ui, sans-serif; min-width: 170px; padding: 4px;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
              <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#f97316;"></span>
              <strong style="color: #9a3412; font-size: 13px;">${zone.name || 'Odor Dispersion Zone'}</strong>
            </div>
            ${zone.siteName ? `<div style="font-size:12px; color:#334155; margin-bottom:2px;"><b>Site:</b> ${zone.siteName}</div>` : ''}
            ${zone.ammoniaLevel ? `<div style="font-size:12px; color:#c2410c; font-weight:700;">Ammonia: ${zone.ammoniaLevel.toFixed(1)} ppm</div>` : ''}
            <div style="font-size:10px; color:#64748b; margin-top:4px;">Spatial Odor Buffer Polygon</div>
          </div>
        `);

        odorGroup.addLayer(polygon);
      }
    });

    // 2. Generate odor zones for sites that don't have explicit polygon entries
    sites.forEach((site) => {
      if (site.latitude && site.longitude) {
        const hasExplicitZone = allOdorZones.some((z) => z.id === site.id);
        if (!hasExplicitZone) {
          const nh3 = site.latest_ammonia || 0;
          const baseRadius = Math.sqrt(((site.area_size_hectares || 1) * 10000) / Math.PI);
          const outerRadius = Math.max(120, baseRadius + nh3 * 4);

          const polyCoords = generateOdorZonePolygon(site.latitude, site.longitude, outerRadius);
          const isCritical = site.alert_status === 'critical' || nh3 > 50;

          const polygon = L.polygon(polyCoords, {
            color: isCritical ? '#dc2626' : '#ea580c',
            weight: 2,
            dashArray: '6, 4',
            fillColor: isCritical ? '#ef4444' : '#f97316',
            fillOpacity: 0.22,
          });

          polygon.bindTooltip(
            `<strong>${site.site_name}</strong><br/>Odor Zone: ~${Math.round(outerRadius)}m buffer (${nh3.toFixed(1)} ppm)`,
            { direction: 'top' }
          );

          odorGroup.addLayer(polygon);
        }
      }
    });
  }, [odorZones, dbOdorZones, sites, showOdorZones]);

  // Render Monitoring Sites (Markers)
  useEffect(() => {
    if (!mapRef.current || !sitesLayerGroupRef.current) return;
    const sitesGroup = sitesLayerGroupRef.current;
    sitesGroup.clearLayers();

    sites.forEach((site) => {
      if (!site.latitude || !site.longitude) return;

      const isSelected = String(selectedSiteId) === String(site.id);
      const nh3 = site.latest_ammonia;
      const statusColor = nh3 && nh3 > 50 ? '#dc2626' : nh3 && nh3 > 25 ? '#ea580c' : '#16a34a';

      const siteIcon = L.divIcon({
        className: 'site-facility-pin',
        html: `<div style="
          background-color: ${isSelected ? '#1a365d' : '#ffffff'};
          color: ${isSelected ? '#ffffff' : statusColor};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          border: 3px solid ${statusColor};
          cursor: pointer;
          transition: transform 0.2s;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512" fill="currentColor">
            <path d="M448 64H64a32 32 0 00-32 32v320a32 32 0 0032 32h384a32 32 0 0032-32V96a32 32 0 00-32-32zm-32 336H96V112h320zM128 144h64v64h-64zm96 0h64v64h-64zm96 0h64v64h-64zM128 240h64v64h-64zm96 0h64v64h-64zm96 0h64v64h-64zM128 336h64v48h-64zm96 0h64v48h-64zm96 0h64v48h-64z"/>
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([site.latitude, site.longitude], { icon: siteIcon });

      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 190px; padding: 4px;">
          <h4 style="margin: 0 0 4px 0; color: #1a365d; font-size: 14px; font-weight: 700;">${site.site_name}</h4>
          <div style="font-size: 12px; color: #475569; margin-bottom: 4px;"><b>Type:</b> ${site.site_type || 'Livestock Farm'}</div>
          ${site.owner_name ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 4px;"><b>Owner:</b> ${site.owner_name}</div>` : ''}
          <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:4px 8px; border-radius:6px; margin-top:6px; border:1px solid #e2e8f0;">
            <span style="font-size: 11px; color:#64748b;">Latest NH₃:</span>
            <strong style="color: ${statusColor}; font-size: 13px;">${nh3 !== null && nh3 !== undefined ? `${nh3.toFixed(1)} ppm` : 'No data'}</strong>
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">GPS: ${site.latitude.toFixed(5)}°, ${site.longitude.toFixed(5)}°</div>
        </div>
      `);

      marker.on('click', () => {
        if (onSelectSite) {
          onSelectSite(site.id, site.latitude, site.longitude);
        }
      });

      sitesGroup.addLayer(marker);
    });
  }, [sites, selectedSiteId]);

  // Render Sensor Readings (Colored dots inside/around zones)
  useEffect(() => {
    if (!mapRef.current || !readingsLayerGroupRef.current) return;
    const readingsGroup = readingsLayerGroupRef.current;
    readingsGroup.clearLayers();

    readings.forEach((reading) => {
      if (!reading.latitude || !reading.longitude) return;

      const color = getReadingColor(reading.ammonia, reading.status);

      const circleMarker = L.circleMarker([reading.latitude, reading.longitude], {
        radius: 8,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.92,
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
          ${reading.site_name ? `<div style="font-size: 12px; color: #334155; margin-bottom: 2px;"><b>Site:</b> ${reading.site_name}</div>` : ''}
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
            <b>Device UID:</b> ${reading.device_uid || 'N/A'}
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
      readingsGroup.addLayer(circleMarker);
    });
  }, [readings]);

  const handleFocusManolo = () => {
    if (!mapRef.current) return;
    const boundaryBounds = L.latLngBounds(MANOLO_FORTICH_BOUNDARY);
    mapRef.current.fitBounds(boundaryBounds, { padding: [30, 30] });
  };

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{ position: 'relative', width: '100%', height, borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: '0 4px 14px rgba(0,0,0,0.08)' }}
    >
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Top Left Jurisdiction Title Badge */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '50px',
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(8px)',
        padding: '6px 14px',
        borderRadius: '20px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
        fontSize: '12px',
        fontWeight: 700,
        color: '#1a365d',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ea580c' }}></span>
        {siteName}
      </div>

      {/* Top Right Controls: Street / Satellite / Odor Zones / Manolo Boundary */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(8px)',
        padding: '4px',
        borderRadius: '10px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.18)',
      }}>
        <button
          type="button"
          onClick={() => setMapLayer('satellite')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 9px',
            fontSize: '11px',
            fontWeight: 700,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: mapLayer === 'satellite' ? '#1a365d' : 'transparent',
            color: mapLayer === 'satellite' ? '#ffffff' : '#64748b',
            transition: 'all 0.2s ease',
          }}
          title="ESRI Satellite Imagery"
        >
          <IonIcon icon={earthOutline} style={{ fontSize: '13px' }} />
          Satellite
        </button>

        <button
          type="button"
          onClick={() => setMapLayer('street')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 9px',
            fontSize: '11px',
            fontWeight: 700,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: mapLayer === 'street' ? '#1a365d' : 'transparent',
            color: mapLayer === 'street' ? '#ffffff' : '#64748b',
            transition: 'all 0.2s ease',
          }}
          title="Street Map View"
        >
          <IonIcon icon={mapOutline} style={{ fontSize: '13px' }} />
          Street
        </button>

        <div style={{ width: '1px', height: '18px', backgroundColor: '#cbd5e1' }} />

        <button
          type="button"
          onClick={() => setShowOdorZones(!showOdorZones)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 8px',
            fontSize: '11px',
            fontWeight: 700,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: showOdorZones ? '#ffedd5' : '#f1f5f9',
            color: showOdorZones ? '#c2410c' : '#94a3b8',
            transition: 'all 0.2s ease',
          }}
          title="Toggle Odor Zone Polygons"
        >
          <IonIcon icon={warningOutline} style={{ fontSize: '13px' }} />
          Odor Zones
        </button>

        <button
          type="button"
          onClick={handleFocusManolo}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 8px',
            fontSize: '11px',
            fontWeight: 700,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: '#f1f5f9',
            color: '#1a365d',
            transition: 'all 0.2s ease',
          }}
          title="Focus Manolo Fortich Municipal Boundary"
        >
          <IonIcon icon={locateOutline} style={{ fontSize: '14px', color: '#047857' }} />
          Focus Manolo
        </button>

        <button
          type="button"
          onClick={() => setShowBoundary(!showBoundary)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '5px 7px',
            fontSize: '11px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: showBoundary ? '#e0f2fe' : '#f1f5f9',
            color: showBoundary ? '#0284c7' : '#94a3b8',
            transition: 'all 0.2s ease',
          }}
          title="Toggle Municipal Boundary Line"
        >
          <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: '14px' }} />
        </button>
      </div>

      {/* Bottom Map Legend */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
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
        <div style={{ fontWeight: 700, marginBottom: '2px', color: '#1a365d' }}>Spatial Map Legend</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '3px', border: '1.5px dashed #ea580c', backgroundColor: 'rgba(249,115,22,0.3)' }}></span>
          <span>Odor Zone Polygon</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
          <span>Normal Reading (&lt; 25 ppm)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
          <span>Warning Reading (25–50 ppm)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#dc2626' }}></span>
          <span>Critical Reading (&gt; 50 ppm)</span>
        </div>
      </div>
    </div>
  );
};

export default SpatialPolygonMap;
