import React from 'react';
import {
  IonCard,
  IonCardContent,
  IonBadge,
  IonIcon,
  IonButton
} from '@ionic/react';
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
  personOutline,
  closeOutline,
  imageOutline,
  shieldCheckmarkOutline,
  alertCircleOutline
} from 'ionicons/icons';
import { InspectionTagDetails } from '../../types/schema';
import { getAmmoniaBadgeStyle } from '../../components/admin/TagCard';
import { getViolationCategoryLabel, getViolationCategoryLaw } from '../../constants/violationCategories';

interface TagDetailProps {
  tag: InspectionTagDetails;
  onClose?: () => void;
}

export const TagDetail: React.FC<TagDetailProps> = ({ tag, onClose }) => {
  const photo = tag.photo_url || tag.photo_thumbnail_url;
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
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    : 'Unknown Date';

  const scheduledDateFormatted = tag.scheduled_date
    ? new Date(tag.scheduled_date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '16px' }}>
      {/* Top Header Card */}
      <IonCard
        style={{
          margin: '0 0 16px 0',
          borderRadius: '14px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0'
        }}
      >
        <IonCardContent style={{ padding: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '12px',
              flexWrap: 'wrap'
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  color: '#64748b'
                }}
              >
                Read-Only Inspection Tag Details
              </span>
              <h2
                style={{
                  margin: '4px 0 8px 0',
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#0f172a'
                }}
              >
                {tag.tag_name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '13px',
                    color: '#334155',
                    backgroundColor: '#f1f5f9',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontWeight: 600
                  }}
                >
                  <IonIcon icon={businessOutline} style={{ color: '#059669' }} />
                  {tag.site_name || 'Unassigned Site'} {tag.site_code ? `(${tag.site_code})` : ''}
                </span>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: '#64748b'
                  }}
                >
                  <IonIcon icon={timeOutline} />
                  {formattedDate}
                </span>

                {tag.violation_category && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      border: '1px solid #f87171',
                      padding: '3px 10px',
                      borderRadius: '6px'
                    }}
                  >
                    <IonIcon icon={alertCircleOutline} style={{ color: '#dc2626', fontSize: '15px' }} />
                    Violation: {getViolationCategoryLabel(tag.violation_category)}
                    {getViolationCategoryLaw(tag.violation_category) && ` (${getViolationCategoryLaw(tag.violation_category)})`}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  backgroundColor: badge.bg,
                  color: badge.color,
                  border: `1px solid ${badge.border}`,
                  fontSize: '14px',
                  fontWeight: 800,
                  padding: '6px 12px',
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: badge.dotColor
                  }}
                />
                {ammoniaVal !== null ? `${ammoniaVal.toFixed(2)} PPM` : '-- PPM'}
              </span>

              <IonBadge
                color={badge.badgeColor}
                style={{
                  fontSize: '12px',
                  padding: '6px 10px',
                  fontWeight: 800,
                  letterSpacing: '0.5px'
                }}
              >
                {tag.status || badge.label}
              </IonBadge>

              {onClose && (
                <IonButton
                  fill="clear"
                  color="medium"
                  size="small"
                  onClick={onClose}
                  style={{ margin: 0 }}
                >
                  <IonIcon icon={closeOutline} slot="icon-only" style={{ fontSize: '20px' }} />
                </IonButton>
              )}
            </div>
          </div>
        </IonCardContent>
      </IonCard>

      {/* Main Grid: Photo & Telemetry Details */}
      <div style={{ display: 'grid', gridTemplateColumns: photo ? '1fr 1fr' : '1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Photo Box */}
        {photo ? (
          <IonCard
            style={{
              margin: 0,
              borderRadius: '14px',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              backgroundColor: '#0f172a',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ position: 'relative', width: '100%', minHeight: '260px', flex: 1 }}>
              <img
                src={photo}
                alt={tag.tag_name}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(4px)',
                  padding: '6px 10px',
                  color: '#ffffff',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <IonIcon icon={imageOutline} />
                <span>Inspection Stamped Photo Evidence</span>
              </div>
            </div>
          </IonCard>
        ) : (
          <IonCard
            style={{
              margin: 0,
              borderRadius: '14px',
              border: '1px dashed #cbd5e1',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px',
              color: '#94a3b8'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <IonIcon icon={imageOutline} style={{ fontSize: '36px', color: '#cbd5e1' }} />
              <p style={{ margin: '8px 0 0 0', fontSize: '13px', fontWeight: 600 }}>No Photo Attached</p>
            </div>
          </IonCard>
        )}

        {/* Telemetry Metrics Card */}
        <IonCard
          style={{
            margin: 0,
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
        >
          <IonCardContent style={{ padding: '16px' }}>
            <h4
              style={{
                margin: '0 0 14px 0',
                fontSize: '14px',
                fontWeight: 700,
                color: '#1a365d',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Sensor Telemetry & Readings
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Ammonia Box */}
              <div
                style={{
                  backgroundColor: badge.bg,
                  border: `1px solid ${badge.border}`,
                  padding: '12px',
                  borderRadius: '10px'
                }}
              >
                <div style={{ fontSize: '11px', color: badge.color, fontWeight: 700 }}>AMMONIA (NH₃)</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: badge.color, marginTop: '2px' }}>
                  {ammoniaVal !== null ? `${ammoniaVal.toFixed(2)} PPM` : '--'}
                </div>
                <div style={{ fontSize: '11px', color: badge.color, marginTop: '2px' }}>
                  Status: <b>{tag.status || badge.label}</b>
                </div>
              </div>

              {/* Temperature Box */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '12px',
                  borderRadius: '10px'
                }}
              >
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IonIcon icon={thermometerOutline} style={{ color: '#dc2626' }} />
                  TEMPERATURE
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {tempVal !== null ? `${tempVal.toFixed(1)}°C` : '--'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Ambient Temp</div>
              </div>

              {/* Humidity Box */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '12px',
                  borderRadius: '10px'
                }}
              >
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IonIcon icon={waterOutline} style={{ color: '#0284c7' }} />
                  HUMIDITY
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {humVal !== null ? `${humVal.toFixed(0)}%` : '--'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Relative Humidity</div>
              </div>

              {/* Battery Box */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '12px',
                  borderRadius: '10px'
                }}
              >
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IonIcon icon={batteryChargingOutline} style={{ color: '#16a34a' }} />
                  BATTERY LEVEL
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {batVal !== null ? `${batVal.toFixed(0)}%` : '--'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Device Power</div>
              </div>
            </div>
          </IonCardContent>
        </IonCard>
      </div>

      {/* Structured Details Card */}
      <IonCard
        style={{
          margin: 0,
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
      >
        <IonCardContent style={{ padding: '18px 20px' }}>
          <h4
            style={{
              margin: '0 0 14px 0',
              fontSize: '14px',
              fontWeight: 700,
              color: '#1a365d',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            Context & Environmental Metadata
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '13px' }}>
            <div>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <IonIcon icon={businessOutline} style={{ color: '#059669' }} />
                Inspection Site
              </span>
              <b style={{ color: '#0f172a', display: 'block', marginTop: '2px' }}>
                {tag.site_name || 'N/A'} {tag.site_code ? `(${tag.site_code})` : ''}
              </b>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <IonIcon icon={calendarOutline} style={{ color: '#2563eb' }} />
                Inspection Schedule
              </span>
              <b style={{ color: '#0f172a', display: 'block', marginTop: '2px' }}>
                {tag.schedule_name || 'Unassigned Schedule'}
                {scheduledDateFormatted && ` [${scheduledDateFormatted}]`}
              </b>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <IonIcon icon={hardwareChipOutline} style={{ color: '#1a365d' }} />
                BLE Telemetry Device
              </span>
              <b style={{ color: '#0f172a', display: 'block', marginTop: '2px' }}>
                {tag.device_name || tag.device_uid || 'No Device Registered'}
                {tag.device_name && tag.device_uid && tag.device_name !== tag.device_uid && (
                  <span style={{ fontWeight: 400, color: '#64748b' }}> ({tag.device_uid})</span>
                )}
              </b>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <IonIcon icon={locationOutline} style={{ color: '#2d7d46' }} />
                GPS Coordinates
              </span>
              <b style={{ color: '#0f172a', display: 'block', marginTop: '2px' }}>
                {latVal != null && lngVal != null
                  ? `${Number(latVal).toFixed(6)}°, ${Number(lngVal).toFixed(6)}°`
                  : 'Coordinates not recorded'}
              </b>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <IonIcon icon={personOutline} style={{ color: '#7c3aed' }} />
                Logged By
              </span>
              <b style={{ color: '#0f172a', display: 'block', marginTop: '2px' }}>
                {tag.created_by_name || 'Inspector / Mobile User'}
              </b>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <IonIcon icon={alertCircleOutline} style={{ color: tag.violation_category ? '#dc2626' : '#64748b' }} />
                Violation Category
              </span>
              <b style={{ color: tag.violation_category ? '#b91c1c' : '#0f172a', display: 'block', marginTop: '2px' }}>
                {tag.violation_category
                  ? `${getViolationCategoryLabel(tag.violation_category)}${getViolationCategoryLaw(tag.violation_category) ? ` [${getViolationCategoryLaw(tag.violation_category)}]` : ''}`
                  : 'No Violation Tagged (Compliant)'}
              </b>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <IonIcon icon={shieldCheckmarkOutline} style={{ color: '#0891b2' }} />
                Status Mode
              </span>
              <b style={{ color: '#0f172a', display: 'block', marginTop: '2px' }}>
                Read-Only Record (Protected)
              </b>
            </div>
          </div>

          {/* Notes Section */}
          {tag.notes && (
            <div
              style={{
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid #f1f5f9'
              }}
            >
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <IonIcon icon={documentTextOutline} style={{ color: '#0f172a' }} />
                Inspection Notes & Remarks
              </span>
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginTop: '6px',
                  fontSize: '13px',
                  color: '#334155',
                  fontStyle: 'italic',
                  lineHeight: '1.5'
                }}
              >
                "{tag.notes}"
              </div>
            </div>
          )}
        </IonCardContent>
      </IonCard>

      {/* Read-Only Notice (No Edit/Delete Buttons) */}
      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        {onClose && (
          <IonButton fill="outline" color="dark" onClick={onClose} style={{ minWidth: '120px' }}>
            Close
          </IonButton>
        )}
      </div>
    </div>
  );
};

export default TagDetail;
