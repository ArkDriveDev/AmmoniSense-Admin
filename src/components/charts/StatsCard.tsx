import React from 'react';
import { IonCard, IonCardContent, IonIcon, IonText } from '@ionic/react';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: string;
  color?: string;
  subtitle?: string;
}

export default function StatsCard({ title, value, icon, color = 'primary', subtitle }: StatsCardProps) {
  return (
    <IonCard>
      <IonCardContent style={{ textAlign: 'center' }}>
        <IonIcon 
          icon={icon} 
          style={{ 
            fontSize: '32px', 
            color: `var(--ion-color-${color})` 
          }} 
        />
        <h2 style={{ margin: '8px 0 4px 0', fontSize: '28px', fontWeight: 'bold' }}>
          {value}
        </h2>
        <p style={{ margin: '0', fontSize: '14px', color: 'var(--ion-color-medium)' }}>
          {title}
        </p>
        {subtitle && (
          <IonText color="medium" style={{ fontSize: '12px' }}>
            <p style={{ margin: '4px 0 0 0' }}>{subtitle}</p>
          </IonText>
        )}
      </IonCardContent>
    </IonCard>
  );
}