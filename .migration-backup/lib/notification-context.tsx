"use client";

import {
  createContext,
  useContext,
  useState,
} from "react";

const NotificationContext =
  createContext<any>(null);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  const [
    notificationCount,
    setNotificationCount,
  ] = useState(7)

  return (
    <NotificationContext.Provider
      value={{
        notificationCount,
        setNotificationCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(
    NotificationContext
  );
}