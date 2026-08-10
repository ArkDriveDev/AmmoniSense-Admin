import { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonInput,
  IonButton,
  IonTitle,
  IonSpinner,
  IonCard,
  IonCardContent,
  IonToast,
  IonIcon
} from '@ionic/react';
import { lockClosedOutline, mailOutline, logInOutline } from 'ionicons/icons';
import { supabase } from '../services/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!email || !password) {
      setToastMessage('Please enter both email and password.');
      setShowToast(true);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        setToastMessage(error.message);
        setShowToast(true);
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Verify user profile role
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileErr) {
          console.warn('Profile fetch warning:', profileErr);
        }

        const role = profile?.role?.toLowerCase() || '';
        if (role && role !== 'menro_admin' && !role.includes('admin')) {
          setToastMessage('Access restricted to MENRO Admin accounts only.');
          setShowToast(true);
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setToastMessage(err.message || 'An unexpected login error occurred.');
      setShowToast(true);
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="ion-padding" style={{ '--background': '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '420px', width: '100%', margin: '60px auto 0 auto' }}>
          <IonCard style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: '#ffffff', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
            <IonCardContent style={{ padding: '32px 24px' }}>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#1a365d', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '12px' }}>
                  <IonIcon icon={logInOutline} />
                </div>
                <IonTitle style={{ fontSize: '22px', fontWeight: 'bold', color: '#1a365d', padding: 0 }}>
                  MENRO Admin Login
                </IonTitle>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Sign in to access the Environmental Monitoring Dashboard
                </p>
              </div>

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '16px' }}>
                  <IonInput
                    label="Email Address"
                    labelPlacement="stacked"
                    type="email"
                    placeholder="admin@ammonisense.com"
                    value={email}
                    onIonInput={e => setEmail(e.detail.value!)}
                    style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px' }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <IonInput
                    label="Password"
                    labelPlacement="stacked"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onIonInput={e => setPassword(e.detail.value!)}
                    style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px' }}
                  />
                </div>

                <IonButton
                  expand="block"
                  type="submit"
                  disabled={loading}
                  style={{ '--background': '#1a365d', '--border-radius': '8px', height: '46px', fontWeight: 'bold' }}
                >
                  {loading ? <IonSpinner color="light" /> : 'SIGN IN TO DASHBOARD'}
                </IonButton>
              </form>
            </IonCardContent>
          </IonCard>
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={5000}
          color="danger"
          position="top"
        />
      </IonContent>
    </IonPage>
  );
}