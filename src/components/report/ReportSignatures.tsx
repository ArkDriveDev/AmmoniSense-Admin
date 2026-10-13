import React from 'react';
import { ReportSchedule, ReportSite, ReportStats } from '../../types/inspectionReport';

interface ReportSignaturesProps {
  schedule: ReportSchedule;
  site: ReportSite;
  stats: ReportStats;
  inspectorName: string;
  adminName: string;
}

export const ReportSignatures: React.FC<ReportSignaturesProps> = ({
  schedule, site, stats, inspectorName, adminName,
}) => {
  const formattedDate = new Date(schedule.scheduled_date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a365d', textTransform: 'uppercase', marginBottom: 8 }}>
        Conclusion &amp; Recommendations
      </div>
      <p style={{
        fontSize: 12, lineHeight: 1.6, color: '#334155', background: '#f8fafc',
        border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', margin: 0,
      }}>
        Based on the field inspection conducted on <strong>{formattedDate}</strong>,{' '}
        <strong>{site.site_name}</strong> was recorded with{' '}
        <strong>{stats.violationCount}</strong> violation{stats.violationCount !== 1 ? 's' : ''}
        {stats.highestPpm !== null ? ` and ${stats.criticalCount} critical ammonia reading(s)` : ''}.
        {stats.violationCount > 0
          ? ' The site is marked NON-COMPLIANT. Corrective action and follow-up field monitoring are required by MENRO.'
          : ' The site meets environmental compliance standards.'}
      </p>

      <div style={{ display: 'flex', gap: 40, marginTop: 28 }}>
        {[
          { role: 'Inspected By', name: inspectorName, title: 'Field Inspector' },
          { role: 'Reviewed By', name: adminName, title: 'MENRO Officer / Administrator' },
        ].map((s, idx) => (
          <div key={idx} style={{ flex: 1 }}>
            <div style={{ borderBottom: '1.5px solid #1a365d', paddingBottom: 36, marginBottom: 6 }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{s.name}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{s.role} &bull; {s.title}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28, paddingTop: 10, borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: 10, color: '#94a3b8' }}>
        AmmoniSense Inspection Report &bull; MENRO Manolo Fortich &bull; Schedule #{schedule.id} &bull; Printed {today}
      </div>
    </div>
  );
};

export default ReportSignatures;
