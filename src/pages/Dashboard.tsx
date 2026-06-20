import { IonPage, IonContent, IonTitle } from '@ionic/react';

export default function Dashboard() {
  return (
    <IonPage>
      <IonContent className="ion-padding">
        <IonTitle>Admin Dashboard</IonTitle>
        <p>IoT Pig Farm Monitoring System</p>
      </IonContent>
    </IonPage>
  );
}