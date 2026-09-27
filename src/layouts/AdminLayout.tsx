import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonIcon,
  IonLabel,
  IonItem,
  IonList,
  IonButtons,
  IonButton,
  IonAvatar,
  IonText
} from '@ionic/react';

import { useHistory, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import {
  homeOutline,
  businessOutline,
  hardwareChipOutline,
  barChartOutline,
  calendarOutline,
  notificationsOutline,
  logOutOutline,
  personCircleOutline,
  menuOutline
} from 'ionicons/icons';
import { useEffect, useState } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const history = useHistory();
  const location = useLocation();
  const [userName, setUserName] = useState('MENRO Admin');
  const [userEmail, setUserEmail] = useState('');

  // Responsive sidebar state: open by default on desktop, closed on mobile
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 992 : false);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 992 : true);

  useEffect(() => {
    fetchUserProfile();

    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  // Close sidebar menu whenever navigating to any page
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleNavigate = (path: string) => {
    setSidebarOpen(false);
    history.push(path);
  };

  const logout = async () => {
    setSidebarOpen(false);
    await supabase.auth.signOut();
    history.push('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div style={{
      display: 'flex',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      position: 'relative',

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