import { useState, useEffect, useCallback } from 'react';
import { AccentColor, ThemeMode, UserProfile, DailyLog, MealEntry, WeightEntry } from './types';

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function saveJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => loadJSON('nova-theme', 'dark'));
  const [accent, setAccent] = useState<AccentColor>(() => loadJSON('nova-accent', 'green'));

  useEffect(() => {
    const root = document.documentElement;
    const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', isDark);
    root.className = root.className.replace(/accent-\w+/g, '');
    root.classList.add(`accent-${accent}`);
    saveJSON('nova-theme', mode);
    saveJSON('nova-accent', accent);
  }, [mode, accent]);

  return { mode, setMode, accent, setAccent };
}

export function useProfile() {
  const [profile, setProfileState] = useState<UserProfile | null>(() => loadJSON('nova-profile', null));
  const setProfile = useCallback((p: UserProfile | null) => {
    setProfileState(p);
    saveJSON('nova-profile', p);
  }, []);
  return { profile, setProfile };
}

const todayKey = () => new Date().toISOString().slice(0, 10);

export function useDailyLog() {
  const [logs, setLogsState] = useState<Record<string, DailyLog>>(() => loadJSON('nova-logs', {}));

  const save = useCallback((updated: Record<string, DailyLog>) => {
    setLogsState(updated);
    saveJSON('nova-logs', updated);
  }, []);

  const getLog = useCallback((date?: string): DailyLog => {
    const d = date || todayKey();
    return logs[d] || { date: d, meals: [], waterMl: 0 };
  }, [logs]);

  const addMeal = useCallback((entry: MealEntry, date?: string) => {
    const d = date || todayKey();
    const log = logs[d] || { date: d, meals: [], waterMl: 0 };
    save({ ...logs, [d]: { ...log, meals: [...log.meals, entry] } });
  }, [logs, save]);

  const removeMeal = useCallback((mealId: string, date?: string) => {
    const d = date || todayKey();
    const log = logs[d];
    if (!log) return;
    save({ ...logs, [d]: { ...log, meals: log.meals.filter(m => m.id !== mealId) } });
  }, [logs, save]);

  const addWater = useCallback((ml: number, date?: string) => {
    const d = date || todayKey();
    const log = logs[d] || { date: d, meals: [], waterMl: 0 };
    save({ ...logs, [d]: { ...log, waterMl: log.waterMl + ml } });
  }, [logs, save]);

  return { logs, getLog, addMeal, removeMeal, addWater };
}

export function useWeightHistory() {
  const [entries, setEntries] = useState<WeightEntry[]>(() => loadJSON('nova-weight', []));
  const addEntry = useCallback((entry: WeightEntry) => {
    const updated = [...entries.filter(e => e.date !== entry.date), entry].sort((a, b) => a.date.localeCompare(b.date));
    setEntries(updated);
    saveJSON('nova-weight', updated);
  }, [entries]);
  return { entries, addEntry };
}
