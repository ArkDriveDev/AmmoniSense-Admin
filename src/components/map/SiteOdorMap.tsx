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

    // 5. Site Center Pin Marker & Popup
    const siteIcon = L.divIcon({
      className: 'custom-site-pin',
      html: `<div style="background-color: ${plumeColor}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.3); border: 3px solid white; font-weight: bold; font-size: 14px;">🏭</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([latitude, longitude], { icon: siteIcon }).addTo(map);
    marker.bindPopup(`
      <div style="font-family: system-ui, sans-serif; min-width: 180px; padding: 4px;">
        <h4 style="margin: 0 0 6px 0; color: #1a365d; font-size: 14px; font-weight: 700;">${siteName}</h4>
        <div style="font-size: 12px; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
          <span>Latest NH₃:</span>
          <strong style="color: ${plumeColor}; font-size: 13px;">${nh3Val > 0 ? nh3Val.toFixed(1) + ' ppm' : 'No Data'}</strong>
        </div>
        <div style="font-size: 11px; color: #475569;"><b>Primary Odor Radius:</b> ~${Math.round(innerOdorRadius)}m</div>
        <div style="font-size: 11px; color: #475569;"><b>Community Buffer:</b> 500m Boundary</div>
      </div>
    `);

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
