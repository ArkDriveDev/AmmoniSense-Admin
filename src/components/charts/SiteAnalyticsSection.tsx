import React from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge,
  IonIcon,
} from '@ionic/react';
import {
  businessOutline,
  calendarOutline,
  pricetagOutline,
  analyticsOutline,
  warningOutline,
  pulseOutline,
} from 'ionicons/icons';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { SiteSensorMetric, SiteSensorAggregate } from '../../hooks/useSiteSensorAnalytics';
import StatsCard from './StatsCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SiteAnalyticsSectionProps {
  aggregate: SiteSensorAggregate;
  siteMetrics: SiteSensorMetric[];
  loading?: boolean;
}

export const SiteAnalyticsSection: React.FC<SiteAnalyticsSectionProps> = ({
  aggregate,
  siteMetrics,
  loading = false,
}) => {
  const siteLabels = siteMetrics.map((m) =>
    m.siteName.length > 18 ? m.siteName.substring(0, 16) + '...' : m.siteName
  );

  const avgPpmData = {
    labels: siteLabels.length > 0 ? siteLabels : ['No Data'],
    datasets: [
      {
        label: 'Average Ammonia (PPM)',
        data: siteMetrics.length > 0 ? siteMetrics.map((m) => m.avgPpm) : [0],
        backgroundColor: siteMetrics.map((m) =>
          m.avgPpm >= 25 ? 'rgba(239, 68, 68, 0.75)' : 'rgba(37, 99, 235, 0.75)'
        ),
        borderColor: siteMetrics.map((m) =>
          m.avgPpm >= 25 ? '#dc2626' : '#1d4ed8'
        ),
        borderWidth: 1.5,
        borderRadius: 6,
      },
    ],
  };

  const criticalReadingsData = {
    labels: siteLabels.length > 0 ? siteLabels : ['No Data'],
    datasets: [
      {
        label: 'Critical Readings (>= 25 PPM)',
        data: siteMetrics.length > 0 ? siteMetrics.map((m) => m.criticalCount) : [0],
        backgroundColor: 'rgba(234, 88, 12, 0.75)',
        borderColor: '#c2410c',
        borderWidth: 1.5,
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = (chartTitle: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: chartTitle,
        font: {
          size: 13,
          weight: 'bold' as const,
        },
        color: '#1a365d',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { font: { size: 10 } },
      },
      x: {
        ticks: { font: { size: 9 }, maxRotation: 45, minRotation: 0 },
      },
    },
  });

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <IonIcon icon={analyticsOutline} style={{ fontSize: '22px', color: '#1a365d' }} />
        <div>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#1a365d' }}>
            Inspection Sites Analytics & Telemetry ({aggregate.totalSites})
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Aggregated sensor telemetry data from IoT devices across all active sites
          </span>
        </div>
      </div>

      {/* Aggregate KPI Cards Row */}
      <IonGrid style={{ padding: 0 }}>
        <IonRow>
          <IonCol size="6" size-sm="4" size-md="2.4">
            <StatsCard
              title="Monitored Sites"
              value={aggregate.totalSites}
              icon={businessOutline}
              color="primary"
            />
          </IonCol>
          <IonCol size="6" size-sm="4" size-md="2.4">
            <StatsCard
              title="Total Schedules"
              value={aggregate.totalSchedules}
              icon={calendarOutline}
              color="secondary"
            />
          </IonCol>
          <IonCol size="6" size-sm="4" size-md="2.4">
            <StatsCard
              title="Inspection Tags"
              value={aggregate.totalTags}
              icon={pricetagOutline}
              color="tertiary"
            />
          </IonCol>
          <IonCol size="6" size-sm="6" size-md="2.4">
            <StatsCard
              title="Sensor Readings"
              value={aggregate.totalReadings}
              icon={pulseOutline}
              color="success"
            />
          </IonCol>
          <IonCol size="12" size-sm="6" size-md="2.4">
            <StatsCard
              title="Overall Avg NH₃"
              value={`${aggregate.overallAvgPpm.toFixed(1)} PPM`}
              icon={analyticsOutline}
              color={aggregate.overallAvgPpm >= 25 ? 'danger' : 'primary'}
            />
          </IonCol>
        </IonRow>

        {/* Charts Row */}
        <IonRow style={{ marginTop: '8px' }}>
          <IonCol size="12" size-md="6">
            <IonCard style={{ margin: 0, borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', backgroundColor: '#ffffff' }}>
              <IonCardContent style={{ padding: '16px', height: '240px' }}>
                <Bar data={avgPpmData} options={chartOptions('Average NH₃ Concentration per Site (PPM)')} />
              </IonCardContent>
            </IonCard>
          </IonCol>

          <IonCol size="12" size-md="6">
            <IonCard style={{ margin: 0, borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', backgroundColor: '#ffffff' }}>
              <IonCardContent style={{ padding: '16px', height: '240px' }}>
                <Bar data={criticalReadingsData} options={chartOptions('Critical Exceedances (≥25 PPM) per Site')} />
              </IonCardContent>
            </IonCard>
          </IonCol>
        </IonRow>
      </IonGrid>
    </div>
  );
};

export default SiteAnalyticsSection;
