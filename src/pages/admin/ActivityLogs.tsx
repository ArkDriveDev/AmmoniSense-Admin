import { useState, useEffect, useCallback } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonBadge,
  IonCard,
  IonCardContent
} from '@ionic/react';
import {
  refreshOutline,
  chevronBackOutline,
  chevronForwardOutline,
  eyeOutline,
  documentTextOutline
} from 'ionicons/icons';
import { supabase } from '../../services/supabase';
import { ActivityLog } from '../../types/schema';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const PAGE_SIZE = 50;

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLogs = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const from = targetPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await supabase
        .from('activity_logs')
        .select('*, profiles(id, full_name, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching activity logs:', error);
      } else {
        setLogs(data || []);
        setTotalCount(count || 0);
      }
    } catch (err) {
      console.error('Unexpected error fetching activity logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchLogs(page);
  }, [page, fetchLogs]);

  // Realtime subscription for newest logs
  useEffect(() => {
    const channel = supabase
      .channel('admin_activity_logs_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        () => {
          // If viewing page 0, auto-refresh to show newest log at the top
          if (page === 0) {
            fetchLogs(0);
          } else {
            // Update total count
            setTotalCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [page, fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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
          padding: '3px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.5px',
          backgroundColor: bg,
          color: color,
          border: `1px solid ${border}`
        }}
      >
        {act}
      </span>
    );
  };

  const getUserDisplay = (log: ActivityLog) => {
    if (log.profiles?.full_name) {
      return log.profiles.full_name;
    }
    if (log.profiles?.email) {
      return log.profiles.email;
    }
    if (log.profile_id) {
      return `${log.profile_id.substring(0, 8)}...`;
    }
    return 'System';
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontWeight: 'bold' }}>SYSTEM & ACTIVITY LOGS</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => fetchLogs(page)} style={{ color: '#ffffff' }}>
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f8fafc' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Main Card */}
          <IonCard className="premium-card" style={{ margin: 0, overflow: 'hidden' }}>
            <IonCardContent style={{ padding: 0 }}>
              {loading && logs.length === 0 ? (
                <div style={{ padding: '60px 16px' }}>
                  <LoadingSpinner message="LOADING ACTIVITY LOGS..." />
                </div>
              ) : logs.length === 0 ? (
                <div style={{ padding: '40px 16px' }}>
                  <EmptyState
                    icon={documentTextOutline}
                    title="NO ACTIVITY LOGS FOUND"
                    message="There are no system logs matching the current view."
                  />
                </div>
              ) : (
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '13px',
                      textAlign: 'left'
                    }}
                  >
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 700, color: '#334155', minWidth: '170px' }}>
                          CREATED AT
                        </th>
                        <th style={{ padding: '12px 16px', fontWeight: 700, color: '#334155', minWidth: '100px' }}>
                          ACTION
                        </th>
                        <th style={{ padding: '12px 16px', fontWeight: 700, color: '#334155', minWidth: '150px' }}>
                          ENTITY TYPE
                        </th>
                        <th style={{ padding: '12px 16px', fontWeight: 700, color: '#334155', minWidth: '150px' }}>
                          ENTITY ID
                        </th>
                        <th style={{ padding: '12px 16px', fontWeight: 700, color: '#334155', minWidth: '180px' }}>
                          USER
                        </th>
                        <th style={{ padding: '12px 16px', fontWeight: 700, color: '#334155', minWidth: '100px', textAlign: 'center' }}>
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, index) => {
                        const isEven = index % 2 === 0;
                        return (
                          <tr
                            key={log.id}
                            style={{
                              backgroundColor: isEven ? '#ffffff' : '#f8fafc',
                              borderBottom: '1px solid #e2e8f0',
                              transition: 'background-color 0.15s ease'
                            }}
                          >
                            <td style={{ padding: '12px 16px', color: '#1e293b', whiteSpace: 'nowrap' }}>
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              {getActionBadge(log.action)}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 600 }}>
                              {log.entity_type}
                            </td>
                            <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>
                              <span title={log.entity_id} style={{ display: 'inline-block', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                {log.entity_id}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: '#334155' }}>
                              {getUserDisplay(log)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <IonButton
                                size="small"
                                fill="outline"
                                style={{
                                  '--border-color': '#1a365d',
                                  '--color': '#1a365d',
                                  fontWeight: 600,
                                  fontSize: '12px',
                                  height: '28px'
                                }}
                              >
                                <IonIcon icon={eyeOutline} slot="start" />
                                View
                              </IonButton>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderTop: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                  Showing {logs.length > 0 ? page * PAGE_SIZE + 1 : 0} to{' '}
                  {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} entries
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonButton
                    size="small"
                    fill="outline"
                    disabled={page === 0 || loading}
                    onClick={() => setPage(prev => Math.max(0, prev - 1))}
                    style={{ '--border-radius': '6px', fontSize: '12px' }}
                  >
                    <IonIcon icon={chevronBackOutline} slot="start" />
                    Previous
                  </IonButton>

                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155', padding: '0 4px' }}>
                    Page {page + 1} of {totalPages}
                  </span>

                  <IonButton
                    size="small"
                    fill="outline"
                    disabled={page >= totalPages - 1 || loading}
                    onClick={() => setPage(prev => prev + 1)}
                    style={{ '--border-radius': '6px', fontSize: '12px' }}
                  >
                    Next
                    <IonIcon icon={chevronForwardOutline} slot="end" />
                  </IonButton>
                </div>
              </div>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
}
