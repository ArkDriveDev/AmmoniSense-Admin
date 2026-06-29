import { IonSpinner } from '@ionic/react';

export default function LoadingSpinner({ message = 'LOADING...' }: { message?: string }) {
  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      <IonSpinner />
      <p>{message}</p>
    </div>
  );
}