import React, { useRef, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { useInspectionReport } from '../../hooks/useInspectionReport';
import { exportReportToPdf } from '../../utils/reportPdf';
import ReportHeader from '../../components/report/ReportHeader';
import ReportDetails from '../../components/report/ReportDetails';
import ReportSummaryCards from '../../components/report/ReportSummaryCards';
import ReportViolationsTable from '../../components/report/ReportViolationsTable';
import ReportReadingsTable from '../../components/report/ReportReadingsTable';
import ReportCharts from '../../components/report/ReportCharts';
import ReportSignatures from '../../components/report/ReportSignatures';

export const InspectionReport: React.FC = () => {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const history = useHistory();
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const { data, loading, error, refresh } = useInspectionReport(
    scheduleId ? parseInt(scheduleId, 10) : null
  );

  const handleExportPdf = () => {
    if (!reportRef.current || !data) return;
    const fileName = `AmmoniSense-Report-SCH${data.schedule.id}-${data.site.site_code}.pdf`;
    exportReportToPdf(reportRef.current, fileName, () => setExporting(true), () => setExporting(false));
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading inspection report...</div>;
  }

  if (error || !data) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>
        <p>{error || 'Report not found'}</p>
        <button onClick={() => history.push('/admin/schedules')} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
          Back to Schedules
        </button>
      </div>
    );
  }

  const { schedule, site, violations, readings, stats, inspectorName, adminName } = data;

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', padding: '24px 16px' }}>
      {/* Action Toolbar */}
      <div className="no-print" style={{ maxWidth: 840, margin: '0 auto 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => history.push('/admin/schedules')}
          style={{ padding: '8px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#334155' }}
        >
          &larr; Back to Schedules
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => window.print()}
            style={{ padding: '8px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#334155' }}
          >
            &#128438; Print
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            style={{ padding: '8px 16px', background: '#1a365d', color: '#ffffff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
          >
            {exporting ? 'Exporting PDF...' : '&#128196; Export PDF'}
          </button>
        </div>
      </div>

      {/* Printable Report Page */}
      <div
        ref={reportRef}
        style={{ maxWidth: 840, margin: '0 auto', background: '#ffffff', padding: '36px 40px', borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}
      >
        <ReportHeader schedule={schedule} />
        <ReportDetails schedule={schedule} site={site} inspectorName={inspectorName} />
        <ReportSummaryCards stats={stats} />
        <ReportViolationsTable violations={violations} />
        <ReportReadingsTable readings={readings} />
        <ReportCharts violations={violations} readings={readings} />
        <ReportSignatures schedule={schedule} site={site} stats={stats} inspectorName={inspectorName} adminName={adminName} />
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #ffffff !important; }
        }
      `}</style>
    </div>
  );
};

export default InspectionReport;
