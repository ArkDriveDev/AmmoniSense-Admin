import React, { useRef, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  IonButton,
  IonIcon,
  IonBadge,
  IonSpinner,
} from '@ionic/react';
import {
  businessOutline,
  pricetagOutline,
  timeOutline,
  speedometerOutline,
  warningOutline,
  arrowBackOutline,
  refreshOutline,
  closeOutline,
  printOutline,
  documentTextOutline,
} from 'ionicons/icons';
import { useTagSession } from '../../hooks/useTagSession';
import { getPoultryTypeLabel, getChickenTypeLabel, getSiteTypeLabel } from '../../constants/siteConstants';
import SessionCharts from '../../components/session/SessionCharts';
import SessionReadingsTable from '../../components/session/SessionReadingsTable';
import { exportReportToPdf } from '../../utils/reportPdf';

interface SessionDetailProps {
  tagId?: number | null;
  sessionId?: string | null;
  onClose?: () => void;
}

export const SessionDetail: React.FC<SessionDetailProps> = ({
  tagId: propTagId,
  sessionId: propSessionId,
  onClose,
}) => {
  const history = useHistory();
  const routeParams = useParams<{ tagId?: string }>();
  const effectiveTagId = propTagId ?? (routeParams.tagId ? parseInt(routeParams.tagId, 10) : null);
  const effectiveSessionId = propSessionId ?? null;

  const { data, loading, error, refresh } = useTagSession({
    inspectionTagId: effectiveTagId,
    sessionId: effectiveSessionId,
  });

  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = () => {
    if (!reportRef.current || !data) return;
    const tagPart = (data.tag?.tag_name || `Tag-${effectiveTagId || 'Capture'}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const sitePart = (data.site?.site_code || 'SITE').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `AmmoniSense-SessionReport-${tagPart}-${sitePart}.pdf`;
    exportReportToPdf(reportRef.current, fileName, () => setExporting(true), () => setExporting(false));
  };

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      history.goBack();
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '360px', padding: '30px' }}>
        <IonSpinner name="crescent" style={{ width: '40px', height: '40px', color: '#1a365d' }} />
        <p style={{ marginTop: '14px', fontSize: '13px', color: '#64748b' }}>Loading 5-minute session captures...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', maxWidth: '500px', margin: '0 auto' }}>
        <IonIcon icon={warningOutline} style={{ fontSize: '48px', color: '#dc2626' }} />
        <h3 style={{ color: '#0f172a', fontWeight: 700, margin: '10px 0' }}>Unable to load session</h3>
        <p style={{ color: '#64748b', fontSize: '13px' }}>{error || 'No telemetry session found for this inspection tag.'}</p>
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <IonButton fill="outline" color="medium" onClick={handleBack}>
            Back
          </IonButton>
          <IonButton fill="solid" color="primary" onClick={() => refresh()}>
            Retry
          </IonButton>
        </div>
      </div>
    );
  }

  const { tag, site, readings, metrics, sessionId } = data;

  const siteName = site?.site_name || (tag as unknown as { site_name?: string })?.site_name || 'Unassigned Site';
  const siteCode = site?.site_code || (tag as unknown as { site_code?: string })?.site_code || 'N/A';
  const siteType = site?.site_type || (tag as unknown as { site_type?: string })?.site_type || 'POULTRY';
  const poultryType = site?.poultry_type || (tag as unknown as { poultry_type?: string })?.poultry_type || null;
  const chickenType = site?.chicken_type || (tag as unknown as { chicken_type?: string })?.chicken_type || null;
  const tagName = tag?.tag_name || (effectiveTagId ? `Tag #${effectiveTagId}` : 'Inspection Tag');

  const startFormatted = metrics.startTime
    ? new Date(metrics.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';
  const endFormatted = metrics.endTime
    ? new Date(metrics.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';
  const startDateStr = metrics.startTime
    ? new Date(metrics.startTime).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';

  return (
    <div style={{ background: '#f8fafc', minHeight: '100%', padding: '16px 20px' }}>
      {/* Top Nav / Actions Bar */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IonButton fill="clear" color="dark" onClick={handleBack} style={{ margin: 0 }}>
            <IonIcon icon={onClose ? closeOutline : arrowBackOutline} slot="icon-only" />
          </IonButton>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1a365d' }}>
            5-Minute Capture Session
          </h2>
          {sessionId && (
            <IonBadge color="medium" style={{ fontSize: '11px', textTransform: 'none' }}>
              ID: {sessionId.substring(0, 16)}...
            </IonBadge>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <IonButton fill="outline" color="dark" size="small" onClick={() => window.print()}>
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
            {exporting ? 'Generating Report...' : 'Generate Session Report'}
          </IonButton>
          <IonButton fill="outline" color="medium" size="small" onClick={() => refresh()}>
            <IonIcon icon={refreshOutline} slot="icon-only" />
          </IonButton>
        </div>
      </div>

      <div
        ref={reportRef}
        style={{
          maxWidth: '960px',
          margin: '0 auto',
          background: '#ffffff',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Printable Official Header */}
        <div
          style={{
            borderBottom: '2px solid #1a365d',
            paddingBottom: '14px',
            marginBottom: '18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: '#1a365d', textTransform: 'uppercase' }}>
              Municipal Environment and Natural Resources Office &bull; MENRO Manolo Fortich
            </div>
            <h2 style={{ margin: '4px 0 2px 0', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              AmmoniSense 5-Minute Session Capture Report
            </h2>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Official High-Frequency Air Quality &amp; Ammonia (NH₃) Field Telemetry Assessment
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#475569' }}>
            <div><strong>Tag:</strong> {tagName}</div>
            <div><strong>Site:</strong> {siteName} ({siteCode})</div>
            <div><strong>Generated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
        </div>
        {/* Tag and Site Header Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  color: '#64748b',
                }}
              >
                Telemetry Session Inspection Record
              </span>
              <h1 style={{ margin: '4px 0 8px 0', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                <IonIcon icon={pricetagOutline} style={{ verticalAlign: 'middle', marginRight: '6px', color: '#0284c7' }} />
                {tagName}
              </h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '13px',
                    color: '#1e293b',
                    backgroundColor: '#f1f5f9',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                >
                  <IonIcon icon={businessOutline} style={{ color: '#059669' }} />
                  {siteName} ({siteCode})
                </span>

                <IonBadge color="secondary" style={{ fontSize: '11px' }}>
                  {getSiteTypeLabel(siteType)}
                </IonBadge>

                {poultryType && (
                  <IonBadge color="tertiary" style={{ fontSize: '11px' }}>
                    Poultry: {getPoultryTypeLabel(poultryType)}
                  </IonBadge>
                )}

                {chickenType && (
                  <IonBadge color="dark" style={{ fontSize: '11px' }}>
                    Chicken: {getChickenTypeLabel(chickenType)}
                  </IonBadge>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                <IonIcon icon={timeOutline} />
                {startDateStr}
              </span>
              <div style={{ fontSize: '12px', color: '#334155', fontWeight: 600, marginTop: '2px' }}>
                {startFormatted} – {endFormatted}
              </div>
            </div>
          </div>
        </div>

        {/* Session Summary Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          {/* Total Readings */}
          <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Readings</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
              {metrics.count} / 60
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Duration: <b>{metrics.durationFormatted}</b> (~5 min)
            </span>
          </div>

          {/* Average Ammonia */}
          <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Avg Ammonia (NH₃)</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: metrics.avgPpm >= 25 ? '#dc2626' : metrics.avgPpm >= 5 ? '#d97706' : '#15803d', marginTop: '4px' }}>
              {metrics.avgPpm.toFixed(2)} <span style={{ fontSize: '14px' }}>ppm</span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Min: <b>{metrics.minPpm}</b> &bull; Max: <b>{metrics.maxPpm}</b> ppm
            </span>
          </div>

          {/* Min / Max Range */}
          <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Max Peak NH₃</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: metrics.maxPpm >= 25 ? '#dc2626' : '#1e293b', marginTop: '4px' }}>
              {metrics.maxPpm.toFixed(2)} <span style={{ fontSize: '14px' }}>ppm</span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Safe count: <b>{metrics.safeCount}</b> &bull; Warn: <b>{metrics.warningCount}</b>
            </span>
          </div>

          {/* Critical Count */}
          <div
            style={{
              background: metrics.criticalCount > 0 ? '#fef2f2' : '#ffffff',
              borderRadius: '10px',
              border: `1px solid ${metrics.criticalCount > 0 ? '#fca5a5' : '#e2e8f0'}`,
              padding: '14px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: metrics.criticalCount > 0 ? '#991b1b' : '#64748b', textTransform: 'uppercase' }}>
              Critical Readings (&ge;25 ppm)
            </span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: metrics.criticalCount > 0 ? '#dc2626' : '#15803d', marginTop: '4px' }}>
              {metrics.criticalCount}
            </div>
            <span style={{ fontSize: '11px', color: metrics.criticalCount > 0 ? '#b91c1c' : '#15803d', fontWeight: 600 }}>
              {metrics.criticalCount > 0 ? 'Exceeds threshold limits' : 'Within normal limits'}
            </span>
          </div>
        </div>

        {/* Charts Section */}
        <SessionCharts readings={readings} />

        {/* Full Readings Table */}
        <SessionReadingsTable readings={readings} />
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

export default SessionDetail;
