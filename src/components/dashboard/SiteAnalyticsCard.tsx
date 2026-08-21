import React, { useState } from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol
} from '@ionic/react';
import {
  chevronDownOutline,
  chevronUpOutline,
  alertCircleOutline,
  pulseOutline,
  locationOutline,
  openOutline,
  mapOutline,
  hardwareChipOutline,
  calendarOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { SiteAnalyticsData } from '../../hooks/useSiteAnalytics';
import SiteOdorMap from '../map/SiteOdorMap';

interface SiteAnalyticsCardProps {
  site: SiteAnalyticsData;
}

export const SiteAnalyticsCard: React.FC<SiteAnalyticsCardProps> = ({ site }) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  const history = useHistory();

  const getSiteTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'piggery':
        return { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857' };
      case 'ambient':
        return { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' };
      case 'industrial':
        return { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9' };
      default:
        return { bg: '#f8fafc', border: '#e2e8f0', text: '#475569' };
    }
  };

  const getStatusDetails = (status: 'normal' | 'warning' | 'critical', ammonia: number | null) => {
    if (status === 'critical' || (ammonia !== null && ammonia > 50)) {
      return { label: '🔴 Critical', bg: '#fef2f2', border: '#fecaca', text: '#dc2626' };
    }
    if (status === 'warning' || (ammonia !== null && ammonia > 25)) {
      return { label: '🟡 Warning', bg: '#fffbeb', border: '#fde68a', text: '#d97706' };
    }
    return { label: '🟢 Normal', bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' };
  };

  const typeStyles = getSiteTypeColor(site.site_type);
  const statusDetails = getStatusDetails(site.alert_status, site.latest_ammonia);

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return 'No readings yet';
    const date = new Date(timeStr);
    const diffMins = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const trendChartData = {
    labels: site.trend_7days.map((t) => t.date),
    datasets: [{
      label: 'Ammonia (ppm)',
      data: site.trend_7days.map((t) => t.ammonia),
      borderColor: statusDetails.text,
      backgroundColor: `${statusDetails.text}1f`,
      fill: true,
      tension: 0.35,
      borderWidth: 2.5,
      pointRadius: 4,
    }],
  };

  return (
    <IonCard style={{ margin: '0 0 16px 0', borderRadius: '14px', border: `1.5px solid ${site.alert_status === 'critical' ? '#fca5a5' : '#e2e8f0'}`, backgroundColor: '#ffffff' }}>
      <IonCardHeader onClick={() => setExpanded(!expanded)} style={{ padding: '16px 20px', cursor: 'pointer', backgroundColor: site.alert_status === 'critical' ? '#fff5f5' : '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: statusDetails.text }} />
            <IonCardTitle style={{ fontSize: '18px', fontWeight: '700', color: '#1a365d', margin: 0 }}>{site.site_name}</IonCardTitle>
            <span style={{ backgroundColor: typeStyles.bg, border: `1px solid ${typeStyles.border}`, color: typeStyles.text, fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '12px', textTransform: 'uppercase' }}>
              {site.site_type}
            </span>
            {site.alert_status === 'critical' && (
              <span style={{ backgroundColor: '#dc2626', color: '#ffffff', fontSize: '11px', fontWeight: '800', padding: '3px 10px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <IonIcon icon={alertCircleOutline} style={{ fontSize: '14px' }} /> CRITICAL ALERT
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ backgroundColor: statusDetails.bg, color: statusDetails.text, border: `1px solid ${statusDetails.border}`, fontSize: '13px', fontWeight: '700', padding: '4px 12px', borderRadius: '20px' }}>
              {statusDetails.label}
            </span>
            <IonButton fill="clear" size="small" style={{ '--color': '#64748b' }}>
              <IonIcon icon={expanded ? chevronUpOutline : chevronDownOutline} slot="icon-only" />
            </IonButton>
          </div>
        </div>

        {/* Summary Metrics Row */}
        <IonGrid style={{ padding: '14px 0 0 0', margin: 0 }}>
          <IonRow className="ion-align-items-center">
            <IonCol size="6" size-sm="4" size-md="2.4">
              <div style={{ padding: '6px 10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', display: 'block' }}>Ammonia (NH₃)</span>
                <span style={{ fontSize: '17px', fontWeight: '800', color: statusDetails.text }}>{site.latest_ammonia !== null ? `${site.latest_ammonia.toFixed(1)} ppm` : 'N/A'}</span>
              </div>
            </IonCol>
            <IonCol size="6" size-sm="4" size-md="2.4">
              <div style={{ padding: '6px 10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', display: 'block' }}>Temp / Humidity</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>{site.latest_temperature !== null ? `${site.latest_temperature.toFixed(1)}°C` : '--'} | {site.latest_humidity !== null ? `${site.latest_humidity.toFixed(0)}%` : '--'}</span>
              </div>
            </IonCol>
            <IonCol size="6" size-sm="4" size-md="2.4">
              <div style={{ padding: '6px 10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', display: 'block' }}>Device Health</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: site.device_status === 'Online' ? '#16a34a' : '#dc2626' }}>{site.device_status} ({site.devices.length} dev)</span>
              </div>
            </IonCol>
            <IonCol size="6" size-sm="4" size-md="2.4">
              <div style={{ padding: '6px 10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', display: 'block' }}>7-Day Activity</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#1a365d' }}>{site.reading_count_7days} readings</span>
              </div>
            </IonCol>
            <IonCol size="12" size-sm="4" size-md="2.4">
              <div style={{ padding: '6px 10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', display: 'block' }}>Owner / Last Seen</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>👤 {site.owner_name}</span>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>🕒 {formatTime(site.last_reading_at)}</span>
              </div>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonCardHeader>

      {/* Expanded Content Section */}
      {expanded && (
        <IonCardContent style={{ padding: '20px', backgroundColor: '#fafafa', borderTop: '1px solid #f1f5f9' }}>
          <IonGrid style={{ padding: 0 }}>
            <IonRow>
              <IonCol size="12" size-lg="7">
                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#1a365d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IonIcon icon={pulseOutline} style={{ color: '#2563eb' }} /> 7-Day Ammonia Level Trend (ppm)
                  </h4>
                  <div style={{ height: '220px', width: '100%' }}>
                    <Line data={trendChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                  </div>
                </div>
              </IonCol>
            </IonRow>
          </IonGrid>
        </IonCardContent>
      )}
    </IonCard>
  );
};

export default SiteAnalyticsCard;
