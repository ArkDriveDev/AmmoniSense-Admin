import React from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { SensorData } from '../../types/schema';
import { AMMONIA_THRESHOLDS } from '../../constants/thresholds';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SessionChartsProps {
  readings: SensorData[];
}

export const SessionCharts: React.FC<SessionChartsProps> = ({ readings }) => {
  if (!readings || readings.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        No sensor readings recorded for charts
      </div>
    );
  }

  // 1. Line Chart Data: NH3 over time
  const timeLabels = readings.map((r, idx) => {
    if (!r.created_at) return `#${idx + 1}`;
    const d = new Date(r.created_at);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });

  const ppmValues = readings.map((r) =>
    r.ammonia !== null && r.ammonia !== undefined ? Number(r.ammonia) : 0
  );

  // Point colors: Red for critical (>= 25), Amber for warning (>= 5), Green for safe (< 5)
  const pointBgColors = ppmValues.map((val) => {
    if (val >= AMMONIA_THRESHOLDS.WARNING_MAX) return '#dc2626'; // Red for critical
    if (val >= AMMONIA_THRESHOLDS.SAFE_MAX) return '#f59e0b'; // Amber for warning
    return '#16a34a'; // Green for safe
  });

  const pointRadii = ppmValues.map((val) =>
    val >= AMMONIA_THRESHOLDS.WARNING_MAX ? 6 : 4
  );

  const lineChartData = {
    labels: timeLabels,
    datasets: [
      {
        label: 'NH₃ (ppm)',
        data: ppmValues,
        borderColor: '#1a365d',
        backgroundColor: 'rgba(37, 99, 235, 0.08)',
        fill: true,
        tension: 0.25,
        pointBackgroundColor: pointBgColors,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: pointRadii,
        pointHoverRadius: 7,
      },
    ],
  };

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed.y ?? 0;
            const status =
              val >= AMMONIA_THRESHOLDS.WARNING_MAX
                ? 'CRITICAL (>=25 ppm)'
                : val >= AMMONIA_THRESHOLDS.SAFE_MAX
                ? 'WARNING (5-24 ppm)'
                : 'SAFE (<5 ppm)';
            return ` Ammonia: ${val.toFixed(2)} ppm (${status})`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Ammonia (ppm)',
          color: '#475569',
          font: { weight: 'bold' as const, size: 11 },
        },
        grid: {
          color: '#f1f5f9',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Capture Timeline',
          color: '#475569',
          font: { weight: 'bold' as const, size: 11 },
        },
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 12,
          color: '#64748b',
          font: { size: 10 },
        },
      },
    },
  };

  // 2. Bar Chart Data: Readings per Minute
  // Group readings into minutes from start
  const firstTime = readings[0]?.created_at ? new Date(readings[0].created_at).getTime() : 0;
  const minuteGroups: Record<string, { count: number; avgPpmSum: number }> = {};

  readings.forEach((r) => {
    const t = r.created_at ? new Date(r.created_at).getTime() : firstTime;
    const minuteOffset = Math.floor(Math.max(0, t - firstTime) / 60000) + 1;
    const key = `Min ${minuteOffset}`;
    if (!minuteGroups[key]) {
      minuteGroups[key] = { count: 0, avgPpmSum: 0 };
    }
    minuteGroups[key].count += 1;
    minuteGroups[key].avgPpmSum += r.ammonia ? Number(r.ammonia) : 0;
  });

  const minuteLabels = Object.keys(minuteGroups);
  const readingsCountPerMin = minuteLabels.map((k) => minuteGroups[k].count);
  const avgPpmPerMin = minuteLabels.map((k) =>
    minuteGroups[k].count > 0 ? Number((minuteGroups[k].avgPpmSum / minuteGroups[k].count).toFixed(2)) : 0
  );

  const barChartData = {
    labels: minuteLabels,
    datasets: [
      {
        label: 'Readings Count',
        data: readingsCountPerMin,
        backgroundColor: '#0284c7',
        borderRadius: 6,
        yAxisID: 'y',
      },
      {
        label: 'Avg NH₃ (ppm)',
        data: avgPpmPerMin,
        backgroundColor: avgPpmPerMin.map((ppm) =>
          ppm >= AMMONIA_THRESHOLDS.WARNING_MAX
            ? '#dc2626'
            : ppm >= AMMONIA_THRESHOLDS.SAFE_MAX
            ? '#f59e0b'
            : '#10b981'
        ),
        borderRadius: 6,
        yAxisID: 'y1',
      },
    ],
  };

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { boxWidth: 12, font: { size: 11 } },
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Readings / Min',
          color: '#0284c7',
          font: { weight: 'bold' as const, size: 11 },
        },
        grid: { color: '#f1f5f9' },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Avg PPM',
          color: '#dc2626',
          font: { weight: 'bold' as const, size: 11 },
        },
        grid: { drawOnChartArea: false },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
    },
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', marginBottom: '20px' }}>
      {/* Line Chart */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1a365d' }}>
              NH₃ Telemetry Over Time
            </h4>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Sequential 5-minute capture points (Critical &ge; 25 ppm in red)
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px', fontSize: '10px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#15803d' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a' }} /> Safe
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#b45309' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} /> Warn
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#b91c1c' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#dc2626' }} /> Critical
            </span>
          </div>
        </div>
        <div style={{ height: '240px' }}>
          <Line data={lineChartData} options={lineOptions} />
        </div>
      </div>

      {/* Bar Chart */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1a365d' }}>
            Readings &amp; Average PPM per Minute
          </h4>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Rate of capture and minute-by-minute NH₃ profile
          </span>
        </div>
        <div style={{ height: '240px' }}>
          <Bar data={barChartData} options={barOptions} />
        </div>
      </div>
    </div>
  );
};

export default SessionCharts;
