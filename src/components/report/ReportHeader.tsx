import React from 'react';
import { ReportSchedule } from '../../types/inspectionReport';

interface ReportHeaderProps {
  schedule: ReportSchedule;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({ schedule }) => {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const statusColor =
    schedule.status === 'COMPLETED'
      ? '#16a34a'
      : schedule.status === 'IN PROGRESS'
      ? '#ca8a04'
      : '#2563eb';

  return (
    <div style={{ borderBottom: '2px solid #1a365d', paddingBottom: 16, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#1a365d', textTransform: 'uppercase' }}>
            Municipal Environment and Natural Resources Office &bull; MENRO Manolo Fortich
          </div>
          <h1 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
            AmmoniSense Inspection Report
          </h1>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
            Official Air Quality &amp; Ammonia (NH₃) Field Assessment
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
            backgroundColor: statusColor,
            borderRadius: 4,
            padding: '2px 8px',
            marginBottom: 4,
          }}>
            {schedule.status ?? 'SCHEDULED'}
          </span>
          <div style={{ fontSize: 11, color: '#475569' }}>
            <strong>Report ID:</strong> SCH-{schedule.id}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            Generated: {today}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportHeader;
