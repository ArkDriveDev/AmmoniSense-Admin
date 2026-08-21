import React, { useState } from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
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

  return (
    <IonCard style={{ margin: '0 0 16px 0', borderRadius: '14px', border: `1.5px solid ${site.alert_status === 'critical' ? '#fca5a5' : '#e2e8f0'}`, backgroundColor: '#ffffff' }}>
      <IonCardHeader style={{ padding: '16px 20px' }}>
        <IonCardTitle style={{ fontSize: '18px', fontWeight: '700', color: '#1a365d' }}>{site.site_name}</IonCardTitle>
      </IonCardHeader>
    </IonCard>
  );
};

export default SiteAnalyticsCard;
