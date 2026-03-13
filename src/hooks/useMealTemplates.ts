import { useState, useEffect, useCallback } from 'react';
import { MealTemplate, FoodItem } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

const TEMPLATES_KEY_PREFIX = 'nova_templates_';

export function useMealTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<MealTemplate[]>([]);

  const loadTemplates = useCallback(() => {
    if (!user) return;
    const key = `${TEMPLATES_KEY_PREFIX}${user.id}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        setTemplates(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load meal templates', e);
    }
  }, [user]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const saveTemplate = useCallback((template: Omit<MealTemplate, 'id'>) => {
    if (!user) return;
    const key = `${TEMPLATES_KEY_PREFIX}${user.id}`;
    const newTemplate: MealTemplate = {
      ...template,
      id: crypto.randomUUID(),
    };
    
    setTemplates(prev => {
      const updated = [...prev, newTemplate];
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  const deleteTemplate = useCallback((id: string) => {
    if (!user) return;
    const key = `${TEMPLATES_KEY_PREFIX}${user.id}`;
    setTemplates(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  return { templates, saveTemplate, deleteTemplate };
}
