import { useState, useEffect } from 'react';
import { IonPage, IonContent, IonInput, IonButton, IonTitle, IonText, IonSpinner } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function Setup() {
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    checkAdminExists();
  }, []);

  const checkAdminExists = async () => {
    try {
      console.log('Checking if admin exists via RPC...');
      
      // Use the database function that bypasses RLS
      const { data, error } = await supabase
        .rpc('check_admin_exists');

      console.log('RPC Result:', data, error);

      if (error) {
        console.error('RPC Error:', error);
        // Fallback: Try a direct query with service role key?
        setAdminExists(false);
      } else {
        setAdminExists(data === true);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setAdminExists(false);
    } finally {
      setChecking(false);
    }
  };

  const createAdmin = async () => {
    if (!fullName || !email || !password) {
      alert('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      console.log('Creating admin...');

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'admin'
          }
        }
      });

      if (error) {
        console.error('Signup error:', error);
        alert('Error: ' + error.message);
        setLoading(false);
        return;
      }

      console.log('Auth user created:', data);

      if (!data.user) {
        alert('Failed to create user');
        setLoading(false);
        return;
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: fullName,
          role: 'admin',
        });

      if (profileError) {
        console.error('Profile error:', profileError);
        alert('Profile error: ' + profileError.message);
        setLoading(false);
        return;
      }

      console.log('Admin profile created successfully');
      alert('Admin created successfully! Please login.');
      history.push('/login');

    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <IonPage>
        <IonContent className="ion-padding" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IonSpinner />
          <p style={{ marginLeft: '12px' }}>Checking...</p>
        </IonContent>
      </IonPage>
    );
  }

  if (adminExists) {
    return (
      <IonPage>
        <IonContent className="ion-padding" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <h2>Admin already exists</h2>
            <p>Redirecting to login...</p>
            <IonButton 
              onClick={() => history.push('/login')}
              style={{ marginTop: '16px' }}
            >
              Go to Login
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent className="ion-padding" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ maxWidth: '400px', width: '100%' }}>
          <IonTitle style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
            Create First Admin
          </IonTitle>

          <IonText color="medium" style={{ textAlign: 'center', display: 'block', marginBottom: '24px' }}>
            <p>This is a one-time setup. Create the first admin account.</p>
          </IonText>

          <IonInput
            placeholder="Full Name"
            value={fullName}
            onIonChange={e => setFullName(e.detail.value!)}
            style={{ marginBottom: '12px' }}
          />

          <IonInput
            placeholder="Email"
            type="email"
            value={email}
            onIonChange={e => setEmail(e.detail.value!)}
            style={{ marginBottom: '12px' }}
          />

          <IonInput
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onIonChange={e => setPassword(e.detail.value!)}
            style={{ marginBottom: '16px' }}
          />

          <IonButton
            expand="block"
            onClick={createAdmin}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Admin'}
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
}