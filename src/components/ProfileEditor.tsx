import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ActivityLevel, Gender, Goal, UserProfile, WeightEntry } from '@/lib/types';
import { calculateBMR, calculateTDEE, calculateCalorieTarget, calculateMacros } from '@/lib/calculations';
import { calculateAdaptiveTargets } from '@/lib/adaptive-engine';
import { toast } from 'sonner';

interface ProfileEditorProps {
  profile: UserProfile;
  weightHistory: WeightEntry[];
  onUpdateProfile: (p: UserProfile) => void;
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

export default function ProfileEditor({ profile, weightHistory, onUpdateProfile }: ProfileEditorProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: profile.name,
    age: profile.age,
    gender: profile.gender,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    targetWeightKg: profile.targetWeightKg,
    activityLevel: profile.activityLevel,
    goal: profile.goal,
  });

  const handleEdit = () => {
    setForm({
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      targetWeightKg: profile.targetWeightKg,
      activityLevel: profile.activityLevel,
      goal: profile.goal,
    });
    setEditing(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('השם לא יכול להיות ריק');
      return;
    }
    if (form.age < 10 || form.age > 120) {
      toast.error('הגיל חייב להיות בין 10 ל-120');
      return;
    }
    if (form.heightCm < 100 || form.heightCm > 250) {
      toast.error('הגובה חייב להיות בין 100 ל-250 ס"מ');
      return;
    }
    if (form.weightKg < 30 || form.weightKg > 300) {
      toast.error('המשקל חייב להיות בין 30 ל-300 ק"ג');
      return;
    }
    if (form.targetWeightKg < 30 || form.targetWeightKg > 300) {
      toast.error('משקל היעד חייב להיות בין 30 ל-300 ק"ג');
      return;
    }

    const bmr = calculateBMR(form.gender, form.weightKg, form.heightCm, form.age);
    const tdee = calculateTDEE(bmr, form.activityLevel);

    const updatedProfile: UserProfile = {
      ...profile,
      ...form,
      bmr,
      tdee,
    };

    const adaptive = calculateAdaptiveTargets(updatedProfile, weightHistory);
    updatedProfile.dailyCalorieTarget = adaptive.dailyCalorieTarget;
    updatedProfile.proteinTarget = adaptive.proteinTarget;
    updatedProfile.carbsTarget = adaptive.carbsTarget;
    updatedProfile.fatsTarget = adaptive.fatsTarget;

    onUpdateProfile(updatedProfile);
    setEditing(false);
    toast.success('הפרופיל עודכן!');
  };

  if (!editing) {
    return (
      <div className="nova-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em]">פרופיל</h3>
          <motion.button
            onClick={handleEdit}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </motion.button>
        </div>
        <div className="space-y-3">
          {[
            { label: 'שם', value: profile.name },
            { label: 'גיל', value: `${profile.age} שנים` },
            { label: 'מין', value: profile.gender === 'male' ? 'זכר' : 'נקבה' },
            { label: 'גובה', value: `${profile.heightCm} ס"מ` },
            { label: 'משקל', value: `${profile.weightKg} ק"ג` },
            { label: 'משקל יעד', value: `${profile.targetWeightKg} ק"ג` },
            { label: 'פעילות', value: ACTIVITIES.find(a => a.value === profile.activityLevel)?.label || profile.activityLevel },
            { label: 'מטרה', value: GOALS.find(g => g.value === profile.goal)?.label || profile.goal },
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
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="nova-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em]">עריכת פרופיל</h3>
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
              min={10}
              max={120}
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
            min={100}
            max={250}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">משקל (ק"ג)</Label>
            <Input
              type="number"
              value={form.weightKg}
              onChange={e => setForm(f => ({ ...f, weightKg: Number(e.target.value) }))}
              className="h-10 rounded-xl bg-muted/30 border-muted"
              min={30}
              max={300}
              step={0.1}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">יעד (ק"ג)</Label>
            <Input
              type="number"
              value={form.targetWeightKg}
              onChange={e => setForm(f => ({ ...f, targetWeightKg: Number(e.target.value) }))}
              className="h-10 rounded-xl bg-muted/30 border-muted"
              min={30}
              max={300}
              step={0.1}
            />
          </div>
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

        <Button
          onClick={handleSave}
          className="w-full h-11 rounded-xl gap-2 font-medium text-[13px]"
        >
          <Save className="w-4 h-4" /> שמור שינויים
        </Button>
      </div>
    </motion.div>
  );
}
