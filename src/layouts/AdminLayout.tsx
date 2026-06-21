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
  IonRouterOutlet,
  IonButtons,
  IonMenuButton,
} from "@ionic/react";

import { Redirect, Route } from "react-router-dom";
import { supabase } from "../services/supabase";

import Dashboard from "../pages/Dashboard";


export default function AdminLayout() {

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const menu = [
    { title: "Dashboard", path: "/admin/dashboard" },
    { title: "Clients", path: "/admin/users" },
    { title: "Piggeries", path: "/admin/piggeries" },
    { title: "Devices", path: "/admin/devices" },
    { title: "Sensor Data", path: "/admin/sensor-data" },
    { title: "Notifications", path: "/admin/notifications" },
  ];

  return (
    <IonSplitPane contentId="admin">

      {/* SIDE MENU */}
      <IonMenu contentId="admin">
        <IonHeader>
          <IonToolbar>
            <IonTitle>Piggery Admin</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <IonList>

            {menu.map((item) => (
              <IonItem
                key={item.path}
                routerLink={item.path}
                routerDirection="root"
              >
                {item.title}
              </IonItem>
            ))}

            <IonItem button onClick={logout}>
              Logout
            </IonItem>

          </IonList>
        </IonContent>
      </IonMenu>

      {/* MAIN AREA */}
      <IonPage id="admin">

        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonMenuButton />
            </IonButtons>

            <IonTitle>Admin Panel</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent fullscreen>
          <IonRouterOutlet>

            <Route exact path="/admin">
              <Redirect to="/admin/dashboard" />
            </Route>

            <Route exact path="/admin/dashboard" component={Dashboard} />
          </IonRouterOutlet>
        </IonContent>

      </IonPage>

    </IonSplitPane>
  );
}