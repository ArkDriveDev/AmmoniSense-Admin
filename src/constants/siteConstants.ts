export interface SelectOption {
  value: string;
  label: string;
}

export const SITE_TYPES: SelectOption[] = [
  { value: 'POULTRY', label: 'Poultry' },
];

export const POULTRY_TYPES: SelectOption[] = [
  { value: 'CONVENTIONAL', label: 'Conventional' },
  { value: 'RETROFITTED',  label: 'Retrofitted' },
  { value: 'TUNNEL VENT',  label: 'Tunnel Vent' },
];

export const CHICKEN_TYPES: SelectOption[] = [
  { value: 'LAYER',            label: 'Layer' },
  { value: 'BROILER',          label: 'Broiler' },
  { value: 'BREEDER',          label: 'Breeder' },
  { value: 'GRAND PARENTS/GP', label: 'Grand Parents / GP' },
];

export function getSiteTypeLabel(value?: string | null): string {
  if (!value) return 'Unspecified';
  const found = SITE_TYPES.find((t) => t.value.toUpperCase() === value.toUpperCase());
  return found ? found.label : value;
}

export function getPoultryTypeLabel(value?: string | null): string {
  if (!value) return 'N/A';
  const found = POULTRY_TYPES.find((t) => t.value.toUpperCase() === value.toUpperCase());
  return found ? found.label : value;
}

export function getChickenTypeLabel(value?: string | null): string {
  if (!value) return 'N/A';
  const found = CHICKEN_TYPES.find((t) => t.value.toUpperCase() === value.toUpperCase());
  return found ? found.label : value;
}
