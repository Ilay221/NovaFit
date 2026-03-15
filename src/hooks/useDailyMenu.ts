import { useState, useEffect, useCallback } from 'react';
import { DailyMenuPlan } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const DAILY_MENU_KEY_PREFIX = 'nova_daily_menu_';

export function useDailyMenu(date: Date) {
  const { user } = useAuth();
  const dateStr = format(date, 'yyyy-MM-dd');
  const [menuPlan, setMenuPlan] = useState<DailyMenuPlan | null>(null);

  const loadMenu = useCallback(() => {
    if (!user) return;
    const key = `${DAILY_MENU_KEY_PREFIX}${user.id}_${dateStr}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        setMenuPlan(JSON.parse(stored));
      } else {
        setMenuPlan(null);
      }
    } catch (e) {
      console.error('Failed to load daily menu', e);
    }
  }, [user, dateStr]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const saveMenu = useCallback((plan: DailyMenuPlan) => {
    if (!user) return;
    const key = `${DAILY_MENU_KEY_PREFIX}${user.id}_${dateStr}`;
    setMenuPlan(plan);
    localStorage.setItem(key, JSON.stringify(plan));
  }, [user, dateStr]);

  const clearMenu = useCallback(() => {
    if (!user) return;
    const key = `${DAILY_MENU_KEY_PREFIX}${user.id}_${dateStr}`;
    setMenuPlan(null);
    localStorage.removeItem(key);
  }, [user, dateStr]);

  return { menuPlan, saveMenu, clearMenu };
}
