import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface SiteOdorMapProps {
  latitude: number;
  longitude: number;
  siteName: string;
  ammonia: number | null;
  areaHectares?: number;
  height?: string;
}

export const SiteOdorMap: React.FC<SiteOdorMapProps> = ({
  latitude,
  longitude,
  siteName,
  ammonia = 0,
  areaHectares = 1,
  height = '320px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap | MENRO Environmental Spatial Impact',
      maxZoom: 19,
    }).addTo(map);

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

    const baseRadius = Math.sqrt((areaHectares || 1) * 10000 / Math.PI);
    const innerOdorRadius = Math.max(80, baseRadius + nh3Val * 3);
    const outerOdorRadius = innerOdorRadius * 2.2;

    // 1. Extended Community Buffer Perimeter (1000m)
    L.circle([latitude, longitude], {
      radius: 1000,
      color: '#64748b',
      weight: 1.5,
      dashArray: '6, 6',
      fillColor: '#94a3b8',
      fillOpacity: 0.05,
    }).addTo(map).bindTooltip('Community Risk Perimeter (1000m)', { permanent: false });

    // 2. Residential Buffer Boundary (500m)
    L.circle([latitude, longitude], {
      radius: 500,
      color: '#3b82f6',
      weight: 2,
      dashArray: '4, 4',
      fillColor: '#60a5fa',
      fillOpacity: 0.1,
    }).addTo(map).bindTooltip('Residential Buffer Boundary (500m)', { permanent: false });

    // 3. Outer Odor Plume
    L.circle([latitude, longitude], {
      radius: outerOdorRadius,
      color: plumeColor,
      weight: 1.5,
      fillColor: plumeColor,
      fillOpacity: plumeOpacity * 0.5,
    }).addTo(map).bindTooltip(`Outer Odor Dispersion Zone (~${Math.round(outerOdorRadius)}m)`, { permanent: false });

    // 4. Inner High Ammonia Core
    L.circle([latitude, longitude], {
      radius: innerOdorRadius,
      color: plumeColor,
      weight: 2.5,
      fillColor: plumeColor,
      fillOpacity: plumeOpacity,
    }).addTo(map).bindTooltip(`Primary Odor Concentration Core (~${Math.round(innerOdorRadius)}m)`, { permanent: false });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude, siteName, ammonia, areaHectares]);

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: '10px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default SiteOdorMap;
