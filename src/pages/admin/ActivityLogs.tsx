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
  IonCardContent,
  IonSearchbar,
  IonSelect,
  IonSelectOption
} from '@ionic/react';
import {
  refreshOutline,
  chevronBackOutline,
  chevronForwardOutline,
  eyeOutline,
  documentTextOutline,
  filterOutline,
  closeCircleOutline
} from 'ionicons/icons';
import { supabase } from '../../services/supabase';
import { ActivityLog } from '../../types/schema';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { SearchAndSortBar } from '../../components/SearchAndSortBar';
import ActivityLogDetailModal from '../../components/admin/ActivityLogDetailModal';

const PAGE_SIZE = 50;

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Filter options & selections
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [usersList, setUsersList] = useState<{ id: string; name: string }[]>([]);
  const [selectedEntityType, setSelectedEntityType] = useState<string>('ALL');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<string>('ALL');

  // Detail Modal state
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  // Load distinct filter options on mount
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const { data: entityData } = await supabase
          .from('activity_logs')
          .select('entity_type')
          .limit(1000);

        if (entityData) {
          const types = Array.from(new Set(entityData.map((d: any) => d.entity_type).filter(Boolean))).sort();
          setEntityTypes(types as string[]);
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .order('full_name');

        if (profileData) {
          setUsersList(
            profileData.map((p: any) => ({
              id: p.id,
              name: p.full_name || p.email || p.id
            }))
          );
        }
      } catch (err) {
        console.error('Error loading filter options:', err);
      }
    };

    loadFilterOptions();
  }, []);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page to 0 when search or filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, selectedEntityType, selectedAction, selectedUser, sortOrder]);

  const fetchLogs = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const from = targetPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('activity_logs')
        .select('*, profiles(id, full_name, email)', { count: 'exact' });

      // Apply search across entity_type, entity_id, action, profile full_name & email
      if (debouncedSearch) {
        const { data: matchingProfiles } = await supabase
          .from('profiles')
          .select('id')
          .or(`full_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);

        const orClauses = [
          `entity_type.ilike.%${debouncedSearch}%`,
          `entity_id.ilike.%${debouncedSearch}%`,
          `action.ilike.%${debouncedSearch}%`
        ];

        if (matchingProfiles && matchingProfiles.length > 0) {
          const profileIds = matchingProfiles.map(p => p.id).join(',');
          orClauses.push(`profile_id.in.(${profileIds})`);
        }

        query = query.or(orClauses.join(','));
      }

      // Apply entity filter
      if (selectedEntityType && selectedEntityType !== 'ALL') {
        query = query.eq('entity_type', selectedEntityType);
      }

      // Apply action filter
      if (selectedAction && selectedAction !== 'ALL') {
        query = query.eq('action', selectedAction);
      }

      // Apply user filter
      if (selectedUser && selectedUser !== 'ALL') {
        if (selectedUser === 'SYSTEM') {
          query = query.is('profile_id', null);
        } else {
          query = query.eq('profile_id', selectedUser);
        }
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: sortOrder === 'asc' })
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
  }, [page, debouncedSearch, selectedEntityType, selectedAction, selectedUser]);

  useEffect(() => {
    fetchLogs(page);
  }, [page, debouncedSearch, selectedEntityType, selectedAction, selectedUser, fetchLogs]);

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

        <SearchAndSortBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Search logs..."
          sortBy={sortOrder}
          onSortChange={(val) => setSortOrder(val as 'desc' | 'asc')}
          sortOptions={[
            { value: 'desc', label: 'Newest' },
            { value: 'asc', label: 'Oldest' }
          ]}
          sortPlaceholder="Order"
        >
          <div className="sort-control-wrapper">
            <IonSelect
              value={selectedEntityType}
              onIonChange={(e: CustomEvent) => setSelectedEntityType(e.detail.value || 'ALL')}
              interface="popover"
              className="sort-select-chip"
            >
              <IonSelectOption value="ALL">All Entities</IonSelectOption>
              {entityTypes.map(t => (
                <IonSelectOption key={t} value={t}>{t}</IonSelectOption>
              ))}
            </IonSelect>
          </div>

          <div className="sort-control-wrapper">
            <IonSelect
              value={selectedAction}
              onIonChange={(e: CustomEvent) => setSelectedAction(e.detail.value || 'ALL')}
              interface="popover"
              className="sort-select-chip"
            >
              <IonSelectOption value="ALL">All Actions</IonSelectOption>
              <IonSelectOption value="INSERT">INSERT</IonSelectOption>
              <IonSelectOption value="UPDATE">UPDATE</IonSelectOption>
              <IonSelectOption value="DELETE">DELETE</IonSelectOption>
              <IonSelectOption value="LOGIN">LOGIN</IonSelectOption>
              <IonSelectOption value="LOGOUT">LOGOUT</IonSelectOption>
            </IonSelect>
          </div>

          <div className="sort-control-wrapper">
            <IonSelect
              value={selectedUser}
              onIonChange={(e: CustomEvent) => setSelectedUser(e.detail.value || 'ALL')}
              interface="popover"
              className="sort-select-chip"
            >
              <IonSelectOption value="ALL">All Users</IonSelectOption>
              <IonSelectOption value="SYSTEM">System</IonSelectOption>
              {usersList.map(u => (
                <IonSelectOption key={u.id} value={u.id}>{u.name}</IonSelectOption>
              ))}
            </IonSelect>
          </div>
        </SearchAndSortBar>
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
                                onClick={() => setSelectedLog(log)}
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

        {/* Detail Modal */}
        <ActivityLogDetailModal
          isOpen={!!selectedLog}
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      </IonContent>
    </IonPage>
  );
}
