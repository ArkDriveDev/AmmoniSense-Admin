import { useState, useEffect } from 'react';
import { IonPage, IonContent, IonInput, IonButton, IonTitle, IonText, IonSpinner, IonIcon, IonToast } from '@ionic/react';
import { personAddOutline, arrowForwardOutline } from 'ionicons/icons';
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
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<'danger' | 'success'>('danger');

  useEffect(() => {
    checkAdminExists();
  }, []);

  const checkAdminExists = async () => {
    try {
      console.log('Checking if admin exists...');
      
      const { data, error } = await supabase.rpc('check_admin_exists');

      if (!error && data === true) {
        setAdminExists(true);
        return;
      }

      // Fallback query directly on profiles table
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'menro_admin');

      setAdminExists((count || 0) > 0);
    } catch (err) {
      console.error('Unexpected error:', err);
      setAdminExists(false);
    } finally {
      setChecking(false);
    }
  };

  const createAdmin = async () => {
    if (!fullName || !email || !password) {
      setToastColor('danger');
      setToastMessage('Please fill in all fields');
      setShowToast(true);
      return;
    }

    if (password.length < 6) {
      setToastColor('danger');
      setToastMessage('Password must be at least 6 characters');
      setShowToast(true);
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
            role: 'menro_admin'
          }
        }
      });

      if (error) {
        console.error('Signup error:', error);
        setToastColor('danger');
        setToastMessage('Error: ' + error.message);
        setShowToast(true);
        setLoading(false);
        return;
      }

      console.log('Auth user created:', data);

      if (!data.user) {
        setToastColor('danger');
        setToastMessage('Failed to create user');
        setShowToast(true);
        setLoading(false);
        return;
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: fullName,
          email: email,
          role: 'menro_admin',
        });

      if (profileError) {
        console.error('Profile error:', profileError);
        setToastColor('danger');
        setToastMessage('Profile error: ' + profileError.message);
        setShowToast(true);
        setLoading(false);
        return;
      }

      console.log('Admin profile created successfully');
      setToastColor('success');
      setToastMessage('Admin created successfully! Please login.');
      setShowToast(true);
      setTimeout(() => {
        history.push('/login');
      }, 1000);

    } catch (err: unknown) {
      console.error('Unexpected error:', err);
      setToastColor('danger');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setToastMessage(message);
      setShowToast(true);
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
              Go to Login <IonIcon icon={arrowForwardOutline} slot="end" />
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
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#1a365d', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 12px auto' }}>
              <IonIcon icon={personAddOutline} />
            </div>
            <IonTitle style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold' }}>
              Create First Admin
            </IonTitle>
          </div>

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
            <IonIcon icon={personAddOutline} slot="start" />
            {loading ? 'Creating...' : 'Create Admin'}
          </IonButton>
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3500}
          color={toastColor}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
}