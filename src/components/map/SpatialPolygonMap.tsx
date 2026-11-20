import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IonIcon } from '@ionic/react';
import {
  mapOutline,
  earthOutline,
  locateOutline,
  shieldCheckmarkOutline,
  warningOutline,
  informationCircleOutline,
  chevronDownOutline,
  chevronUpOutline,
  closeOutline,
  closeCircle,
  searchOutline
} from 'ionicons/icons';
import '../SearchAndSortBar.css';
import {
  MANOLO_FORTICH_DEFAULTS,
  MANOLO_FORTICH_BOUNDARY,
  TILE_LAYERS,
  generateOdorZonePolygon
} from './mapConstants';
import {
  getSiteMapPinMeta,
  getAmmoniaColor,
  getAmmoniaSeverityLabel
} from '../../utils/siteUtils';

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

export type MapScheduleSort = 'recent' | 'oldest' | 'name';
const MAP_SCHEDULE_SORT_KEY = 'admin_map_schedule_sort';

export interface SensorReadingMarker {
  id: number | string;
  latitude: number;
  longitude: number;
  ammonia: number | null;
  avg_ammonia?: number | null;
  reading_count?: number;
  device_uid?: string;
  created_at: string;
  photo_url?: string;
  status?: string;
  site_name?: string;
  notes?: string;
  inspection_schedule_id?: number | null;
  scheduled_date?: string | null;
  schedule_name?: string | null;
}

export interface InspectionSiteMarker {
  id: number | string;
  site_name: string;
  latitude: number;
  longitude: number;
  site_type?: string | null;
  owner_name?: string | null;
  latest_ammonia?: number | null;
  highest_ammonia?: number | null;
  max_ammonia?: number | null;
  avg_ammonia_latest_schedule?: number | null;
  alert_status?: string | null;
  area_size_hectares?: number | null;
}

export type MonitoringSiteMarker = InspectionSiteMarker;

interface SpatialPolygonMapProps {
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  siteName?: string;
  readings?: SensorReadingMarker[];
  sites?: InspectionSiteMarker[];
  odorZones?: OdorZonePolygon[];
  selectedSiteId?: string | number;
  onSelectSite?: (siteId: string | number, lat: number, lng: number) => void;
  height?: string;
  minHeight?: string;
  className?: string;
  showSitesList?: boolean;
  showSearch?: boolean;
  markerStyle?: 'default' | 'poultry';
  showAreaCircle?: boolean;
  hidePpmBadge?: boolean;
}

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
  height = '65vh',
  minHeight = '500px',
  className = '',
  showSearch = true,
  markerStyle = 'default',
  showAreaCircle = false,
  hidePpmBadge = false,
}) => {
  const history = useHistory();
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
  const [showLegend, setShowLegend] = useState<boolean>(false);

  // Search & zoom state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [highlightedSiteId, setHighlightedSiteId] = useState<string | number | undefined>(selectedSiteId);

  // Schedule sorter state with localStorage persistence
  const [scheduleSort, setScheduleSort] = useState<MapScheduleSort>(() => {
    try {
      const saved = localStorage.getItem(MAP_SCHEDULE_SORT_KEY);
      if (saved === 'recent' || saved === 'oldest' || saved === 'name') {
        return saved;
      }
    } catch (e) {
      console.warn('Could not read admin_map_schedule_sort from localStorage:', e);
    }
    return 'recent';
  });

  const handleSortChange = (newSort: MapScheduleSort) => {
    setScheduleSort(newSort);
    try {
      localStorage.setItem(MAP_SCHEDULE_SORT_KEY, newSort);
    } catch (e) {
      console.warn('Could not write admin_map_schedule_sort to localStorage:', e);
    }
  };

  // Sort readings according to schedule sorter selection
  const sortedReadings = useMemo(() => {
    const list = [...readings];
    return list.sort((a, b) => {
      if (scheduleSort === 'recent') {
        const dateA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : new Date(a.created_at).getTime();
        const dateB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : new Date(b.created_at).getTime();
        if (dateB !== dateA) return dateB - dateA;
      } else if (scheduleSort === 'oldest') {
        const dateA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : new Date(a.created_at).getTime();
        const dateB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : new Date(b.created_at).getTime();
        if (dateA !== dateB) return dateA - dateB;
      } else if (scheduleSort === 'name') {
        const nameA = (a.schedule_name || '').toLowerCase();
        const nameB = (b.schedule_name || '').toLowerCase();
        const cmp = nameA.localeCompare(nameB);
        if (cmp !== 0) return cmp;
      }
      // Secondary sort: tag created_at descending
      const catA = new Date(a.created_at).getTime();
      const catB = new Date(b.created_at).getTime();
      return catB - catA;
    });
  }, [readings, scheduleSort]);

  useEffect(() => {
    setHighlightedSiteId(selectedSiteId);
  }, [selectedSiteId]);

  const filteredSearchSites = useMemo(() => {
    if (!searchQuery.trim()) return sites.slice(0, 8);
    const q = searchQuery.toLowerCase();
    return sites.filter((s) =>
      s.site_name.toLowerCase().includes(q) ||
      (s.site_type && s.site_type.toLowerCase().includes(q)) ||
      String(s.id).includes(q)
    ).slice(0, 8);
  }, [sites, searchQuery]);

  const handleSelectSearchedSite = (site: InspectionSiteMarker) => {
    setSearchQuery(site.site_name);
    setShowSearchDropdown(false);
    setHighlightedSiteId(site.id);

    if (mapRef.current && site.latitude && site.longitude) {
      mapRef.current.setView([site.latitude, site.longitude], 16, {
        animate: true,
        duration: 0.8,
      });
    }

    if (onSelectSite) {
      onSelectSite(site.id, site.latitude, site.longitude);
    }
  };

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

    // Default to Realistic Satellite View (Esri World Imagery + Esri Boundaries/Places Labels)
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

    // Fix tile sizing / slicing issues on mount and resize
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    const t3 = setTimeout(() => map.invalidateSize(), 600);

    const handleWindowResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleWindowResize);

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        }, 150);
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', handleWindowResize);
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

    const allOdorZones = odorZones;

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
          const nh3 = (site.highest_ammonia ?? site.max_ammonia ?? site.latest_ammonia) || 0;
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
  }, [odorZones, sites, showOdorZones]);

  // Render Inspection Sites (Markers)
  useEffect(() => {
    if (!mapRef.current || !sitesLayerGroupRef.current) return;
    const sitesGroup = sitesLayerGroupRef.current;
    sitesGroup.clearLayers();

    sites.forEach((site) => {
      if (!site.latitude || !site.longitude) return;

      const pinMeta = getSiteMapPinMeta(site.site_type || undefined);
      const isSelected = String(highlightedSiteId ?? selectedSiteId) === String(site.id);
      const pinColor = isSelected ? '#1a365d' : pinMeta.pinColor;
      const nh3 = site.highest_ammonia ?? site.max_ammonia ?? site.latest_ammonia;
      const statusColor = getAmmoniaColor(nh3 || 0, site.alert_status || undefined);

      // Render site area circle if poultry style or showAreaCircle requested
      if (markerStyle === 'poultry' || showAreaCircle) {
        const areaHectares = site.area_size_hectares && site.area_size_hectares > 0 ? Number(site.area_size_hectares) : 1.0;
        const radiusMeters = Math.max(35, Math.sqrt((areaHectares * 10000) / Math.PI));

        const areaCircle = L.circle([site.latitude, site.longitude], {
          radius: radiusMeters,
          color: isSelected ? '#1a365d' : '#d97706',
          weight: isSelected ? 2.5 : 1.5,
          dashArray: '5, 5',
          fillColor: isSelected ? '#3b82f6' : '#f59e0b',
          fillOpacity: 0.16,
        });

        areaCircle.bindTooltip(
          `<div style="font-family: system-ui, sans-serif; font-size: 11px;">
            <strong style="color: #1a365d;">${site.site_name}</strong><br/>
            Site Area: ${areaHectares.toFixed(2)} ha (~${Math.round(radiusMeters)}m radius)
          </div>`,
          { direction: 'top', sticky: true }
        );

        areaCircle.on('click', () => {
          if (onSelectSite) {
            onSelectSite(site.id, site.latitude, site.longitude);
          }
        });

        sitesGroup.addLayer(areaCircle);
      }

      let siteIcon: L.DivIcon;

      if (markerStyle === 'poultry') {
        const poultryBadgeColor = isSelected ? '#1a365d' : '#d97706';
        siteIcon = L.divIcon({
          className: 'custom-poultry-pin',
          html: `
            <div style="
              position: relative;
              background: ${poultryBadgeColor};
              width: 36px;
              height: 36px;
              border-radius: 50% 50% 50% 4px;
              transform: rotate(-45deg);
              border: 2.5px solid #ffffff;
              box-shadow: 0 4px 14px rgba(217, 119, 6, 0.45);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              ${isSelected ? 'outline: 3px solid #1a365d; outline-offset: 3px; box-shadow: 0 0 16px rgba(26, 54, 93, 0.8);' : ''}
            ">
              <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#ffffff" style="display: block;">
                  <path d="M14.5 3c-.83 0-1.54.5-1.84 1.22l-.89 2.12c-.52.27-1.07.6-1.63 1l-.89-.89a1.5 1.5 0 0 0-2.12 0l-.71.71a1.5 1.5 0 0 0 0 2.12l.62.62c-.34.62-.64 1.29-.88 2.02l-1.05-.26a1.5 1.5 0 0 0-1.78 1.12l-.24.97a1.5 1.5 0 0 0 1.12 1.78l1.37.34c.05.65.17 1.29.35 1.91l-.9.9a1.5 1.5 0 0 0 0 2.12l.71.71a1.5 1.5 0 0 0 2.12 0l.9-.9c.62.18 1.26.3 1.91.35l.34 1.37a1.5 1.5 0 0 0 1.78 1.12l.97-.24a1.5 1.5 0 0 0 1.12-1.78l-.26-1.05c.73-.24 1.4-.54 2.02-.88l.62.62a1.5 1.5 0 0 0 2.12 0l.71-.71a1.5 1.5 0 0 0 0-2.12l-.89-.89c.4-.56.73-1.11 1-1.63l2.12-.89c.72-.3 1.22-1.01 1.22-1.84v-.5a2.5 2.5 0 0 0-2.5-2.5h-.7l-.46-1.38A2.5 2.5 0 0 0 19.14 6H17V4.5A1.5 1.5 0 0 0 15.5 3h-1zm.5 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                </svg>
              </div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
        });
      } else {
        siteIcon = L.divIcon({
          className: 'custom-site-pin',
          html: `
            <div style="
              position: relative;
              background: ${pinColor};
              width: 34px;
              height: 34px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 2.5px solid #ffffff;
              box-shadow: 0 4px 14px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              ${isSelected ? 'outline: 3px solid #1a365d; outline-offset: 2px;' : ''}
            ">
              <span style="
                transform: rotate(45deg);
                font-size: 16px;
                line-height: 1;
                display: block;
              ">${pinMeta.emoji}</span>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 34],
        });
      }

      const latestScheduleAvg = site.avg_ammonia_latest_schedule;
      const hasLatestAvg = latestScheduleAvg !== null && latestScheduleAvg !== undefined && !isNaN(Number(latestScheduleAvg));
      const siteAvgDisplay = hasLatestAvg
        ? `Avg NH₃ (latest schedule): ${Number(latestScheduleAvg).toFixed(2)} ppm`
        : `Avg NH₃: — <span style="font-size: 10px; color: #94a3b8;">(No readings)</span>`;
      const siteStatusColor = hasLatestAvg ? getAmmoniaColor(Number(latestScheduleAvg), site.alert_status || undefined) : '#64748b';

      const marker = L.marker([site.latitude, site.longitude], { icon: siteIcon });

      // Show tooltip on hover
      marker.bindTooltip(
        `<div style="font-family: system-ui, sans-serif; padding: 4px 6px; text-align: center;">
          <strong style="color: #1a365d; font-size: 12px; display: block; margin-bottom: 2px;">${site.site_name}</strong>
          ${!hidePpmBadge ? `
            <div style="font-size: 11px; font-weight: 600; color: ${hasLatestAvg ? siteStatusColor : '#64748b'}; margin: 2px 0;">
              ${siteAvgDisplay}
            </div>` : ''}
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Click to view site details &rarr;</div>
        </div>`,
        { direction: 'top', offset: [0, -34], opacity: 0.95 }
      );

      // On marker click: invoke onSelectSite callback to open site details modal
      marker.on('click', () => {
        if (onSelectSite) {
          onSelectSite(site.id, site.latitude, site.longitude);
        } else {
          history.push(`/inspection-sites?siteId=${site.id}`);
        }
      });

      sitesGroup.addLayer(marker);
    });
  }, [sites, selectedSiteId, highlightedSiteId, markerStyle, showAreaCircle, hidePpmBadge]);

  // Render Sensor Readings (Colored dots inside/around zones showing highest ppm)
  useEffect(() => {
    if (!mapRef.current || !readingsLayerGroupRef.current) return;
    const readingsGroup = readingsLayerGroupRef.current;
    readingsGroup.clearLayers();

    sortedReadings.forEach((reading) => {
      if (!reading.latitude || !reading.longitude) return;

      const hasReading =
        (reading.reading_count !== undefined && reading.reading_count !== null
          ? reading.reading_count > 0
          : false) ||
        (reading.avg_ammonia !== null && reading.avg_ammonia !== undefined) ||
        (reading.ammonia !== null && reading.ammonia !== undefined);

      const avgVal = reading.avg_ammonia ?? reading.ammonia;
      const isValidNumber = hasReading && avgVal !== null && avgVal !== undefined && !isNaN(Number(avgVal));
      const color = isValidNumber ? getAmmoniaColor(Number(avgVal), reading.status) : '#64748b';
      const pillVal = isValidNumber ? Number(avgVal).toFixed(1) : '—';
      const avgText = isValidNumber
        ? `Avg NH₃: ${Number(avgVal).toFixed(2)} ppm`
        : `Avg NH₃: — <span style="font-size: 11px; font-weight: 500; color: #94a3b8;">(No readings)</span>`;

      let tagIcon: L.DivIcon;

      if (reading.photo_url) {
        tagIcon = L.divIcon({
          className: 'custom-photo-thumb-marker',
          html: `
            <div style="
              position: relative;
              width: 38px;
              height: 38px;
              border-radius: 50%;
              border: 3px solid #8b5cf6;
              box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
              background: #0f172a;
              overflow: hidden;
              cursor: pointer;
            ">
              <img src="${reading.photo_url}" style="width: 100%; height: 100%; object-fit: cover;" alt="Tag Photo" />
              <span style="
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: ${color};
                color: #ffffff;
                font-size: 8px;
                font-weight: 800;
                text-align: center;
                line-height: 11px;
              ">${pillVal}</span>
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });
      } else {
        tagIcon = L.divIcon({
          className: 'custom-reading-tag-marker',
          html: `
            <div style="
              position: relative;
              background: ${color};
              color: #ffffff;
              font-weight: 800;
              font-size: 11px;
              padding: 3px 8px;
              border-radius: 14px;
              border: 2px solid #ffffff;
              box-shadow: 0 3px 12px rgba(0,0,0,0.35);
              white-space: nowrap;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 3px;
            ">
              <span>📍 ${pillVal}</span>
              <span style="font-size: 8px; opacity: 0.9;">PPM</span>
            </div>
          `,
          iconSize: [64, 26],
          iconAnchor: [32, 13],
        });
      }

      const marker = L.marker([reading.latitude, reading.longitude], { icon: tagIcon });

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; min-width: 170px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <h4 style="margin: 0; font-size: 14px; color: ${isValidNumber ? color : '#1e293b'}; font-weight: 700;">
              ${avgText}
            </h4>
            <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; color: white; background: ${color}; text-transform: uppercase;">
              ${isValidNumber ? (reading.status || getAmmoniaSeverityLabel(Number(avgVal))) : 'NO DATA'}
            </span>
          </div>
          ${reading.site_name ? `<div style="font-size: 12px; color: #334155; margin-bottom: 2px;"><b>Site:</b> ${reading.site_name}</div>` : ''}
          ${reading.schedule_name ? `<div style="font-size: 11px; color: #475569; margin-bottom: 2px;"><b>Schedule:</b> ${reading.schedule_name}${reading.scheduled_date ? ` (${reading.scheduled_date})` : ''}</div>` : ''}
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

      marker.bindPopup(popupContent);
      readingsGroup.addLayer(marker);
    });
  }, [sortedReadings]);

  const handleFocusManolo = () => {
    if (!mapRef.current) return;
    const boundaryBounds = L.latLngBounds(MANOLO_FORTICH_BOUNDARY);
    mapRef.current.fitBounds(boundaryBounds, { padding: [30, 30] });
  };

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{ position: 'relative', width: '100%' }}
    >
      {/* Top Bar Controls: Constrained Left-Aligned Search Input and Schedule Sorter above map */}
      <div className="search-sort-container map-search-sort" style={{ zIndex: 1100, position: 'relative' }}>
        {showSearch && (
          <div className="search-input-wrapper">
            <IonIcon icon={searchOutline} className="search-icon-left" />
            <input
              type="text"
              placeholder="Search site to zoom..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              className="search-text-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchDropdown(false);
                }}
                className="search-clear-btn"
                aria-label="Clear search"
              >
                <IonIcon icon={closeCircle} style={{ fontSize: '18px' }} />
              </button>
            )}

            {/* Results Dropdown */}
            {showSearchDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '4px',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                maxHeight: '220px',
                overflowY: 'auto',
                zIndex: 1200
              }}>
                {filteredSearchSites.length === 0 ? (
                  <div style={{ padding: '10px 14px', fontSize: '12px', color: '#94a3b8' }}>
                    No matching sites found
                  </div>
                ) : (
                  filteredSearchSites.map((site: InspectionSiteMarker) => (
                    <div
                      key={site.id}
                      onClick={() => handleSelectSearchedSite(site)}
                      style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div>
                        <strong style={{ color: '#1a365d' }}>{site.site_name}</strong>
                        <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>
                          ({site.site_type || 'Site'})
                        </span>
                      </div>
                      {site.latest_ammonia !== null && site.latest_ammonia !== undefined && (
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#059669' }}>
                          {site.latest_ammonia.toFixed(1)} PPM
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Schedule Sorter Control */}
        <div className="sort-control-wrapper">
          <select
            id="map-schedule-sorter"
            value={scheduleSort}
            onChange={(e) => handleSortChange(e.target.value as MapScheduleSort)}
            className="sort-select-chip"
            aria-label="Sort schedules"
          >
            <option value="recent">Recent (Newest)</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </div>
      </div>

      {/* Map Container */}
      <div
        className={className}
        style={{
          position: 'relative',
          width: '100%',
          height,
          minHeight,
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          boxShadow: '0 4px 14px rgba(0,0,0,0.08)'
        }}
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
        padding: '5px 12px',
        borderRadius: '20px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
        fontSize: '11px',
        fontWeight: 700,
        color: '#1a365d',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        maxWidth: 'min(200px, 32vw)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ display: 'inline-block', width: '8px', height: '8px', minWidth: '8px', borderRadius: '50%', backgroundColor: '#ea580c' }}></span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{siteName}</span>
      </div>

      {/* Top Right Controls: Street / Satellite / Odor Zones / Manolo Boundary */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(8px)',
        padding: '3px 4px',
        borderRadius: '10px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.18)',
        maxWidth: 'calc(100% - 16px)',
        overflowX: 'auto',
      }}>
        <button
          type="button"
          onClick={() => setMapLayer('satellite')}
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
            backgroundColor: mapLayer === 'satellite' ? '#1a365d' : 'transparent',
            color: mapLayer === 'satellite' ? '#ffffff' : '#64748b',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
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
            padding: '5px 8px',
            fontSize: '11px',
            fontWeight: 700,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: mapLayer === 'street' ? '#1a365d' : 'transparent',
            color: mapLayer === 'street' ? '#ffffff' : '#64748b',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
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
            padding: '5px 7px',
            fontSize: '11px',
            fontWeight: 700,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: showOdorZones ? '#ffedd5' : '#f1f5f9',
            color: showOdorZones ? '#c2410c' : '#94a3b8',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
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
            padding: '5px 7px',
            fontSize: '11px',
            fontWeight: 700,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: '#f1f5f9',
            color: '#1a365d',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
          title="Focus Manolo Fortich Municipal Boundary"
        >
          <IonIcon icon={locateOutline} style={{ fontSize: '14px', color: '#047857' }} />
          Focus
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

      {/* Empty readings indicator if 0 readings */}
      {readings.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(6px)',
          padding: '5px 12px',
          borderRadius: '20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
          fontSize: '11px',
          fontWeight: 600,
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          pointerEvents: 'none',
        }}>
          <IonIcon icon={locateOutline} style={{ fontSize: '14px', color: '#94a3b8' }} />
          0 Mapped Locations
        </div>
      )}

      {/* Bottom Map Legend Toggle & Mobile-Friendly Panel */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '6px',
          maxWidth: 'calc(100% - 24px)',
        }}
      >
        {showLegend && (
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(12px)',
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              fontSize: '11px',
              color: '#1e293b',
              width: '240px',
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontWeight: 800, color: '#1a365d', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px' }}>
                <IonIcon icon={informationCircleOutline} style={{ color: '#2563eb', fontSize: '14px' }} />
                <span>Map Legend</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLegend(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '4px',
                }}
                title="Close Legend"
              >
                <IonIcon icon={closeOutline} style={{ fontSize: '16px' }} />
              </button>
            </div>

            {/* Ammonia Levels */}
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Ammonia Levels</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '5px', backgroundColor: '#f0fdf4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                  <span style={{ fontWeight: 600, color: '#166534', fontSize: '10.5px' }}>0 – 5 PPM</span>
                </div>
                <span style={{ color: '#15803d', fontWeight: 600, fontSize: '10px' }}>Normal (Safe)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '5px', backgroundColor: '#fefce8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#eab308' }} />
                  <span style={{ fontWeight: 600, color: '#854d0e', fontSize: '10.5px' }}>5 – 10 PPM</span>
                </div>
                <span style={{ color: '#a16207', fontWeight: 600, fontSize: '10px' }}>Warning</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '5px', backgroundColor: '#fff7ed' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f97316' }} />
                  <span style={{ fontWeight: 600, color: '#9a3412', fontSize: '10.5px' }}>10 – 20 PPM</span>
                </div>
                <span style={{ color: '#c2410c', fontWeight: 600, fontSize: '10px' }}>High</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '5px', backgroundColor: '#fef2f2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                  <span style={{ fontWeight: 700, color: '#991b1b', fontSize: '10.5px' }}>&gt; 20 PPM</span>
                </div>
                <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '10px' }}>Critical</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', margin: '6px 0 4px 0' }} />

            {/* Map Feature Markers */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '10px', color: '#64748b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '13px', height: '13px', borderRadius: '50%', backgroundColor: '#8b5cf6', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px' }}>📷</span>
                <span>Photo Tag</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', border: '1.5px dashed #ea580c', backgroundColor: 'rgba(249,115,22,0.3)', display: 'inline-block' }} />
                <span>Odor Zone</span>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowLegend(!showLegend)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '20px',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            backgroundColor: showLegend ? '#1a365d' : 'rgba(255, 255, 255, 0.95)',
            color: showLegend ? '#ffffff' : '#1a365d',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.14)',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title={showLegend ? "Hide Legend" : "Show Map Legend"}
        >
          <IonIcon icon={informationCircleOutline} style={{ fontSize: '14px', color: showLegend ? '#93c5fd' : '#2563eb' }} />
          <span>Legend</span>
          <IonIcon icon={showLegend ? chevronDownOutline : chevronUpOutline} style={{ fontSize: '11px', opacity: 0.7 }} />
        </button>
      </div>
      </div>
    </div>
  );
};

export default SpatialPolygonMap;
