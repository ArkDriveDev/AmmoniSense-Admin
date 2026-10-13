import React from 'react';
import { ReportReading } from '../../types/inspectionReport';
import { getNH3BadgeStyle } from '../../utils/reportUtils';

interface ReportReadingsTableProps {
  readings: ReportReading[];
}

export const ReportReadingsTable: React.FC<ReportReadingsTableProps> = ({ readings }) => {
  const thStyle: React.CSSProperties = {
    padding: '8px 10px',
    background: '#1a365d',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 700,
    textAlign: 'left',
  };

  const tdStyle: React.CSSProperties = {
    padding: '8px 10px',
    fontSize: 11,
    borderBottom: '1px solid #e2e8f0',
    color: '#334155',
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a365d', textTransform: 'uppercase', marginBottom: 8 }}>
        Ammonia (NH₃) Readings ({readings.length})
      </div>
      {readings.length === 0 ? (
        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 6, padding: '12px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>
          No sensor readings found for this schedule.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden' }}>
          <thead>
            <tr>
              <th style={thStyle}>Tag</th>
              <th style={thStyle}>Reading (ppm)</th>
              <th style={thStyle}>Air Quality Status</th>
              <th style={thStyle}>Recorded At</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((r, i) => {
              const badge = getNH3BadgeStyle(r.nh3Status);
              const formattedTime = r.reading_at ? new Date(r.reading_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={tdStyle}><strong>{r.tag_name}</strong></td>
                  <td style={tdStyle}>
                    <strong style={{ color: r.nh3Status === 'CRITICAL' ? '#dc2626' : '#0f172a' }}>
                      {r.ammonia !== null ? `${r.ammonia.toFixed(2)} ppm` : 'N/A'}
                    </strong>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, padding: '2px 6px', borderRadius: 4, fontWeight: 700, fontSize: 10 }}>
                      {r.nh3Status}
                    </span>
                  </td>
                  <td style={tdStyle}>{formattedTime}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ReportReadingsTable;
