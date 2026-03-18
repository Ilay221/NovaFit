import { useState, useEffect, useCallback } from 'react';
import { MealTemplate } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const TEMPLATES_KEY_PREFIX = 'nova_templates_';

export function useMealTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Try to fetch from Supabase
      const { data, error } = await (supabase as any)
        .from('meal_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setTemplates((data as any[]).map(t => ({
          id: t.id,
          name: t.name,
          items: t.items
        })));
      } else {
        // 2. Fallback to localStorage for legacy data and sync it
        const key = `${TEMPLATES_KEY_PREFIX}${user.id}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored) as MealTemplate[];
          setTemplates(parsed);
          
          // Auto-sync legacy data to DB
          for (const t of parsed) {
            await (supabase as any).from('meal_templates').insert({
              user_id: user.id,
              name: t.name,
              items: t.items
            });
          }
          // Clear localStorage after sync
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.error('Failed to load meal templates', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const saveTemplate = useCallback(async (template: Omit<MealTemplate, 'id'>) => {
    if (!user) return;
    try {
      const { data, error } = await (supabase as any)
        .from('meal_templates')
        .insert({
          user_id: user.id,
          name: template.name,
          items: template.items,
          meal_type: template.mealType
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setTemplates(prev => [data as any, ...prev]);
      }
    } catch (e) {
      console.error('Failed to save template', e);
    }
  }, [user]);

  const deleteTemplate = useCallback(async (id: string) => {
    if (!user) return;
    try {
      const { error } = await (supabase as any)
        .from('meal_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error('Failed to delete template', e);
    }
  }, [user]);

  return { templates, loading, saveTemplate, deleteTemplate, refresh: loadTemplates };
}
