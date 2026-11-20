import React from 'react';
import { IonIcon, IonSelect, IonSelectOption } from '@ionic/react';
import { searchOutline, closeCircle } from 'ionicons/icons';
import './SearchAndSortBar.css';

export interface SortOption {
  value: string;
  label: string;
}

export interface SearchAndSortBarProps {
  // Search Bar
  searchTerm: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;

  // Sort Control (optional)
  sortBy?: string;
  onSortChange?: (value: string) => void;
  sortOptions?: SortOption[];
  sortPlaceholder?: string;

  // Additional sort/filter controls placed next to each other
  children?: React.ReactNode;

  className?: string;
  style?: React.CSSProperties;
}

export const SearchAndSortBar: React.FC<SearchAndSortBarProps> = ({
  searchTerm,
  onSearchChange,
  placeholder = 'Search...',
  sortBy,
  onSortChange,
  sortOptions,
  sortPlaceholder = 'Sort',
  children,
  className = '',
  style
}) => {
  return (
    <div className={`search-sort-container ${className}`.trim()} style={style}>
      {/* Search Bar (Left Side) */}
      <div className="search-input-wrapper">
        <IonIcon icon={searchOutline} className="search-icon-left" />
        <input
          type="text"
          className="search-text-input"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchTerm && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => onSearchChange('')}
            title="Clear search"
          >
            <IonIcon icon={closeCircle} style={{ fontSize: '18px' }} />
          </button>
        )}
      </div>

      {/* Primary Sort Control (Right Side) */}
      {sortOptions && onSortChange && (
        <div className="sort-control-wrapper">
          <IonSelect
            value={sortBy}
            onIonChange={(e) => onSortChange(e.detail.value)}
            interface="popover"
            placeholder={sortPlaceholder}
            className="sort-select-chip"
          >
            {sortOptions.map((opt) => (
              <IonSelectOption key={opt.value} value={opt.value}>
                {opt.label}
              </IonSelectOption>
            ))}
          </IonSelect>
        </div>
      )}

      {/* Additional sort and filter controls placed next to each other */}
      {children}
    </div>
  );
};

export default SearchAndSortBar;
