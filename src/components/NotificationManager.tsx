import { useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { format } from 'date-fns';

const REMINDERS = [
  { time: '08:30', title: 'בוקר טוב! ☀️', body: 'זמן לארוחת בוקר מזינה. אל תשכח לרשום את האוכל!' },
  { time: '11:00', title: 'זמן לשתות! 💧', body: 'עברה שעה, כדאי לשתות כוס מים.' },
  { time: '13:00', title: 'זמן לארוחת צהריים 🥗', body: 'מה בתפריט היום? כנס לרשום ולראות כמה קלוריות נשארו לך.' },
  { time: '16:00', title: 'זמן לחטיף קטן 🍎', body: 'רעב קצת? חטיף בריא יעזור לך להישאר מרוכז. כנס לראות רעיונות!' },
  { time: '19:30', title: 'ארוחת ערב 🍲', body: 'מסיימים את היום חזק! רשום את ארוחת הערב שלך.' },
  { time: '21:00', title: 'סיכום יום 📊', body: 'איך עבר היום? בדוק את האנליטיקס וראה את ההתקדמות שלך!' },
];

export const NotificationManager = () => {
  const { permission, sendLocalNotification } = useNotifications();

  useEffect(() => {
    if (permission !== 'granted') return;

    const checkReminders = () => {
      const now = format(new Date(), 'HH:mm');
      
      const matchedReminder = REMINDERS.find(r => r.time === now);
      if (matchedReminder) {
        // Prevent multiple notifications per minute
        const lastSent = localStorage.getItem(`last_notif_${matchedReminder.time}`);
        const today = format(new Date(), 'yyyy-MM-dd');
        
        if (lastSent !== today) {
          sendLocalNotification(matchedReminder.title, {
            body: matchedReminder.body,
            tag: matchedReminder.time // Deduplication
          });
          localStorage.setItem(`last_notif_${matchedReminder.time}`, today);
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkReminders, 60000);
    
    // Also check immediately
    checkReminders();

    return () => clearInterval(interval);
  }, [permission, sendLocalNotification]);

  return null; // This component doesn't render anything UI-wise
};
