import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { IonCard, IonCardContent, IonIcon } from '@ionic/react';

ChartJS.register(ArcElement, Tooltip, Legend);

export interface DoughnutSlice {
  label: string;
  value: number;
  color: string;
}

export interface DashboardDoughnutCardProps {
  title: string;
  icon?: string;
  slices: DoughnutSlice[];
  totalLabel?: string;
  subtitleNote?: string | null;
  emptyMessage?: string;
  allowZeroSlices?: boolean;
}

export default function DashboardDoughnutCard({
  title,
  icon,
  slices,
  totalLabel = 'Total',
  subtitleNote,
  emptyMessage = 'No data recorded.',
  allowZeroSlices = false,
}: DashboardDoughnutCardProps) {
  // When allowZeroSlices is true, retain every slice (even if value is 0)
  // so the legend displays all categories with their count: "Label (X)".
  const activeSlices = allowZeroSlices ? slices : slices.filter((s) => s.value > 0);
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  // If allowZeroSlices is true, do not show an empty placeholder even when total is 0
  const showEmptyPlaceholder = !allowZeroSlices && total === 0;

  const chartData = {
    labels: activeSlices.map((s) => s.label),
    datasets: total === 0 ? [
      {
        data: [1],
        backgroundColor: ['#e2e8f0'],
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 0,
      },
    ] : [
      {
        data: activeSlices.map((s) => s.value),
        backgroundColor: activeSlices.map((s) => s.color),
        borderColor: '#ffffff',
        borderWidth: activeSlices.map((s) => (s.value > 0 ? 2 : 0)),
        hoverOffset: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: 'circle' as const,
          padding: 10,
          font: {
            size: 11,
            weight: 600,
            family: 'system-ui, -apple-system, sans-serif',
          },
          color: '#334155',
          generateLabels: () => {
            return activeSlices.map((slice, i) => ({
              text: `${slice.label} (${slice.value})`,
              fillStyle: slice.color,
              strokeStyle: slice.color,
              lineWidth: 0,
              pointStyle: 'circle' as const,
              hidden: false,
              index: i,
            }));
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            if (total === 0) return ' No data (0)';
            const val = Number(context.raw || 0);
            const pct = total > 0 ? Math.round((val / total) * 100) : 0;
            return ` ${context.label}: ${val} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <IonCard
      style={{
        margin: 0,
        borderRadius: '14px',
        border: '1px solid #cbd5e1',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
        backgroundColor: '#ffffff',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <IonCardContent
        style={{
          padding: '16px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Card Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          {icon && <IonIcon icon={icon} style={{ fontSize: '18px', color: '#1a365d' }} />}
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#1a365d' }}>
            {title}
          </h3>
        </div>

        {/* Content Body: Chart with Center Count or Empty Placeholder */}
        {showEmptyPlaceholder ? (
          <div
            style={{
              flex: 1,
              minHeight: '190px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f8fafc',
              borderRadius: '10px',
              border: '1px dashed #cbd5e1',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
              {emptyMessage}
            </p>
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%', height: '190px' }}>
            <Doughnut data={chartData} options={chartOptions} />

            {/* Center Hole Total Count */}
            <div
              style={{
                position: 'absolute',
                top: '46%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#1a365d', lineHeight: '1.1' }}>
                {total}
              </div>
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginTop: '2px',
                }}
              >
                {totalLabel}
              </div>
            </div>
          </div>
        )}

        {/* Optional Subtitle Note */}
        {subtitleNote && (
          <div
            style={{
              fontSize: '11px',
              color: '#64748b',
              textAlign: 'center',
              marginTop: '8px',
              fontStyle: 'italic',
            }}
          >
            {subtitleNote}
          </div>
        )}
      </IonCardContent>
    </IonCard>
  );
}
