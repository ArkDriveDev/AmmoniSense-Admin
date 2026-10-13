import React from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { ReportViolation, ReportReading } from '../../types/inspectionReport';
import { getViolationCategoryLabel } from '../../constants/violationCategories';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface ReportChartsProps {
  violations: ReportViolation[];
  readings: ReportReading[];
}

export const ReportCharts: React.FC<ReportChartsProps> = ({ violations, readings }) => {
  // Violations per category
  const catCounts: Record<string, number> = {};
  violations.forEach((v) => {
    const label = getViolationCategoryLabel(v.violation_category);
    catCounts[label] = (catCounts[label] || 0) + 1;
  });

  const violChartData = {
    labels: Object.keys(catCounts),
    datasets: [{
      label: 'Violations',
      data: Object.values(catCounts),
      backgroundColor: 'rgba(239, 68, 68, 0.75)',
      borderColor: '#dc2626',
      borderWidth: 1,
    }],
  };

  // NH3 per tag (only tags with recorded sensor readings)
  const nh3Readings = readings.filter((r) => r.ammonia !== null);
  const nh3ChartData = {
    labels: nh3Readings.map((r) => r.tag_name),
    datasets: [{
      label: 'NH₃ (ppm)',
      data: nh3Readings.map((r) => r.ammonia ?? 0),
      backgroundColor: nh3Readings.map((r) => (r.nh3Status === 'CRITICAL' ? 'rgba(220,38,38,0.75)' : r.nh3Status === 'WARNING' ? 'rgba(234,179,8,0.75)' : 'rgba(22,163,74,0.75)')),
      borderWidth: 1,
    }],
  };

  const chartBox: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '12px 14px',
    marginBottom: 16,
  };

  const commonOptions = (title: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, title: { display: true, text: title, font: { size: 12 } } },
    scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } },
  });

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a365d', textTransform: 'uppercase', marginBottom: 8 }}>
        Visual Analysis &amp; Sensor Trends
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={chartBox}>
          {Object.keys(catCounts).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 12 }}>No violation data for chart</div>
          ) : (
            <div style={{ height: 190 }}><Bar data={violChartData} options={commonOptions('Violations by Category')} /></div>
          )}
        </div>
        <div style={chartBox}>
          {nh3Readings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 12 }}>No NH₃ sensor readings recorded</div>
          ) : (
            <div style={{ height: 190 }}><Bar data={nh3ChartData} options={commonOptions('NH₃ Reading per Tag (ppm)')} /></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportCharts;
