import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonBadge,
  IonIcon,
  IonSearchbar,
  IonButton,
  IonButtons,
  IonSelect,
  IonSelectOption,
  IonToast,
  IonSpinner,
  IonAlert,
  SearchbarCustomEvent,
  SelectCustomEvent
} from '@ionic/react';
import React, { useState, useMemo } from 'react';
import {
  phonePortraitOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  refreshOutline,
  shieldCheckmarkOutline,
  globeOutline,
  timeOutline,
  personOutline,
  alertCircleOutline,
  copyOutline,
  banOutline,
  lockOpenOutline,
  arrowUpOutline,
  arrowDownOutline
} from 'ionicons/icons';
import { useUserDevices } from '../../hooks/useUserDevices';
import { UserDevice, UserDeviceStatus } from '../../types/schema';
import useSyncFeedback from '../../hooks/useSyncFeedback';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function UserDevices() {
  const { userDevices, loading, refresh, updateStatus, updatingId } = useUserDevices();
  const { syncToast, triggerSync, dismissSyncToast } = useSyncFeedback();

  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    color: 'success' | 'danger' | 'warning' | 'primary';
  }>({
    isOpen: false,
    message: '',
    color: 'primary'
  });

  const showToast = (message: string, color: 'success' | 'danger' | 'warning' | 'primary' = 'success') => {
    setToast({ isOpen: true, message, color });
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'last_seen_at' | 'device_name' | 'user' | 'status'>('last_seen_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Confirmation Alert state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    device: UserDevice | null;
    action: 'APPROVE' | 'BLOCK' | 'UNBLOCK';
  }>({
    isOpen: false,
    device: null,
    action: 'APPROVE'
  });

  // Copy identifier state
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopyIdentifier = (device: UserDevice) => {
    if (!device.device_identifier) return;
    navigator.clipboard.writeText(device.device_identifier);
    setCopiedId(device.id);
    showToast('Device identifier copied to clipboard', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Metrics summary
  const metrics = useMemo(() => {
    let total = userDevices.length;
    let approved = 0;
    let pending = 0;
    let blocked = 0;

    userDevices.forEach((d) => {
      const s = (d.status || '').toUpperCase();
      if (s === 'APPROVED') approved++;
      else if (s === 'BLOCKED') blocked++;
      else pending++;
    });

    return { total, approved, pending, blocked };
  }, [userDevices]);

  // Filter & Sort
  const filteredDevices = useMemo(() => {
    return userDevices
      .filter((d) => {
        if (statusFilter !== 'all') {
          const s = (d.status || '').toUpperCase();
          if (s !== statusFilter.toUpperCase()) return false;
        }

        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const userName = d.profiles?.full_name?.toLowerCase() || '';
        const userEmail = d.profiles?.email?.toLowerCase() || '';
        const devName = d.device_name?.toLowerCase() || '';
        const devId = d.device_identifier?.toLowerCase() || '';
        const ip = d.ip_address?.toLowerCase() || '';

        return (
          userName.includes(term) ||
          userEmail.includes(term) ||
          devName.includes(term) ||
          devId.includes(term) ||
          ip.includes(term)
        );
      })
      .sort((a, b) => {
        let valA = '';
        let valB = '';

        if (sortBy === 'user') {
          valA = a.profiles?.full_name || '';
          valB = b.profiles?.full_name || '';
        } else if (sortBy === 'device_name') {
          valA = a.device_name || '';
          valB = b.device_name || '';
        } else if (sortBy === 'status') {
          valA = a.status || '';
          valB = b.status || '';
        } else {
          // last_seen_at
          valA = a.last_seen_at || a.created_at || '';
          valB = b.last_seen_at || b.created_at || '';
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [userDevices, statusFilter, searchTerm, sortBy, sortOrder]);

  const handleSort = (field: 'last_seen_at' | 'device_name' | 'user' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'last_seen_at' ? 'desc' : 'asc');
    }
  };

  const getStatusBadge = (status: string | null | undefined) => {
    const s = (status || 'PENDING').toUpperCase();
    if (s === 'APPROVED') {
      return (
        <span
          style={{
            backgroundColor: '#dcfce7',
            color: '#15803d',
            border: '1px solid #86efac',
            padding: '3px 9px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '13px' }} /> APPROVED
        </span>
      );
    }
    if (s === 'BLOCKED') {
      return (
        <span
          style={{
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            border: '1px solid #fca5a5',
            padding: '3px 9px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <IonIcon icon={closeCircleOutline} style={{ fontSize: '13px' }} /> BLOCKED
        </span>
      );
    }
    return (
      <span
        style={{
          backgroundColor: '#fef3c7',
          color: '#b45309',
          border: '1px solid #fde68a',
          padding: '3px 9px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <IonIcon icon={alertCircleOutline} style={{ fontSize: '13px' }} /> PENDING
      </span>
    );
  };

  const truncateIdentifier = (id?: string | null) => {
    if (!id) return 'N/A';
    if (id.length <= 16) return id;
    return `${id.slice(0, 8)}...${id.slice(-6)}`;
  };

  const executeStatusChange = async (device: UserDevice, newStatus: UserDeviceStatus) => {
    try {
      await updateStatus(device.id, newStatus);
      showToast(
        `Device "${device.device_name || truncateIdentifier(device.device_identifier)}" marked as ${newStatus}`,
        newStatus === 'BLOCKED' ? 'warning' : 'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update device status', 'danger');
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontWeight: 'bold' }}>USER DEVICE MANAGEMENT</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => triggerSync(refresh)} title="Refresh User Devices">
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>

        {/* Search Bar */}
        <IonToolbar style={{ '--background': '#f8fafc' }}>
          <IonSearchbar
            placeholder="Search user, device name, identifier, or IP address..."
            value={searchTerm}
            onIonInput={(e: SearchbarCustomEvent) => setSearchTerm(e.detail.value || '')}
            animated
          />
        </IonToolbar>

        {/* Filter and Sort Toolbar */}
        <IonToolbar style={{ '--background': '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '8px', padding: '0 16px 8px 16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <IonSelect
              value={statusFilter}
              onIonChange={(e: SelectCustomEvent) => setStatusFilter(e.detail.value || 'all')}
              interface="popover"
              style={{ fontSize: '13px', backgroundColor: '#f1f5f9', borderRadius: '6px', padding: '2px 8px' }}
            >
              <IonSelectOption value="all">All Statuses ({metrics.total})</IonSelectOption>
              <IonSelectOption value="APPROVED">Approved ({metrics.approved})</IonSelectOption>
              <IonSelectOption value="PENDING">Pending ({metrics.pending})</IonSelectOption>
              <IonSelectOption value="BLOCKED">Blocked ({metrics.blocked})</IonSelectOption>
            </IonSelect>

            <IonButton
              size="small"
              fill={sortBy === 'user' ? 'solid' : 'outline'}
              color="dark"
              onClick={() => handleSort('user')}
            >
              User
              {sortBy === 'user' && (
                <IonIcon
                  icon={sortOrder === 'asc' ? arrowUpOutline : arrowDownOutline}
                  style={{ marginLeft: '4px' }}
                />
              )}
            </IonButton>

            <IonButton
              size="small"
              fill={sortBy === 'device_name' ? 'solid' : 'outline'}
              color="dark"
              onClick={() => handleSort('device_name')}
            >
              Device
              {sortBy === 'device_name' && (
                <IonIcon
                  icon={sortOrder === 'asc' ? arrowUpOutline : arrowDownOutline}
                  style={{ marginLeft: '4px' }}
                />
              )}
            </IonButton>

            <IonButton
              size="small"
              fill={sortBy === 'status' ? 'solid' : 'outline'}
              color="dark"
              onClick={() => handleSort('status')}
            >
              Status
              {sortBy === 'status' && (
                <IonIcon
                  icon={sortOrder === 'asc' ? arrowUpOutline : arrowDownOutline}
                  style={{ marginLeft: '4px' }}
                />
              )}
            </IonButton>

            <IonButton
              size="small"
              fill={sortBy === 'last_seen_at' ? 'solid' : 'outline'}
              color="dark"
              onClick={() => handleSort('last_seen_at')}
            >
              Last Seen
              {sortBy === 'last_seen_at' && (
                <IonIcon
                  icon={sortOrder === 'asc' ? arrowUpOutline : arrowDownOutline}
                  style={{ marginLeft: '4px' }}
                />
              )}
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f1f5f9' }} scrollY={true}>
        {/* Metric Cards Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}
        >
          <div style={{ backgroundColor: '#ffffff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Registered</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1a365d', marginTop: '2px' }}>{metrics.total}</div>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>Approved Devices</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>{metrics.approved}</div>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>Pending Review</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#b45309', marginTop: '2px' }}>{metrics.pending}</div>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>Blocked Devices</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>{metrics.blocked}</div>
          </div>
        </div>

        {/* Content body */}
        {loading ? (
          <LoadingSpinner />
        ) : filteredDevices.length === 0 ? (
          <EmptyState
            title="NO USER DEVICES FOUND"
            message={
              searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search criteria or status filter'
                : 'User devices will automatically be logged when field inspectors sign in via the AmmoniSense app'
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredDevices.map((device) => {
              const currentStatus = (device.status || 'PENDING').toUpperCase();
              const isUpdating = updatingId === device.id;
              const userName = device.profiles?.full_name || 'Unassigned User';
              const userRole = device.profiles?.role || 'User';
              const formattedLastSeen = device.last_seen_at
                ? new Date(device.last_seen_at).toLocaleString()
                : device.created_at
                ? new Date(device.created_at).toLocaleString()
                : 'Never';

              return (
                <div
                  key={device.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: `1.5px solid ${currentStatus === 'BLOCKED' ? '#fca5a5' : '#e2e8f0'}`,
                    padding: '16px 20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {/* Top line: Device title + Status Badge + Actions */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <IonIcon
                          icon={phonePortraitOutline}
                          style={{
                            fontSize: '20px',
                            color: currentStatus === 'APPROVED' ? '#059669' : currentStatus === 'BLOCKED' ? '#dc2626' : '#d97706'
                          }}
                        />
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1a365d' }}>
                          {device.device_name || 'User Device'}
                        </h3>
                        {getStatusBadge(device.status)}
                      </div>

                      {/* User Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '13px', color: '#475569' }}>
                        <IonIcon icon={personOutline} style={{ color: '#2563eb' }} />
                        <strong>{userName}</strong>
                        <span style={{ fontSize: '11px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                          {userRole}
                        </span>
                        {device.profiles?.email && (
                          <span style={{ fontSize: '12px', color: '#64748b' }}>&bull; {device.profiles.email}</span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* APPROVE BUTTON: enabled if not approved */}
                      {currentStatus !== 'APPROVED' && (
                        <IonButton
                          size="small"
                          fill="solid"
                          color="success"
                          disabled={isUpdating}
                          style={{ '--border-radius': '6px', fontWeight: 700, fontSize: '12px' }}
                          onClick={() => executeStatusChange(device, 'APPROVED')}
                        >
                          <IonIcon icon={checkmarkCircleOutline} slot="start" />
                          Approve
                        </IonButton>
                      )}

                      {/* BLOCK BUTTON: enabled if not blocked */}
                      {currentStatus !== 'BLOCKED' && (
                        <IonButton
                          size="small"
                          fill="solid"
                          color="danger"
                          disabled={isUpdating}
                          style={{ '--border-radius': '6px', fontWeight: 700, fontSize: '12px' }}
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              device,
                              action: 'BLOCK'
                            });
                          }}
                        >
                          <IonIcon icon={banOutline} slot="start" />
                          Block
                        </IonButton>
                      )}

                      {/* UNBLOCK BUTTON: enabled if blocked */}
                      {currentStatus === 'BLOCKED' && (
                        <IonButton
                          size="small"
                          fill="outline"
                          color="warning"
                          disabled={isUpdating}
                          style={{ '--border-radius': '6px', fontWeight: 700, fontSize: '12px' }}
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              device,
                              action: 'UNBLOCK'
                            });
                          }}
                        >
                          <IonIcon icon={lockOpenOutline} slot="start" />
                          Unblock
                        </IonButton>
                      )}

                      {isUpdating && <IonSpinner name="dots" style={{ width: '20px', height: '20px' }} />}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '10px',
                      paddingTop: '10px',
                      borderTop: '1px solid #f1f5f9',
                      fontSize: '12px',
                      color: '#475569'
                    }}
                  >
                    {/* Device Identifier */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 600, color: '#64748b' }}>Identifier:</span>
                      <code
                        style={{
                          backgroundColor: '#f1f5f9',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          color: '#0f172a'
                        }}
                      >
                        {truncateIdentifier(device.device_identifier)}
                      </code>
                      {device.device_identifier && (
                        <IonButton
                          fill="clear"
                          size="small"
                          style={{ '--padding-start': '2px', '--padding-end': '2px', height: '20px' }}
                          onClick={() => handleCopyIdentifier(device)}
                          title="Copy full device identifier"
                        >
                          <IonIcon
                            icon={copyOutline}
                            style={{
                              fontSize: '14px',
                              color: copiedId === device.id ? '#15803d' : '#64748b'
                            }}
                          />
                        </IonButton>
                      )}
                    </div>

                    {/* IP Address */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IonIcon icon={globeOutline} style={{ color: '#0284c7' }} />
                      <span style={{ fontWeight: 600, color: '#64748b' }}>IP Address:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                        {device.ip_address || '—'}
                      </span>
                    </div>

                    {/* Last Seen */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IonIcon icon={timeOutline} style={{ color: '#d97706' }} />
                      <span style={{ fontWeight: 600, color: '#64748b' }}>Last Seen:</span>
                      <span>{formattedLastSeen}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Confirmation Alert */}
        <IonAlert
          isOpen={confirmDialog.isOpen}
          onDidDismiss={() => setConfirmDialog({ isOpen: false, device: null, action: 'APPROVE' })}
          header={
            confirmDialog.action === 'BLOCK'
              ? 'Block User Device?'
              : confirmDialog.action === 'UNBLOCK'
              ? 'Unblock User Device?'
              : 'Approve User Device?'
          }
          message={
            confirmDialog.action === 'BLOCK'
              ? `Are you sure you want to block "${confirmDialog.device?.device_name || 'this device'}"? The user will not be able to log in or sync data from this device.`
              : `Set status of "${confirmDialog.device?.device_name || 'this device'}" to PENDING for review, or immediately APPROVE?`
          }
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel'
            },
            ...(confirmDialog.action === 'UNBLOCK'
              ? [
                  {
                    text: 'Set Pending',
                    handler: () => {
                      if (confirmDialog.device) {
                        executeStatusChange(confirmDialog.device, 'PENDING');
                      }
                    }
                  },
                  {
                    text: 'Approve',
                    handler: () => {
                      if (confirmDialog.device) {
                        executeStatusChange(confirmDialog.device, 'APPROVED');
                      }
                    }
                  }
                ]
              : [
                  {
                    text: confirmDialog.action === 'BLOCK' ? 'Confirm Block' : 'Confirm',
                    role: confirmDialog.action === 'BLOCK' ? 'destructive' : undefined,
                    handler: () => {
                      if (confirmDialog.device) {
                        executeStatusChange(
                          confirmDialog.device,
                          confirmDialog.action === 'BLOCK' ? 'BLOCKED' : 'APPROVED'
                        );
                      }
                    }
                  }
                ])
          ]}
        />

        {/* Toast Notifications */}
        <IonToast
          isOpen={toast.isOpen}
          onDidDismiss={() => setToast(prev => ({ ...prev, isOpen: false }))}
          message={toast.message}
          duration={3000}
          color={toast.color}
          position="bottom"
        />

        <IonToast
          isOpen={syncToast.isOpen}
          onDidDismiss={dismissSyncToast}
          message={syncToast.message}
          duration={syncToast.duration}
          color={syncToast.color}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
}
