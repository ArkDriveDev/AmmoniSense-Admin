import { IonApp } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import AppRouter from './routes/AppRouter';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <AppRouter />
      </IonReactRouter>
    </IonApp>
  );
}