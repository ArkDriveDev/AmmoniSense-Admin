import { IonSearchbar, IonButton, IonToolbar } from '@ionic/react';

interface SearchSortBarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  sortOrder: string;
  setSortOrder: (value: string) => void;
  sortFields: { key: string; label: string }[];
  onReset: () => void;
  placeholder?: string;
}

export default function SearchSortBar({
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  sortFields,
  onReset,
  placeholder = 'SEARCH...'
}: SearchSortBarProps) {
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <>
      <IonToolbar>
        <IonSearchbar
          placeholder={placeholder}
          value={searchTerm}
          onIonChange={(e) => setSearchTerm(e.detail.value || '')}
          animated
        />
      </IonToolbar>
      <IonToolbar>
        <div style={{ display: 'flex', gap: '8px', padding: '0 16px 8px 16px', flexWrap: 'wrap' }}>
          {sortFields.map((field) => (
            <IonButton
              key={field.key}
              size="small"
              fill={sortBy === field.key ? 'solid' : 'outline'}
              onClick={() => handleSort(field.key)}
            >
              {field.label} {sortBy === field.key && (sortOrder === 'asc' ? '▲' : '▼')}
            </IonButton>
          ))}
          <IonButton size="small" color="medium" fill="outline" onClick={onReset}>
            RESET
          </IonButton>
        </div>
      </IonToolbar>
    </>
  );
}