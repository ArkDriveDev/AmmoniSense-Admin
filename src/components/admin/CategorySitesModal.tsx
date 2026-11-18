import React, { useEffect, useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonSpinner,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
} from '@ionic/react';
import {
  closeOutline,
  businessOutline,
  chevronForwardOutline,
  shieldCheckmarkOutline,
  warningOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import { supabase } from '../../services/supabase';
import { getPoultryTypeLabel, getChickenTypeLabel } from '../../constants/siteConstants';

export interface CategorySiteItem {
  id: number;
  site_name: string;
  site_code?: string | null;
  poultry_type?: string | null;
  chicken_type?: string | null;
  avg_ammonia?: number | null;
  worst_ammonia?: number | null;
  address?: string | null;
  area_size_hectares?: number | null;
  is_active?: boolean;
}

export interface CategorySitesModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartType: 'status' | 'poultry' | 'chicken' | null;
  category: string | null;
  onSelectSite: (site: CategorySiteItem) => void;
}

export default function CategorySitesModal({
  isOpen,
  onClose,
  chartType,
  category,
  onSelectSite,
}: CategorySitesModalProps) {
  const [sites, setSites] = useState<CategorySiteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Compute dynamic title based on chart type and category
  const modalTitle = React.useMemo(() => {
    if (!category) return 'Inspection Sites';
    if (chartType === 'status') {
      const catUpper = category.toUpperCase();
      if (catUpper.includes('SAFE')) return 'Sites with SAFE Ammonia Status';
      if (catUpper.includes('WARNING')) return 'Sites with WARNING Ammonia Status';
      if (catUpper.includes('CRITICAL')) return 'Sites with CRITICAL Ammonia Status';
      return `Sites with ${category} Status`;
    }
    if (chartType === 'poultry') {
      return `${category} Poultry Housing Sites`;
    }
    if (chartType === 'chicken') {
      return `${category} Chicken Type Sites`;
    }
    return `${category} Sites`;
  }, [chartType, category]);

  // Fetch sites on demand when modal opens
  useEffect(() => {
    if (!isOpen || !chartType || !category) {
      setSites([]);
      return;
    }

    let isMounted = true;
    const fetchCategorySites = async () => {
      setLoading(true);
      try {
        // Will be populated in subsequent commits per chart type
        setSites([]);
      } catch (err) {
        console.error('Error fetching sites for category:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCategorySites();
    return () => {
      isMounted = false;
    };
  }, [isOpen, chartType, category]);

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      style={{
        '--max-width': '620px',
        '--border-radius': '16px',
        '--box-shadow': '0 20px 40px rgba(0,0,0,0.2)',
      }}
    >
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontSize: '15px', fontWeight: 700 }}>
            {modalTitle}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose} fill="clear" style={{ '--color': '#ffffff' }}>
              <IonIcon icon={closeOutline} style={{ fontSize: '22px' }} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f8fafc' }}>
        {/* Count Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
            paddingBottom: '10px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
            Matching Active Sites
          </div>
          <IonBadge color="primary" style={{ fontSize: '12px', padding: '4px 10px' }}>
            {loading ? 'Loading...' : `${sites.length} site${sites.length === 1 ? '' : 's'}`}
          </IonBadge>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '180px',
            }}
          >
            <IonSpinner name="crescent" style={{ width: '40px', height: '40px', color: '#1a365d' }} />
            <p style={{ marginTop: '12px', fontSize: '13px', color: '#64748b' }}>
              Loading matching sites...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && sites.length === 0 && (
          <div
            style={{
              padding: '36px 16px',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
              margin: '12px 0',
            }}
          >
            <IonIcon icon={businessOutline} style={{ fontSize: '36px', color: '#94a3b8', marginBottom: '8px' }} />
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 600 }}>
              No sites match this category.
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              No active inspection sites found for {category}.
            </p>
          </div>
        )}

        {/* Site List */}
        {!loading && sites.length > 0 && (
          <IonList style={{ background: 'transparent', padding: 0 }}>
            {sites.map((site) => (
              <IonItem
                key={site.id}
                button
                onClick={() => onSelectSite(site)}
                style={{
                  '--background': '#ffffff',
                  marginBottom: '8px',
                  borderRadius: '10px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  border: '1px solid #e2e8f0',
                }}
              >
                <IonLabel style={{ margin: '12px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <strong style={{ fontSize: '14px', color: '#1a365d' }}>
                      {site.site_name}
                    </strong>
                    {site.site_code && (
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          backgroundColor: '#f1f5f9',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                        }}
                      >
                        {site.site_code}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '12px',
                      marginTop: '6px',
                      fontSize: '12px',
                      color: '#64748b',
                    }}
                  >
                    {site.poultry_type && (
                      <span>
                        Housing: <strong>{getPoultryTypeLabel(site.poultry_type)}</strong>
                      </span>
                    )}
                    {site.chicken_type && (
                      <span>
                        Chicken: <strong>{getChickenTypeLabel(site.chicken_type)}</strong>
                      </span>
                    )}
                    {chartType === 'status' && site.avg_ammonia !== null && site.avg_ammonia !== undefined && (
                      <span style={{ color: '#0f766e', fontWeight: 600 }}>
                        Latest Avg NH₃: {site.avg_ammonia.toFixed(2)} ppm
                      </span>
                    )}
                  </div>
                </IonLabel>
                <IonIcon icon={chevronForwardOutline} slot="end" style={{ color: '#94a3b8', fontSize: '18px' }} />
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonModal>
  );
}
