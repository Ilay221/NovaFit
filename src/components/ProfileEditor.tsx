import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Save, X, Scale, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ActivityLevel, Gender, Goal, UserProfile, WeightEntry } from '@/lib/types';
import { calculateBMR, calculateTDEE, calculateCalorieTarget, calculateMacros } from '@/lib/calculations';
import { calculateAdaptiveTargets } from '@/lib/adaptive-engine';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface ProfileEditorProps {
  profile: UserProfile;
  weightHistory: WeightEntry[];
  onUpdateProfile: (p: UserProfile) => void;
  disabled?: boolean;
}

const ACTIVITIES: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'יושבני' },
  { value: 'light', label: 'קל' },
  { value: 'moderate', label: 'בינוני' },
  { value: 'active', label: 'פעיל' },
  { value: 'very_active', label: 'פעיל מאוד' },
];

const GOALS: { value: Goal; label: string }[] = [
  { value: 'lose', label: 'ירידה במשקל' },
  { value: 'maintain', label: 'שמירה על משקל' },
  { value: 'gain', label: 'עלייה במשקל' },
];

export default function ProfileEditor({ profile, weightHistory, onUpdateProfile, disabled = false }: ProfileEditorProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: profile.name,
    age: profile.age,
    gender: profile.gender,
    heightCm: profile.heightCm,
    activityLevel: profile.activityLevel,
    goal: profile.goal,
    calorieSpreadDays: profile.calorieSpreadDays || 5,
  });
  const [weightForm, setWeightForm] = useState({
    weightKg: profile.weightKg,
    targetWeightKg: profile.targetWeightKg,
  });
  const [editingWeight, setEditingWeight] = useState(false);

  const handleEdit = () => {
    setForm({
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      heightCm: profile.heightCm,
      activityLevel: profile.activityLevel,
      goal: profile.goal,
      calorieSpreadDays: profile.calorieSpreadDays || 5,
    });
    setEditing(true);
  };

  const handleEditWeight = () => {
    setWeightForm({
      weightKg: profile.weightKg,
      targetWeightKg: profile.targetWeightKg,
    });
    setEditingWeight(true);
  };

  const recalcAndSave = (overrides: Partial<UserProfile>) => {
    const merged = { ...profile, ...overrides };
    const bmr = calculateBMR(merged.gender, merged.weightKg, merged.heightCm, merged.age);
    const tdee = calculateTDEE(bmr, merged.activityLevel);
    const updatedProfile: UserProfile = { ...merged, bmr, tdee };
    const adaptive = calculateAdaptiveTargets(updatedProfile, weightHistory);
    updatedProfile.dailyCalorieTarget = adaptive.dailyCalorieTarget;
    updatedProfile.proteinTarget = adaptive.proteinTarget;
    updatedProfile.carbsTarget = adaptive.carbsTarget;
    updatedProfile.fatsTarget = adaptive.fatsTarget;
    onUpdateProfile(updatedProfile);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('השם לא יכול להיות ריק'); return; }
    if (form.age < 10 || form.age > 120) { toast.error('הגיל חייב להיות בין 10 ל-120'); return; }
    if (form.heightCm < 100 || form.heightCm > 250) { toast.error('הגובה חייב להיות בין 100 ל-250 ס"מ'); return; }
    recalcAndSave(form);
    setEditing(false);
    toast.success('הפרופיל עודכן!');
  };

  const handleSaveWeight = async () => {
    if (weightForm.weightKg < 30 || weightForm.weightKg > 300) { toast.error('המשקל חייב להיות בין 30 ל-300 ק"ג'); return; }
    if (weightForm.targetWeightKg < 30 || weightForm.targetWeightKg > 300) { toast.error('משקל היעד חייב להיות בין 30 ל-300 ק"ג'); return; }
    
    // Auto-sync to weight history if current weight changed directly through the profile
    if (weightForm.weightKg !== profile.weightKg) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        await supabase.from('weight_entries').upsert({
          user_id: userData.user.id,
          date: todayStr,
          weight_kg: weightForm.weightKg,
        }, { onConflict: 'user_id,date' });
      }
    }

    recalcAndSave(weightForm);
    setEditingWeight(false);
    toast.success('המשקלים עודכנו!');
  };

  const latestWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weightKg : profile.weightKg;
  const diff = profile.weightKg - profile.targetWeightKg;
  const progressKg = Math.abs(profile.weightKg - latestWeight);
  const totalToLose = Math.abs(diff);
  const progressPct = totalToLose > 0 ? Math.min(100, Math.round((progressKg / totalToLose) * 100)) : 0;

  return (
    <div className="space-y-4">
      {/* Weight Section - Dedicated Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="nova-card p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] flex items-center gap-2">
            <Scale className="w-3.5 h-3.5 text-primary" /> משקל ויעד
          </h3>
          {!editingWeight && !disabled && (
            <motion.button
              onClick={handleEditWeight}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </motion.button>
          )}
          {editingWeight && (
            <motion.button
              onClick={() => setEditingWeight(false)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </div>

        {!editingWeight ? (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'משקל נוכחי', value: `${latestWeight}`, unit: 'ק"ג', icon: <Scale className="w-4 h-4 text-primary" /> },
                { label: 'משקל יעד', value: `${profile.targetWeightKg}`, unit: 'ק"ג', icon: <Target className="w-4 h-4 text-[hsl(142_71%_45%)]" /> },
                { label: 'התקדמות', value: `${progressKg.toFixed(1)}`, unit: 'ק"ג', icon: null },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  className="text-center p-3 rounded-xl bg-muted/30"
                >
                  {item.icon && <div className="flex justify-center mb-1.5">{item.icon}</div>}
                  <div className="text-[16px] font-bold font-display tabular-nums">
                    {item.value}<span className="text-[10px] text-muted-foreground font-normal ms-0.5">{item.unit}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-1">{item.label}</div>
                </motion.div>
              ))}
            </div>
            {totalToLose > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                  <span>{progressPct}% הושלם</span>
                  <span>{progressKg.toFixed(1)} / {totalToLose.toFixed(1)} ק"ג</span>
                </div>
                <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">משקל נוכחי (ק"ג)</Label>
                <Input
                  type="number"
                  value={weightForm.weightKg}
                  onChange={e => setWeightForm(f => ({ ...f, weightKg: Number(e.target.value) }))}
                  className="h-10 rounded-xl bg-muted/30 border-muted"
                  min={30} max={300} step={0.1}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">משקל יעד (ק"ג)</Label>
                <Input
                  type="number"
                  value={weightForm.targetWeightKg}
                  onChange={e => setWeightForm(f => ({ ...f, targetWeightKg: Number(e.target.value) }))}
                  className="h-10 rounded-xl bg-muted/30 border-muted"
                  min={30} max={300} step={0.1}
                />
              </div>
            </div>
            <Button onClick={handleSaveWeight} className="w-full h-11 rounded-xl gap-2 font-medium text-[13px]">
              <Save className="w-4 h-4" /> שמור משקלים
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Personal Info Section */}
      {!editing ? (
        <div className="nova-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em]">פרטים אישיים</h3>
            {!disabled && (
              <motion.button
                onClick={handleEdit}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </div>
          <div className="space-y-3">
            {[
              { label: 'שם', value: profile.name },
              { label: 'גיל', value: `${profile.age} שנים` },
              { label: 'מין', value: profile.gender === 'male' ? 'זכר' : 'נקבה' },
              { label: 'גובה', value: `${profile.heightCm} ס"מ` },
              { label: 'פעילות', value: ACTIVITIES.find(a => a.value === profile.activityLevel)?.label || profile.activityLevel },
              { label: 'מטרה', value: GOALS.find(g => g.value === profile.goal)?.label || profile.goal },
              { label: 'פיזור חריגות', value: profile.calorieSpreadDays && profile.calorieSpreadDays > 1 ? `על פני ${profile.calorieSpreadDays} ימים` : 'ללא פיזור (יום אחד)' },
              { label: 'יעד יומי', value: `${profile.dailyCalorieTarget} קק"ל` },
              { label: 'BMR / TDEE', value: `${profile.bmr} / ${profile.tdee}` },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                className="flex justify-between items-center py-1"
              >
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium tabular-nums">{item.value}</span>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="nova-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em]">עריכת פרטים אישיים</h3>
            <motion.button
              onClick={() => setEditing(false)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">שם</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="h-10 rounded-xl bg-muted/30 border-muted"
                maxLength={50}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">גיל</Label>
                <Input
                  type="number"
                  value={form.age}
                  onChange={e => setForm(f => ({ ...f, age: Number(e.target.value) }))}
                  className="h-10 rounded-xl bg-muted/30 border-muted"
                  min={10} max={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">מין</Label>
                <Select value={form.gender} onValueChange={(v: Gender) => setForm(f => ({ ...f, gender: v }))}>
                  <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-muted">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">זכר</SelectItem>
                    <SelectItem value="female">נקבה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">גובה (ס"מ)</Label>
              <Input
                type="number"
                value={form.heightCm}
                onChange={e => setForm(f => ({ ...f, heightCm: Number(e.target.value) }))}
                className="h-10 rounded-xl bg-muted/30 border-muted"
                min={100} max={250}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">רמת פעילות</Label>
              <Select value={form.activityLevel} onValueChange={(v: ActivityLevel) => setForm(f => ({ ...f, activityLevel: v }))}>
                <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITIES.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">מטרה</Label>
              <Select value={form.goal} onValueChange={(v: Goal) => setForm(f => ({ ...f, goal: v }))}>
                <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOALS.map(g => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">פיזור חריגות (בנק קלוריות)</Label>
              <Select value={String(form.calorieSpreadDays)} onValueChange={(v: string) => setForm(f => ({ ...f, calorieSpreadDays: Number(v) }))}>
                <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">ללא פיזור (רק מחר)</SelectItem>
                  <SelectItem value="3">פזר על 3 ימים</SelectItem>
                  <SelectItem value="5">פזר על 5 ימים</SelectItem>
                  <SelectItem value="7">פזר על שבוע (7 ימים)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSave} className="w-full h-11 rounded-xl gap-2 font-medium text-[13px]">
              <Save className="w-4 h-4" /> שמור שינויים
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
