import {
  eggOutline,
  pawOutline,
  leafOutline,
  businessOutline,
  waterOutline,
  pricetagOutline
} from 'ionicons/icons';

export interface SiteTypeMeta {
  icon: string;
  label: string;
  badgeBg: string;
  badgeColor: string;
  borderColor: string;
}

export function getSiteTypeMeta(siteType?: string): SiteTypeMeta {
  const norm = (siteType || '').trim().toLowerCase();

  if (norm.includes('poultry')) {
    return {
      icon: eggOutline,
      label: 'Poultry Farm',
      badgeBg: '#FEF3C7',
      badgeColor: '#B45309',
      borderColor: '#FDE68A',
    };
  }

  if (norm.includes('piggery') || norm.includes('pig') || norm.includes('swine')) {
    return {
      icon: pawOutline,
      label: 'Piggery Farm',
      badgeBg: '#FCE7F3',