import React, { useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import {
  closeOutline,
  businessOutline,
  locationOutline,
  calendarOutline,
  pricetagOutline,
  imageOutline,
  warningOutline,
  openOutline,
  timeOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import {
  getSiteTypeLabel,
  getPoultryTypeLabel,
  getChickenTypeLabel,
} from '../../constants/siteConstants';
import { SiteAnalyticsData } from '../../hooks/useSiteAnalytics';
import { InspectionSiteWithSummary } from '../../hooks/useInspectionSites';

// Compatible type for both SiteAnalyticsData and InspectionSiteWithSummary
export type SiteDetailData = (Partial<SiteAnalyticsData> & Partial<InspectionSiteWithSummary>) & {
  id: number;
  site_name: string;
};

export interface SiteDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: SiteDetailData | null;
  onOpenInSites?: (siteId: number) => void;
}

export const SiteDetailModal: React.FC<SiteDetailModalProps> = ({
  isOpen,
  onClose,
  site,
  onOpenInSites,
}) => {
  const history = useHistory();

  // Handle Escape key to dismiss modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!site) return null;

  const lat = site.latitude ?? site.current_latitude;
  const lng = site.longitude ?? site.current_longitude;
  const siteCode = site.site_code || `SITE-${site.id}`;
  const address = site.address || 'Address not specified';
  const photoUrl = site.site_photo_url || site.site_photo_thumbnail;

  const schedulesCount = site.schedule_count ?? 0;
  const tagsCount = site.tag_count ?? 0;
  const photosCount = site.photo_count ?? 0;
  const avgAmmonia = site.avg_ammonia;
  const criticalCount = site.critical_readings ?? 0;
  const highestAmmonia = site.highest_ammonia ?? site.max_ammonia ?? site.latest_ammonia;
  const lastInspection = site.last_inspection_at;

  const handleNavigateToSites = () => {
    onClose();
    if (onOpenInSites) {
      onOpenInSites(site.id);
    } else {
      history.push(`/inspection-sites?siteId=${site.id}`);
    }
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      backdropDismiss={true}
      style={{
        '--max-width': '640px',
        '--border-radius': '14px',
      }}
    >
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontSize: '16px', fontWeight: 'bold' }}>
            <IonIcon icon={businessOutline} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Inspection Site Details
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose} title="Close Modal (Esc)">
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f8fafc' }} scrollY={true}>
        <div style={{ paddingBottom: '16px' }}>
          {/* Site Photo Header (if available) */}
          {photoUrl ? (
            <div
              style={{
                width: '100%',
                height: '180px',
                borderRadius: '10px',
                overflow: 'hidden',
                marginBottom: '16px',
                border: '1px solid #e2e8f0',
                position: 'relative',
                backgroundColor: '#0f172a',
              }}
            >
              <img
                src={photoUrl}
                alt={site.site_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '12px',
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 600,
                  backdropFilter: 'blur(4px)',
                }}
              >
                Inspection Photo &bull; {siteCode}
              </div>
            </div>
          ) : null}

          {/* Site Title and Badges */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1a365d' }}>
                {site.site_name}
              </h2>
              <IonBadge color="primary" style={{ fontSize: '11px', fontWeight: 700 }}>
                {siteCode}
              </IonBadge>
              <IonBadge color="secondary" style={{ fontSize: '11px' }}>
                {getSiteTypeLabel(site.site_type)}
              </IonBadge>
              {site.poultry_type && (
                <IonBadge color="tertiary" style={{ fontSize: '11px' }}>
                  Poultry: {getPoultryTypeLabel(site.poultry_type)}
                </IonBadge>
              )}
              {site.chicken_type && (
                <IonBadge color="dark" style={{ fontSize: '11px' }}>
                  Chicken: {getChickenTypeLabel(site.chicken_type)}
                </IonBadge>
              )}
              {site.is_active === false && (
                <IonBadge color="medium" style={{ fontSize: '11px' }}>
                  INACTIVE
                </IonBadge>
              )}
            </div>

            {/* Address and Coordinates */}
            <div style={{ color: '#475569', fontSize: '13px', lineHeight: 1.5, marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <IonIcon icon={locationOutline} style={{ color: '#059669', fontSize: '16px' }} />
                <span>{address}</span>
              </div>
              {lat != null && lng != null && (
                <div style={{ fontSize: '12px', color: '#64748b', marginLeft: '21px', marginTop: '2px' }}>
                  GPS Coordinates: <b>{Number(lat).toFixed(5)}° N, {Number(lng).toFixed(5)}° E</b>
                  {site.area_size_hectares ? ` &bull; ${site.area_size_hectares} ha` : ''}
                </div>
              )}
            </div>
          </div>

          {/* Short Summary Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px',
              margin: '16px 0',
            }}
          >
            {/* Schedules Count */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IonIcon icon={calendarOutline} style={{ color: '#2563eb' }} /> Schedules
              </span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#1a365d', marginTop: '2px' }}>
                {schedulesCount}
              </div>
            </div>

            {/* Tags Count */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IonIcon icon={pricetagOutline} style={{ color: '#0891b2' }} /> Field Tags
              </span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#1a365d', marginTop: '2px' }}>
                {tagsCount}
              </div>
            </div>

            {/* Photos Count */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IonIcon icon={imageOutline} style={{ color: '#7c3aed' }} /> Photos
              </span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#1a365d', marginTop: '2px' }}>
                {photosCount}
              </div>
            </div>

            {/* Highest / Peak Ammonia */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IonIcon icon={warningOutline} style={{ color: criticalCount > 0 ? '#dc2626' : '#d97706' }} /> Peak NH₃
              </span>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: highestAmmonia && highestAmmonia > 25 ? '#dc2626' : '#15803d',
                  marginTop: '2px',
                }}
              >
                {highestAmmonia != null ? `${Number(highestAmmonia).toFixed(1)} ppm` : avgAmmonia != null ? `${Number(avgAmmonia).toFixed(1)} ppm` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Last Inspection Banner */}
          <div
            style={{
              backgroundColor: '#f1f5f9',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              fontSize: '12px',
              color: '#334155',
              border: '1px solid #e2e8f0',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IonIcon icon={timeOutline} style={{ color: '#0284c7', fontSize: '16px' }} />
              <span>
                <strong>Last Inspection:</strong>{' '}
                {lastInspection ? new Date(lastInspection).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'No inspections recorded yet'}
              </span>
            </div>

            {criticalCount > 0 && (
              <span style={{ color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <IonIcon icon={warningOutline} /> {criticalCount} Critical Reading(s)
              </span>
            )}
          </div>

          {/* Action Buttons Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <IonButton fill="outline" color="medium" onClick={onClose}>
              Close
            </IonButton>
            <IonButton
              fill="solid"
              style={{ '--background': '#1a365d', fontWeight: 700 }}
              onClick={handleNavigateToSites}
            >
              Open in Sites <IonIcon icon={openOutline} slot="end" />
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default SiteDetailModal;
