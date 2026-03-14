import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('Notification' in window && 'serviceWorker' in navigator);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error('התראות אינן נתמכות בדפדפן זה');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        toast.success('ההתראות הופעלו בהצלחה!');
        return true;
      } else {
        toast.error('ההרשאה להתראות נדחתה');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const sendLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission === 'granted') {
      // If app is in foreground, we can show a notification directly
      // or rely on the Service Worker.
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            icon: '/placeholder.svg',
            badge: '/placeholder.svg',
            vibrate: [100, 50, 100],
            ...options
          } as any);
        });
      } else {
        new Notification(title, options);
      }
    }
  }, [permission]);

  return {
    permission,
    isSupported,
    requestPermission,
    sendLocalNotification
  };
};
