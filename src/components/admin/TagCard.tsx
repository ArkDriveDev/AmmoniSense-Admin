import React from 'react';
import { IonCard, IonCardContent, IonBadge, IonIcon } from '@ionic/react';
import {
  thermometerOutline,
  waterOutline,
  batteryChargingOutline,
  locationOutline,
  calendarOutline,
  hardwareChipOutline,
  businessOutline,
  timeOutline,
  documentTextOutline,
  imageOutline
} from 'ionicons/icons';
import { InspectionTagDetails } from '../../types/schema';

interface TagCardProps {
  tag: InspectionTagDetails;
  onClick?: (tag: InspectionTagDetails) => void;
}

/**
 * Color badge styling based on ammonia level and status:
 * Green: NORMAL (<= 25 PPM)
 * Yellow: WARNING (25 - 35 PPM)
 * Orange: HIGH (35 - 50 PPM)
 * Red: CRITICAL (> 50 PPM)
 */
export const getAmmoniaBadgeStyle = (ammonia: number | null | undefined, status: string | null | undefined) => {
  const ppm = Number(ammonia) || 0;
  const s = (status || '').toUpperCase();

  if (s === 'CRITICAL' || ppm > 50) {
    return {
      bg: '#fee2e2',
      color: '#dc2626',
      border: '#f87171',
      badgeColor: 'danger' as const,
      label: 'CRITICAL',
      dotColor: '#ef4444'
    };
  }
  if (s === 'HIGH' || ppm > 35) {
    return {
      bg: '#ffedd5',
      color: '#ea580c',
      border: '#fb923c',
      badgeColor: 'warning' as const,
      label: 'HIGH',
      dotColor: '#f97316'
    };
  }
  if (s === 'WARNING' || ppm > 25) {
    return {
      bg: '#fef9c3',
      color: '#ca8a04',
      border: '#facc15',
      badgeColor: 'warning' as const,
      label: 'WARNING',
      dotColor: '#eab308'
    };
  }
  return {
    bg: '#dcfce7',
    color: '#16a34a',
    border: '#86efac',
    badgeColor: 'success' as const,
    label: 'NORMAL',
    dotColor: '#22c55e'
  };
};

export const TagCard: React.FC<TagCardProps> = ({ tag, onClick }) => {
  const photo = tag.photo_thumbnail_url || tag.photo_url;
  const ammoniaVal = tag.ammonia !== null && tag.ammonia !== undefined ? Number(tag.ammonia) : null;
  const tempVal = tag.temperature !== null && tag.temperature !== undefined ? Number(tag.temperature) : null;
  const humVal = tag.humidity !== null && tag.humidity !== undefined ? Number(tag.humidity) : null;
  const batVal = tag.battery !== null && tag.battery !== undefined ? Number(tag.battery) : null;
  const latVal = tag.latitude ?? tag.tag_latitude ?? tag.reading_latitude;
  const lngVal = tag.longitude ?? tag.tag_longitude ?? tag.reading_longitude;
  const badge = getAmmoniaBadgeStyle(ammoniaVal, tag.status);

  const formattedDate = tag.created_at
    ? new Date(tag.created_at).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Unknown Date';

  const scheduledDateFormatted = tag.scheduled_date
    ? new Date(tag.scheduled_date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : null;

  return (
    <IonCard
      button={!!onClick}
      onClick={() => onClick?.(tag)}
      style={{
        margin: '8px 0',
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        transition: 'all 0.2s ease',
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      <IonCardContent style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          {/* Photo Thumbnail */}
          <div style={{ flexShrink: 0 }}>
            {photo ? (
              <div
                style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  position: 'relative',
                  backgroundColor: '#0f172a',
                  border: '1px solid #cbd5e1'
                }}
              >
                <img
                  src={photo}
                  alt={tag.tag_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                />
              </div>
            ) : (
              <div
                style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontSize: '11px',
                  gap: '2px'
                }}
              >
                <IonIcon icon={imageOutline} style={{ fontSize: '20px', color: '#cbd5e1' }} />
                <span>No Pic</span>
              </div>
            )}
          </div>

          {/* Main Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Header Row: Tag Name, Site, Badges */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '8px',
                flexWrap: 'wrap'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h4
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      fontSize: '16px',
                      color: '#0f172a'
                    }}
                  >
                    {tag.tag_name}
                  </h4>
                  {tag.site_name && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: '#475569',
                        backgroundColor: '#f1f5f9',
                        padding: '2px 8px',
                        borderRadius: '6px'
                      }}
                    >
                      <IonIcon icon={businessOutline} style={{ color: '#059669', fontSize: '13px' }} />
                      <b>{tag.site_name}</b> {tag.site_code ? `(${tag.site_code})` : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Status and Ammonia Badges (green/yellow/orange/red) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    backgroundColor: badge.bg,
                    color: badge.color,
                    border: `1px solid ${badge.border}`,
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: badge.dotColor
                    }}
                  />
                  {ammoniaVal !== null ? `${ammoniaVal.toFixed(2)} PPM` : '-- PPM'}
                </span>

                <IonBadge
                  color={badge.badgeColor}
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    fontWeight: 700,
                    letterSpacing: '0.4px'
                  }}
                >
                  {tag.status || badge.label}
                </IonBadge>
              </div>
            </div>

            {/* Row 2: Schedule & Device */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '14px',
                marginTop: '6px',
                fontSize: '12px',
                color: '#475569'
              }}
            >
              {tag.schedule_name && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <IonIcon icon={calendarOutline} style={{ color: '#2563eb' }} />
                  <span>
                    Schedule: <b>{tag.schedule_name}</b>
                    {scheduledDateFormatted && ` (${scheduledDateFormatted})`}
                  </span>
                </span>
              )}

              {(tag.device_name || tag.device_uid) && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <IonIcon icon={hardwareChipOutline} style={{ color: '#1a365d' }} />
                  <span>
                    Device: <b>{tag.device_name || tag.device_uid}</b>
                    {tag.device_name && tag.device_uid && tag.device_name !== tag.device_uid && (
                      <span style={{ color: '#64748b' }}> ({tag.device_uid})</span>
                    )}
                  </span>
                </span>
              )}
            </div>

            {/* Row 3: Telemetry (Temp, Humidity, Battery) */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                marginTop: '6px',
                fontSize: '12px',
                color: '#334155'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <IonIcon icon={thermometerOutline} style={{ color: '#dc2626' }} />
                <span>{tempVal !== null ? `${tempVal.toFixed(1)}°C` : '--°C'}</span>
              </span>

              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <IonIcon icon={waterOutline} style={{ color: '#0284c7' }} />
                <span>{humVal !== null ? `${humVal.toFixed(0)}%` : '--%'}</span>
              </span>

              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <IonIcon icon={batteryChargingOutline} style={{ color: '#16a34a' }} />
                <span>{batVal !== null ? `${batVal.toFixed(0)}%` : '--%'}</span>
              </span>
            </div>

            {/* Row 4: GPS Location & Timestamp */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginTop: '6px',
                fontSize: '11px',
                color: '#64748b'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <IonIcon icon={locationOutline} style={{ color: '#2d7d46' }} />
                {latVal != null && lngVal != null
                  ? `${Number(latVal).toFixed(5)}°, ${Number(lngVal).toFixed(5)}°`
                  : 'No GPS coordinates'}
              </span>

              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <IonIcon icon={timeOutline} />
                {formattedDate}
              </span>
            </div>

            {/* Row 5: Notes (if present) */}
            {tag.notes && (
              <div
                style={{
                  marginTop: '6px',
                  paddingTop: '6px',
                  borderTop: '1px dashed #e2e8f0',
                  fontSize: '12px',
                  color: '#475569',
                  fontStyle: 'italic',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <IonIcon icon={documentTextOutline} style={{ color: '#64748b', fontSize: '13px' }} />
                <span>"{tag.notes}"</span>
              </div>
            )}
          </div>
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default TagCard;
