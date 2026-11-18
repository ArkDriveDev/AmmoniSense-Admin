import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent
} from '@ionic/react';

export default function ActivityLogs() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
          <IonTitle style={{ fontWeight: 'bold' }}>SYSTEM & ACTIVITY LOGS</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f8fafc' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Activity Logs Content */}
        </div>
      </IonContent>
    </IonPage>
  );
}
