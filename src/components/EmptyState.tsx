import { IonIcon } from '@ionic/react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
}

export default function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', marginTop: '40px' }}>
      {icon && <IonIcon icon={icon} size="large" style={{ fontSize: '48px', color: 'gray' }} />}
      <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{title}</p>
      <p style={{ fontSize: '14px', color: 'gray' }}>{message}</p>
    </div>
  );
}