import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
  IonBadge
} from '@ionic/react';
import {
  closeOutline,
  copyOutline,
  checkmarkOutline
} from 'ionicons/icons';
import { ActivityLog } from '../../types/schema';

interface ActivityLogDetailModalProps {
  isOpen: boolean;
  log: ActivityLog | null;
  onClose: () => void;
}

export default function ActivityLogDetailModal({
  isOpen,
  log,
  onClose
}: ActivityLogDetailModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Ensure Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!log) return null;

  const handleCopy = async (field: string, data: any) => {
    try {
      const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const getActionBadge = (action: string) => {
    const act = (action || '').toUpperCase();
    let bg = '#e2e8f0';
    let color = '#475569';
    let border = '#cbd5e1';

    if (act === 'INSERT' || act === 'CREATE') {
      bg = '#dcfce7';
      color = '#15803d';
      border = '#86efac';
    } else if (act === 'UPDATE' || act === 'EDIT') {
      bg = '#fef3c7';
      color = '#b45309';
      border = '#fcd34d';
    } else if (act === 'DELETE' || act === 'REMOVE') {
      bg = '#fee2e2';
      color = '#b91c1c';
      border = '#fca5a5';
    } else if (act === 'LOGIN') {
      bg = '#e0f2fe';
      color = '#0369a1';
      border = '#7dd3fc';
    } else if (act === 'LOGOUT') {
      bg = '#f1f5f9';
      color = '#64748b';
      border = '#cbd5e1';
    }

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 700,
          backgroundColor: bg,
          color: color,
          border: `1px solid ${border}`
        }}
      >
        {act}
      </span>
    );
  };

  const getUserDisplay = () => {
    if (log.profiles?.full_name) {
      return `${log.profiles.full_name} (${log.profiles.email || 'No email'})`;
    }
    if (log.profiles?.email) {
      return log.profiles.email;
    }
    if (log.profile_id) {
      return `Profile ID: ${log.profile_id}`;
    }
    return 'System';
  };

  const renderJsonField = (title: string, fieldKey: string, data: any) => {
    const hasData = data !== null && data !== undefined;
    const formatted = hasData ? JSON.stringify(data, null, 2) : 'null';

    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
            {title}
          </h4>
          {hasData && (
            <IonButton
              size="small"
              fill="outline"
              onClick={() => handleCopy(fieldKey, data)}
              style={{
                '--border-color': copiedField === fieldKey ? '#16a34a' : '#64748b',
                '--color': copiedField === fieldKey ? '#16a34a' : '#475569',
                fontSize: '12px',
                height: '28px'
              }}
            >
              <IonIcon
                icon={copiedField === fieldKey ? checkmarkOutline : copyOutline}
                slot="start"
              />
              {copiedField === fieldKey ? 'Copied!' : 'Copy JSON'}
            </IonButton>
          )}
        </div>

        <pre
          style={{
            margin: 0,
            padding: '12px',
            backgroundColor: '#0f172a',
            color: hasData ? '#f8fafc' : '#94a3b8',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'monospace',
            overflowX: 'auto',
            maxHeight: '300px',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        >
          {formatted}
        </pre>
      </div>
    );
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontWeight: 'bold' }}>LOG DETAIL #{log.id}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose} style={{ color: '#ffffff' }}>
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f8fafc' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Metadata Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              padding: '16px'
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                fontSize: '13px'
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>
                  ACTION
                </span>
                <div style={{ marginTop: '4px' }}>{getActionBadge(log.action)}</div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>
                  TIMESTAMP
                </span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>
                  ENTITY TYPE
                </span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  {log.entity_type}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>
                  ENTITY ID
                </span>
                <span style={{ fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>
                  {log.entity_id}
                </span>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>
                  USER / ACTOR
                </span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  {getUserDisplay()}
                </span>
              </div>
            </div>
          </div>

          {/* Details JSON */}
          {renderJsonField('Details', 'details', log.details)}

          {/* New Data JSON */}
          {renderJsonField('New Data (new_data)', 'new_data', log.new_data)}

          {/* Old Data JSON */}
          {renderJsonField('Old Data (old_data)', 'old_data', log.old_data)}

          {/* Footer Close Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
            <IonButton
              fill="solid"
              onClick={onClose}
              style={{ '--background': '#1a365d', minWidth: '120px' }}
            >
              Close
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
}
