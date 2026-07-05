import { IonCard, IonCardContent, IonIcon } from '@ionic/react';

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
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--ion-color-medium)' }}>
            {subtitle}
          </p>
        )}
      </IonCardContent>
    </IonCard>
  );
}