import { useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../lib/firebase';

export const useFCM = () => {
  const [token, setToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check if notification permission is granted
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    try {
      if (!('Notification' in window)) {
        throw new Error('This browser does not support desktop notification');
      }

      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        // Get FCM token
        const messaging = getMessaging(app);
        const currentToken = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FCM_PUBLIC_KEY,
        });

        if (currentToken) {
          setToken(currentToken);
          return currentToken;
        } else {
          throw new Error('No registration token available');
        }
      } else {
        throw new Error('Permission denied');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (notificationPermission === 'granted') {
      const messaging = getMessaging(app);
      
      // Handle foreground messages
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Received foreground message:', payload);
        setNotification(payload);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [notificationPermission]);

  return {
    token,
    notification,
    notificationPermission,
    requestPermission,
  };
};
