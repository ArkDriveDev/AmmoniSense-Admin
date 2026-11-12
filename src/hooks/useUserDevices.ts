import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { UserDevice, UserDeviceStatus, Profile } from '../types/schema';

export function useUserDevices() {
  const [userDevices, setUserDevices] = useState<UserDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchUserDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch user_devices joined with profiles
      const { data, error: queryError } = await supabase
        .from('user_devices')
        .select('*, profiles(id, full_name, role, email)')
        .order('last_seen_at', { ascending: false, nullsFirst: false });

      if (queryError) {
        // Fallback: If embedded join fails due to PostgREST relationship cache, query separately
        console.warn('Direct join on user_devices failed, trying independent fallback query:', queryError);
        const [devicesRes, profilesRes] = await Promise.all([
          supabase.from('user_devices').select('*').order('created_at', { ascending: false }),
          supabase.from('profiles').select('id, full_name, role, email')
        ]);

        if (devicesRes.error) throw devicesRes.error;

        const profilesMap = new Map<string, Profile>(
          ((profilesRes.data || []) as Profile[]).map((p) => [p.id, p])
        );

        const mapped: UserDevice[] = ((devicesRes.data || []) as UserDevice[]).map((d) => ({
          ...d,
          profiles: d.profile_id ? profilesMap.get(d.profile_id) || null : null
        }));

        setUserDevices(mapped);
      } else {
        setUserDevices((data || []) as UserDevice[]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user devices';
      console.error('Error fetching user devices:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = async (deviceId: number, newStatus: UserDeviceStatus) => {
    setUpdatingId(deviceId);
    try {
      const { error: updateError } = await supabase
        .from('user_devices')
        .update({ status: newStatus })
        .eq('id', deviceId);

      if (updateError) throw updateError;

      // Dispatch devices_updated event
      window.dispatchEvent(
        new CustomEvent('devices_updated', {
          detail: { deviceId, status: newStatus }
        })
      );

      // Re-fetch or update locally immediately
      setUserDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, status: newStatus } : d))
      );

      // Also trigger a full re-fetch to ensure sync with any database triggers/timestamps
      await fetchUserDevices();
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update device status';
      console.error('Error updating user device status:', err);
      throw err;
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    fetchUserDevices();

    // Listen for devices_updated event
    const handleDevicesUpdated = () => {
      fetchUserDevices();
    };

    window.addEventListener('devices_updated', handleDevicesUpdated);
    return () => {
      window.removeEventListener('devices_updated', handleDevicesUpdated);
    };
  }, [fetchUserDevices]);

  return {
    userDevices,
    setUserDevices,
    loading,
    error,
    refresh: fetchUserDevices,
    updateStatus,
    updatingId
  };
}

export default useUserDevices;

