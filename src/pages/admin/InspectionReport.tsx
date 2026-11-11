import React, { useRef, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  IonPage,
  IonContent,
  IonSpinner,
  IonButton,
  IonIcon,
} from '@ionic/react';
import {
  arrowBackOutline,
  printOutline,
  documentTextOutline,
} from 'ionicons/icons';
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
    return (
      <IonPage>
        <IonContent className="ion-padding" style={{ '--background': '#f1f5f9' }} scrollY={true}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#64748b' }}>
            <IonSpinner name="crescent" style={{ width: 40, height: 40, color: '#1a365d', marginBottom: 14 }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Loading inspection report...</div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (error || !data) {
    return (
      <IonPage>
        <IonContent className="ion-padding" style={{ '--background': '#f1f5f9' }} scrollY={true}>
          <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>
            <p style={{ fontWeight: 600, fontSize: 16 }}>{error || 'Report not found'}</p>
            <IonButton
              fill="outline"
              color="dark"
              onClick={() => history.push('/inspection-schedules')}
              style={{ marginTop: 12, fontWeight: 600 }}
            >
              <IonIcon icon={arrowBackOutline} slot="start" />
              Back to Schedules
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const { schedule, site, violations, readings, stats, inspectorName, adminName } = data;

  return (
    <IonPage>
      <IonContent
        className="ion-padding"
        style={{
          '--background': '#f1f5f9',
        }}
        scrollY={true}
      >
        <div style={{ maxWidth: 880, margin: '0 auto', paddingBottom: 40 }}>
          {/* Action Toolbar */}
          <div
            className="no-print"
            style={{
              margin: '0 0 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <IonButton
              fill="outline"
              color="dark"
              size="small"
              onClick={() => history.push('/inspection-schedules')}
              style={{ fontWeight: 600 }}
            >
              <IonIcon icon={arrowBackOutline} slot="start" />
              Back to Schedules
            </IonButton>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <IonButton
                fill="outline"
                color="dark"
                size="small"
                onClick={() => window.print()}
                style={{ fontWeight: 600 }}
              >
                <IonIcon icon={printOutline} slot="start" />
                Print
              </IonButton>
              <IonButton
                fill="solid"
                style={{ '--background': '#1a365d', fontWeight: 700 }}
                size="small"
                onClick={handleExportPdf}
                disabled={exporting}
              >
                <IonIcon icon={documentTextOutline} slot="start" />
                {exporting ? 'Exporting PDF...' : 'Export PDF'}
              </IonButton>
            </div>
          </div>

          {/* Printable Report Page */}
          <div
            ref={reportRef}
            style={{
              background: '#ffffff',
              padding: '36px 32px',
              borderRadius: 8,
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0',
              overflowX: 'auto',
            }}
          >
            <ReportHeader schedule={schedule} />
            <ReportDetails schedule={schedule} site={site} inspectorName={inspectorName} />
            <ReportSummaryCards stats={stats} />
            <ReportViolationsTable violations={violations} />
            <ReportReadingsTable readings={readings} />
            <ReportCharts violations={violations} readings={readings} />
            <ReportSignatures schedule={schedule} site={site} stats={stats} inspectorName={inspectorName} adminName={adminName} />
          </div>
        </div>

        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { background: #ffffff !important; }
          }
        `}</style>
      </IonContent>
    </IonPage>
  );
};

export default InspectionReport;
