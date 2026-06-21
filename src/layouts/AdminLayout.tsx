import {
  IonSplitPane,
  IonMenu,
  IonContent,
  IonList,
  IonItem,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonPage
} from '@ionic/react';

import { useHistory } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function AdminLayout({ children }: any) {
  const history = useHistory();

  const logout = async () => {
    await supabase.auth.signOut();
    history.push('/login');
  };

  return (
    <IonSplitPane contentId="main">

      {/* SIDEBAR */}
      <IonMenu contentId="main">
        <IonHeader>
          <IonToolbar>
            <IonTitle>Admin Panel</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <IonList>

            <IonItem button onClick={() => history.push('/dashboard')}>
              Dashboard
            </IonItem>

            <IonItem button onClick={() => history.push('/users')}>
              Clients
            </IonItem>

            <IonItem button onClick={() => history.push('/piggeries')}>
              Piggeries
            </IonItem>

            <IonItem button onClick={() => history.push('/devices')}>
              Devices
            </IonItem>

            <IonItem button onClick={() => history.push('/sensor-data')}>
              Sensor Data
            </IonItem>

            <IonItem button onClick={() => history.push('/notifications')}>
              Notifications
            </IonItem>

            <IonItem button onClick={logout}>
              Logout
            </IonItem>

          </IonList>
        </IonContent>
      </IonMenu>

      {/* MAIN CONTENT AREA */}
      <IonPage id="main">
        {children}
      </IonPage>

    </IonSplitPane>
  );
}