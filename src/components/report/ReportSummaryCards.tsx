import React from 'react';
import { ReportStats } from '../../types/inspectionReport';

interface ReportSummaryCardsProps {
  stats: ReportStats;
}

export const ReportSummaryCards: React.FC<ReportSummaryCardsProps> = ({ stats }) => {
  const complianceStatus =
    stats.criticalCount > 0 || stats.violationCount > 2
      ? { label: 'NON-COMPLIANT', color: '#dc2626', bg: '#fee2e2' }
      : stats.violationCount > 0 || (stats.highestPpm !== null && stats.highestPpm >= 5)
      ? { label: 'ATTENTION REQ.', color: '#d97706', bg: '#fef3c7' }
      : { label: 'COMPLIANT', color: '#16a34a', bg: '#dcfce7' };

  const cards = [
    { label: 'Overall Status', val: complianceStatus.label, color: complianceStatus.color, bg: complianceStatus.bg },
    { label: 'Total Violations', val: String(stats.violationCount), color: stats.violationCount > 0 ? '#dc2626' : '#16a34a' },
    { label: 'Highest NH₃', val: stats.highestPpm !== null ? `${stats.highestPpm.toFixed(1)} ppm` : 'N/A', color: stats.criticalCount > 0 ? '#dc2626' : '#0f172a' },
    { label: 'Average NH₃', val: stats.averagePpm !== null ? `${stats.averagePpm.toFixed(1)} ppm` : 'N/A', color: '#0f172a' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
      {cards.map((c, i) => (
        <div key={i} style={{
          background: c.bg ?? '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '10px 12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
            {c.label}
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: c.color, marginTop: 4 }}>
            {c.val}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReportSummaryCards;
