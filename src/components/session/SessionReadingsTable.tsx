import React from 'react';
import { SensorData } from '../../types/schema';
import { getAmmoniaLevelStatus, getAmmoniaLevelBadgeStyle } from '../../constants/thresholds';

interface SessionReadingsTableProps {
  readings: SensorData[];
}

export const SessionReadingsTable: React.FC<SessionReadingsTableProps> = ({ readings }) => {
  if (!readings || readings.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        No readings recorded in this session.
      </div>
    );
  }

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '2px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  };

  const tdStyle: React.CSSProperties = {
    padding: '9px 12px',
    fontSize: '12px',
    color: '#1e293b',
    borderBottom: '1px solid #f1f5f9',
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1a365d' }}>
            Telemetry Readings Log ({readings.length} captures)
          </h4>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Sequential 5-second interval captures over 5-minute session
          </span>
        </div>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th style={thStyle}>No.</th>
              <th style={thStyle}>Time</th>
              <th style={thStyle}>NH₃ (ppm)</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Temp (°C)</th>
              <th style={thStyle}>Humidity (%)</th>
              <th style={thStyle}>Battery (%)</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((r, index) => {
              const ppm = r.ammonia !== null && r.ammonia !== undefined ? Number(r.ammonia) : null;
              const status = getAmmoniaLevelStatus(ppm);
              const badge = getAmmoniaLevelBadgeStyle(status);

              const formattedTime = r.created_at
                ? new Date(r.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : '—';

              return (
                <tr
                  key={r.id || index}
                  style={{
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#fcfcfd',
                  }}
                >
                  <td style={{ ...tdStyle, fontWeight: 700, color: '#64748b' }}>#{index + 1}</td>
                  <td style={tdStyle}>{formattedTime}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: badge.color }}>
                    {ppm !== null ? `${ppm.toFixed(2)}` : '—'}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: badge.dotColor,
                        }}
                      />
                      {badge.label}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {r.temperature !== null && r.temperature !== undefined
                      ? `${Number(r.temperature).toFixed(1)}°C`
                      : '—'}
                  </td>
                  <td style={tdStyle}>
                    {r.humidity !== null && r.humidity !== undefined
                      ? `${Number(r.humidity).toFixed(0)}%`
                      : '—'}
                  </td>
                  <td style={tdStyle}>
                    {r.battery !== null && r.battery !== undefined
                      ? `${Number(r.battery).toFixed(0)}%`
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SessionReadingsTable;
