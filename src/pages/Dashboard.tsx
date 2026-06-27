import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle } from '@ionic/react';

export default function Dashboard() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>DASHBOARD</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <p>IOT PIG FARM MONITORING SYSTEM - ADMIN</p>
      </IonContent>
    </IonPage>
  );
}