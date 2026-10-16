export const AMMONIA_THRESHOLDS = {
  SAFE_MAX: 5,
  WARNING_MAX: 25,
} as const;

export type AmmoniaLevelStatus = 'SAFE' | 'WARNING' | 'CRITICAL';

export function getAmmoniaLevelStatus(ppm: number | null | undefined): AmmoniaLevelStatus {
  if (ppm === null || ppm === undefined) return 'SAFE';
  if (ppm >= AMMONIA_THRESHOLDS.WARNING_MAX) return 'CRITICAL';
  if (ppm >= AMMONIA_THRESHOLDS.SAFE_MAX) return 'WARNING';
  return 'SAFE';
}

export function getAmmoniaLevelBadgeStyle(status: AmmoniaLevelStatus) {
  switch (status) {
    case 'CRITICAL':
      return {
        bg: '#fee2e2',
        color: '#dc2626',
        border: '#f87171',
        badgeColor: 'danger' as const,
        dotColor: '#ef4444',
        label: 'CRITICAL',
      };
    case 'WARNING':
      return {
        bg: '#fef3c7',
        color: '#b45309',
        border: '#fcd34d',
        badgeColor: 'warning' as const,
        dotColor: '#f59e0b',
        label: 'WARNING',
      };
    case 'SAFE':
    default:
      return {
        bg: '#dcfce7',
        color: '#15803d',
        border: '#86efac',
        badgeColor: 'success' as const,
        dotColor: '#22c55e',
        label: 'SAFE',
      };
  }
}
