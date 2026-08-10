import { IonApp } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import AppRouter from './routes/AppRouter';
import 'leaflet/dist/leaflet.css';

export default function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <AppRouter />
      </IonReactRouter>
    </IonApp>
  );
}