import React from 'react';
import { ReportViolation } from '../../types/inspectionReport';
import { getViolationCategoryLabel } from '../../constants/violationCategories';

interface ReportViolationsTableProps {
  violations: ReportViolation[];
}

export const ReportViolationsTable: React.FC<ReportViolationsTableProps> = ({ violations }) => {
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
        Violations Summary ({violations.length})
      </div>
      {violations.length === 0 ? (
        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 6, padding: '12px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>
          No violations recorded during this inspection schedule.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden' }}>
          <thead>
            <tr>
              <th style={thStyle}>Tag</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Notes</th>
              <th style={{ ...thStyle, width: 60, textAlign: 'center' }}>Photo</th>
            </tr>
          </thead>
          <tbody>
            {violations.map((v, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td style={tdStyle}><strong>{v.tag_name}</strong></td>
                <td style={tdStyle}>
                  <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: 4, fontWeight: 600, fontSize: 10 }}>
                    {getViolationCategoryLabel(v.violation_category)}
                  </span>
                </td>
                <td style={tdStyle}>
                  {v.latitude && v.longitude ? `${v.latitude.toFixed(4)}, ${v.longitude.toFixed(4)}` : 'N/A'}
                </td>
                <td style={tdStyle}>{v.notes || '—'}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  {v.photo_thumbnail_url ? (
                    <img src={v.photo_thumbnail_url} alt="Violation" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #cbd5e1' }} />
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ReportViolationsTable;
