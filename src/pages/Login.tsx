import { useState } from 'react';
import { IonPage, IonContent, IonInput, IonButton, IonTitle } from '@ionic/react';
import { supabase } from '../services/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return alert(error.message);

    window.location.href = '/dashboard';
  };

  return (
    <IonPage>
      <IonContent className="ion-padding">

        <IonTitle>Admin Login</IonTitle>

        <IonInput placeholder="Email" onIonChange={e => setEmail(e.detail.value!)} />
        <IonInput placeholder="Passwo" type="password" onIonChange={e => setPassword(e.detail.value!)} />

        <IonButton expand="block" onClick={login}>
          Login
        </IonButton>

      </IonContent>
    </IonPage>
  );
}