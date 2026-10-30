import React from 'react';
import { ReportSchedule, ReportSite } from '../../types/inspectionReport';

interface ReportDetailsProps {
  schedule: ReportSchedule;
  site: ReportSite;
  inspectorName: string;
}

export const ReportDetails: React.FC<ReportDetailsProps> = ({ schedule, site, inspectorName }) => {
  const boxStyle: React.CSSProperties = {
    flex: 1,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '12px 16px',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    marginBottom: 6,
    color: '#334155',
  };

  const scheduledDateFormatted = new Date(schedule.scheduled_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
      <div style={boxStyle}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1a365d', borderBottom: '1px solid #cbd5e1', paddingBottom: 6, marginBottom: 8, textTransform: 'uppercase' }}>
          Site Details
        </div>
        <div style={rowStyle}><span>Site Name:</span><strong>{site.site_name}</strong></div>
        <div style={rowStyle}><span>Site Code:</span><code>{site.site_code}</code></div>
        <div style={rowStyle}><span>Site Type:</span><span>{site.site_type ?? 'N/A'}</span></div>
        <div style={rowStyle}><span>Address:</span><span>{site.address ?? 'N/A'}</span></div>
      </div>

      <div style={boxStyle}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1a365d', borderBottom: '1px solid #cbd5e1', paddingBottom: 6, marginBottom: 8, textTransform: 'uppercase' }}>
          Schedule Details
        </div>
        <div style={rowStyle}><span>Schedule:</span><strong>{schedule.schedule_name}</strong></div>
        <div style={rowStyle}><span>Inspection Date:</span><span>{scheduledDateFormatted}</span></div>
        <div style={rowStyle}><span>Inspection Time:</span><span>{schedule.scheduled_time ?? 'N/A'}</span></div>
        <div style={rowStyle}><span>Conducted By:</span><strong>{inspectorName}</strong></div>
        <div style={rowStyle}>
          <span>Confirmation:</span>
          {schedule.confirmed ? (
            <span style={{ color: '#16a34a', fontWeight: 700, backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>
              Confirmed
            </span>
          ) : (
            <span style={{ color: '#64748b', fontWeight: 600, backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>
              Not Confirmed
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportDetails;
