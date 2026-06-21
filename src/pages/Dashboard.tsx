import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle } from '@ionic/react';

export default function Dashboard() {
  return (
    <IonPage>

      <IonHeader>
        <IonToolbar>
          <IonTitle>Admin Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <p>IoT Pig Farm Monitoring System</p>
      </IonContent>

    </IonPage>
  );
}