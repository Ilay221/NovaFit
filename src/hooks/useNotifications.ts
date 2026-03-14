import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Helper to convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Public VAPID key
const PUBLIC_VAPID_KEY = 'BJe8CCJOnAVwmTHMFeqwHsaOc2AdS4KCieEna4ohb0P6DjO_UA1timqJQrG9ImwibxYg3a9ehfo0rxTi_ZjJHzc';

export const useNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    
    if (supported) {
      navigator.serviceWorker.ready.then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      });
    }
  }, []);

  const subscribeToPush = useCallback(async () => {
    if (!isSupported || !user) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
        });
      }

      // Save to Supabase
      const { error } = await (supabase
        .from('push_subscriptions' as any) as any)
        .upsert({
          user_id: user.id,
          subscription_json: subscription.toJSON(),
          device_info: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: (navigator as any).platform
          }
        }, {
          onConflict: 'user_id,subscription_json'
        });

      if (error) throw error;

      setIsSubscribed(true);
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('שגיאה בהרשמה להתראות שרת');
      return null;
    }
  }, [isSupported, user]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error('התראות אינן נתמכות בדפדפן זה');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        const sub = await subscribeToPush();
        if (sub) {
          toast.success('ההתראות הופעלו בסנכרון עם השרת!');
        } else {
          toast.success('ההתראות הופעלו מקומית (תקלה בסנכרון שרת)');
        }
        return true;
      } else {
        toast.error('ההרשאה להתראות נדחתה');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported, subscribeToPush]);

  const sendLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission === 'granted') {
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
    isSubscribed,
    requestPermission,
    subscribeToPush,
    sendLocalNotification
  };
};
