import {
  IonSplitPane,
  IonMenu,
  IonContent,
  IonList,
  IonItem,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonPage,
  IonIcon,
  IonLabel,
  IonBadge,
  IonMenuButton,
  IonButtons,
  IonAvatar,
  IonText
} from '@ionic/react';

import { useHistory, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import {
  homeOutline,
  peopleOutline,
  businessOutline,
  hardwareChipOutline,
  barChartOutline,
  alertCircleOutline,
  logOutOutline,
  personCircleOutline,
  closeOutline,
  menuOutline
} from 'ionicons/icons';
import { useEffect, useState } from 'react';

export default function AdminLayout({ children }: any) {
  const history = useHistory();
  const location = useLocation();
  const [userName, setUserName] = useState('Admin');
  const [userEmail, setUserEmail] = useState('');
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    fetchUserProfile();
    fetchAlertCount();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) return;

      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      if (data?.full_name) {
        setUserName(data.full_name);
      }
      
      if (userData.user?.email) {
        setUserEmail(userData.user.email);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchAlertCount = async () => {
    try {
      const { count } = await supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);

      setAlertCount(count || 0);
    } catch (err) {
      console.error('Error fetching alert count:', err);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    history.push('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <IonSplitPane contentId="main">
      <IonMenu contentId="main" type="push" side="start">
        <IonHeader>
          <IonToolbar>
            <IonTitle style={{ fontSize: '18px', fontWeight: 'bold' }}>
              ADMIN PANEL
            </IonTitle>
            <IonButtons slot="end">
              <IonMenuButton autoHide={false}>
                <IonIcon icon={closeOutline} />
              </IonMenuButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <div style={{ 
            padding: '16px', 
            textAlign: 'center',
            borderBottom: '1px solid var(--ion-color-light)',
            marginBottom: '8px'
          }}>
            <IonAvatar style={{ 
              width: '64px', 
              height: '64px', 
              margin: '0 auto 8px auto',
              backgroundColor: 'var(--ion-color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <IonIcon icon={personCircleOutline} style={{ 
                fontSize: '48px', 
                color: 'white' 
              }} />
            </IonAvatar>
            <IonText>
              <h3 style={{ margin: '4px 0', fontWeight: 'bold' }}>{userName}</h3>
              <p style={{ fontSize: '12px', color: 'gray', margin: '0' }}>{userEmail}</p>
            </IonText>
          </div>

          <IonList style={{ padding: '0' }}>
            <IonItem 
              button 
              onClick={() => history.push('/dashboard')}
              color={isActive('/dashboard') ? 'primary' : undefined}
              style={isActive('/dashboard') ? { 
                borderLeft: '4px solid var(--ion-color-primary)',
                fontWeight: 'bold'
              } : {}}
            >
              <IonIcon icon={homeOutline} slot="start" />
              <IonLabel>DASHBOARD</IonLabel>
            </IonItem>

            <IonItem 
              button 
              onClick={() => history.push('/clients')}
              color={isActive('/clients') ? 'primary' : undefined}
              style={isActive('/clients') ? { 
                borderLeft: '4px solid var(--ion-color-primary)',
                fontWeight: 'bold'
              } : {}}
            >
              <IonIcon icon={peopleOutline} slot="start" />
              <IonLabel>CLIENTS</IonLabel>
            </IonItem>

            <IonItem 
              button 
              onClick={() => history.push('/livestock')}
              color={isActive('/livestock') ? 'primary' : undefined}
              style={isActive('/livestock') ? { 
                borderLeft: '4px solid var(--ion-color-primary)',
                fontWeight: 'bold'
              } : {}}
            >
              <IonIcon icon={businessOutline} slot="start" />
              <IonLabel>LIVESTOCK</IonLabel>
            </IonItem>

            <IonItem 
              button 
              onClick={() => history.push('/devices')}
              color={isActive('/devices') ? 'primary' : undefined}
              style={isActive('/devices') ? { 
                borderLeft: '4px solid var(--ion-color-primary)',
                fontWeight: 'bold'
              } : {}}
            >
              <IonIcon icon={hardwareChipOutline} slot="start" />
              <IonLabel>DEVICES</IonLabel>
            </IonItem>

            <IonItem 
              button 
              onClick={() => history.push('/sensor-data')}
              color={isActive('/sensor-data') ? 'primary' : undefined}
              style={isActive('/sensor-data') ? { 
                borderLeft: '4px solid var(--ion-color-primary)',
                fontWeight: 'bold'
              } : {}}
            >
              <IonIcon icon={barChartOutline} slot="start" />
              <IonLabel>SENSOR DATA</IonLabel>
            </IonItem>

            <IonItem 
              button 
              onClick={() => history.push('/notifications')}
              color={isActive('/notifications') ? 'primary' : undefined}
              style={isActive('/notifications') ? { 
                borderLeft: '4px solid var(--ion-color-primary)',
                fontWeight: 'bold'
              } : {}}
            >
              <IonIcon icon={alertCircleOutline} slot="start" />
              <IonLabel>ALERTS</IonLabel>
              {alertCount > 0 && (
                <IonBadge color="danger" slot="end">
                  {alertCount}
                </IonBadge>
              )}
            </IonItem>

            <IonItem 
              button 
              onClick={logout}
              style={{ marginTop: '8px' }}
            >
              <IonIcon icon={logOutOutline} slot="start" />
              <IonLabel color="danger">LOGOUT</IonLabel>
            </IonItem>
          </IonList>
        </IonContent>
      </IonMenu>

      <IonPage id="main">
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonMenuButton>
                <IonIcon icon={menuOutline} />
              </IonMenuButton>
            </IonButtons>
            <IonTitle>ADMIN PANEL</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          {children}
        </IonContent>
      </IonPage>
    </IonSplitPane>
  );
}