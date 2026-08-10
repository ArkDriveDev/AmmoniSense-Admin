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
  logOutOutline,
  personCircleOutline,
  closeOutline,
  menuOutline
} from 'ionicons/icons';
import { useEffect, useState } from 'react';

export default function AdminLayout({ children }: any) {
  const history = useHistory();
  const location = useLocation();
  const [userName, setUserName] = useState('MENRO Admin');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    fetchUserProfile();
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
          <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
            <IonTitle style={{ fontSize: '16px', fontWeight: 'bold' }}>
              MENRO ADMIN
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
            borderBottom: '1px solid #e2e8f0',
            marginBottom: '8px'
          }}>
            <IonAvatar style={{ 
              width: '60px', 
              height: '60px', 
              margin: '0 auto 8px auto',
              backgroundColor: '#1a365d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <IonIcon icon={personCircleOutline} style={{ 
                fontSize: '44px', 
                color: 'white' 
              }} />
            </IonAvatar>
            <IonText>
              <h3 style={{ margin: '4px 0', fontWeight: 'bold', color: '#1a365d' }}>{userName}</h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0' }}>{userEmail}</p>
            </IonText>
          </div>

          <IonList style={{ padding: '0' }}>
            <IonItem 
              button 
              onClick={() => history.push('/dashboard')}
              color={isActive('/dashboard') ? 'primary' : undefined}
              style={isActive('/dashboard') ? { 
                borderLeft: '4px solid #1a365d',
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
                borderLeft: '4px solid #1a365d',
                fontWeight: 'bold'
              } : {}}
            >
              <IonIcon icon={peopleOutline} slot="start" />
              <IonLabel>SITE OWNERS</IonLabel>
            </IonItem>

            <IonItem 
              button 
              onClick={() => history.push('/livestock')}
              color={isActive('/livestock') ? 'primary' : undefined}
              style={isActive('/livestock') ? { 
                borderLeft: '4px solid #1a365d',
                fontWeight: 'bold'
              } : {}}
            >
              <IonIcon icon={businessOutline} slot="start" />
              <IonLabel>MONITORING SITES</IonLabel>
            </IonItem>

            <IonItem 
              button 
              onClick={() => history.push('/devices')}
              color={isActive('/devices') ? 'primary' : undefined}
              style={isActive('/devices') ? { 
                borderLeft: '4px solid #1a365d',
                fontWeight: 'bold'
              } : {}}
            >
              <IonIcon icon={hardwareChipOutline} slot="start" />
              <IonLabel>IOT DEVICES</IonLabel>
            </IonItem>

            <IonItem 
              button 
              onClick={() => history.push('/sensor-data')}
              color={isActive('/sensor-data') ? 'primary' : undefined}
              style={isActive('/sensor-data') ? { 
                borderLeft: '4px solid #1a365d',
                fontWeight: 'bold'
              } : {}}
            >
              <IonIcon icon={barChartOutline} slot="start" />
              <IonLabel>SENSOR DATA & MAPS</IonLabel>
            </IonItem>

            <IonItem 
              button 
              onClick={logout}
              style={{ marginTop: '16px' }}
            >
              <IonIcon icon={logOutOutline} slot="start" />
              <IonLabel color="danger">LOGOUT</IonLabel>
            </IonItem>
          </IonList>
        </IonContent>
      </IonMenu>

      <IonPage id="main">
        <IonHeader>
          <IonToolbar style={{ '--background': '#1a365d', '--color': '#ffffff' }}>
            <IonButtons slot="start">
              <IonMenuButton>
                <IonIcon icon={menuOutline} />
              </IonMenuButton>
            </IonButtons>
            <IonTitle style={{ fontWeight: 'bold' }}>MENRO ENVIRONMENTAL ADMIN</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          {children}
        </IonContent>
      </IonPage>
    </IonSplitPane>
  );
}