import React from 'react';
import { InspectionTagDetails } from '../../types/schema';
import TagCard from './TagCard';

interface TagTableProps {
  tags: InspectionTagDetails[];
  activeFiltersText: string;
  onSelectTag?: (tag: InspectionTagDetails) => void;
}

export const TagTable: React.FC<TagTableProps> = ({
  tags,
  activeFiltersText,
  onSelectTag
}) => {
  const generatedTimestamp = new Date().toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div>
      {/* ====================================================================
          1. SCREEN VIEW: Structured List of Cards (NOT gallery)
          ==================================================================== */}
      <div className="tag-cards-container screen-only">
        {tags.map((tag) => (
          <TagCard
            key={tag.tag_id}
            tag={tag}
            onClick={onSelectTag}
          />
        ))}
      </div>

      {/* ====================================================================
          2. PRINT VIEW: Dedicated Clean Printable Report Table
             Automatically shown during window.print(), hidden on screen
          ==================================================================== */}
      <div className="ammonisense-print-report" id="inspection-tag-print-report">
        {/* Report Header */}
        <div className="print-header">
          <div className="print-title">AmmoniSense — Inspection Tag Report</div>
          <div className="print-meta-row">
            <div className="print-filter-info">
              <span><b>Filter / Search:</b> {activeFiltersText || 'All Records (No Filters)'}</span>
            </div>
            <div className="print-timestamp">
              <span><b>Generated:</b> {generatedTimestamp}</span>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '28px', textAlign: 'center' }}>#</th>
              <th style={{ minWidth: '85px' }}>Tag Name</th>
              <th style={{ minWidth: '95px' }}>Site</th>
              <th style={{ minWidth: '95px' }}>Schedule</th>
              <th style={{ minWidth: '60px', textAlign: 'right' }}>Ammonia (PPM)</th>
              <th style={{ minWidth: '45px', textAlign: 'right' }}>Temp (°C)</th>
              <th style={{ minWidth: '45px', textAlign: 'right' }}>Hum (%)</th>
              <th style={{ minWidth: '45px', textAlign: 'right' }}>Bat (%)</th>
              <th style={{ minWidth: '70px' }}>Device</th>
              <th style={{ minWidth: '65px', textAlign: 'center' }}>Status</th>
              <th style={{ minWidth: '85px' }}>Date/Time</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {tags.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                  No inspection tags matching the specified criteria.
                </td>
              </tr>
            ) : (
              tags.map((tag, idx) => {
                const ammoniaVal = tag.ammonia !== null && tag.ammonia !== undefined ? Number(tag.ammonia) : null;
                const tempVal = tag.temperature !== null && tag.temperature !== undefined ? Number(tag.temperature) : null;
                const humVal = tag.humidity !== null && tag.humidity !== undefined ? Number(tag.humidity) : null;
                const batVal = tag.battery !== null && tag.battery !== undefined ? Number(tag.battery) : null;

                const dateStr = tag.created_at
                  ? new Date(tag.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) + ' ' + new Date(tag.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--';

                return (
                  <tr key={tag.tag_id || idx}>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{tag.tag_name}</td>
                    <td>
                      {tag.site_name || 'Unassigned'}
                      {tag.site_code ? ` (${tag.site_code})` : ''}
                    </td>
                    <td>
                      {tag.schedule_name || 'N/A'}
                      {tag.scheduled_date ? ` [${new Date(tag.scheduled_date).toLocaleDateString()}]` : ''}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {ammoniaVal !== null ? ammoniaVal.toFixed(2) : '--'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {tempVal !== null ? tempVal.toFixed(1) : '--'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {humVal !== null ? `${humVal.toFixed(0)}%` : '--'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {batVal !== null ? `${batVal.toFixed(0)}%` : '--'}
                    </td>
                    <td>{tag.device_name || tag.device_uid || '--'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="print-badge">
                        {tag.status || 'NORMAL'}
                      </span>
                    </td>
                    <td>{dateStr}</td>
                    <td>{tag.notes || '-'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Report Footer */}
        <div className="print-footer">
          <div>
            <b>AmmoniSense Environmental Monitoring System</b> — Municipal Environment and Natural Resources Office (MENRO)
          </div>
          <div>
            <b>Total Records:</b> {tags.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TagTable;
