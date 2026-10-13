import { NH3Status } from '../types/inspectionReport';

export const NH3_SAFE_MAX = 5;
export const NH3_WARNING_MAX = 25;

export function getNH3Status(ppm: number | null | undefined): NH3Status {
  if (ppm === null || ppm === undefined) return 'SAFE';
  if (ppm >= NH3_WARNING_MAX) return 'CRITICAL';
  if (ppm >= NH3_SAFE_MAX) return 'WARNING';
  return 'SAFE';
}

export function getNH3BadgeStyle(status: NH3Status) {
  switch (status) {
    case 'CRITICAL':
      return { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' };
    case 'WARNING':
      return { bg: '#fef3c7', color: '#b45309', border: '#fcd34d' };
    case 'SAFE':
    default:
      return { bg: '#dcfce7', color: '#15803d', border: '#86efac' };
  }
}
