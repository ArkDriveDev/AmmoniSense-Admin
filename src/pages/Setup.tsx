import { useState } from 'react';
import { IonPage, IonContent, IonInput, IonButton, IonTitle } from '@ionic/react';
import { supabase } from '../services/supabase';

export default function Setup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const createAdmin = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) return alert(error.message);

    await supabase.from('profiles').insert({
      id: data.user?.id,
      full_name: fullName,
      role: 'admin',
    });

    alert('Admin created');
    window.location.href = '/login';
  };

  return (
    <IonPage>
      <IonContent className="ion-padding">

        <IonTitle>Create First Admin</IonTitle>

        <IonInput placeholder="Full Name" onIonChange={e => setFullName(e.detail.value!)} />
        <IonInput placeholder="Email" onIonChange={e => setEmail(e.detail.value!)} />
        <IonInput type="password" placeholder="Password" onIonChange={e => setPassword(e.detail.value!)} />

        <IonButton expand="block" onClick={createAdmin}>
          Create Admin
        </IonButton>

      </IonContent>
    </IonPage>
  );
}