import { IonApp } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import AppRouter from './routes/AppRouter';

export default function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <AppRouter />
      </IonReactRouter>
    </IonApp>
  );
}