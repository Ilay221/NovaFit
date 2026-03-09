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
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'active', label: 'Active' },
  { value: 'very_active', label: 'Very Active' },
];

const GOALS: { value: Goal; label: string }[] = [
  { value: 'lose', label: 'Lose weight' },
  { value: 'maintain', label: 'Maintain weight' },
  { value: 'gain', label: 'Gain weight' },
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
      toast.error('Name cannot be empty');
      return;
    }
    if (form.age < 10 || form.age > 120) {
      toast.error('Age must be between 10 and 120');
      return;
    }
    if (form.heightCm < 100 || form.heightCm > 250) {
      toast.error('Height must be between 100 and 250 cm');
      return;
    }
    if (form.weightKg < 30 || form.weightKg > 300) {
      toast.error('Weight must be between 30 and 300 kg');
      return;
    }
    if (form.targetWeightKg < 30 || form.targetWeightKg > 300) {
      toast.error('Target weight must be between 30 and 300 kg');
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

    // Recalculate targets
    const adaptive = calculateAdaptiveTargets(updatedProfile, weightHistory);
    updatedProfile.dailyCalorieTarget = adaptive.dailyCalorieTarget;
    updatedProfile.proteinTarget = adaptive.proteinTarget;
    updatedProfile.carbsTarget = adaptive.carbsTarget;
    updatedProfile.fatsTarget = adaptive.fatsTarget;

    onUpdateProfile(updatedProfile);
    setEditing(false);
    toast.success('Profile updated!');
  };

  if (!editing) {
    return (
      <div className="nova-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em]">Profile</h3>
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
            { label: 'Name', value: profile.name },
            { label: 'Age', value: `${profile.age} years` },
            { label: 'Gender', value: profile.gender === 'male' ? 'Male' : 'Female' },
            { label: 'Height', value: `${profile.heightCm} cm` },
            { label: 'Weight', value: `${profile.weightKg} kg` },
            { label: 'Target Weight', value: `${profile.targetWeightKg} kg` },
            { label: 'Activity', value: ACTIVITIES.find(a => a.value === profile.activityLevel)?.label || profile.activityLevel },
            { label: 'Goal', value: `${profile.goal.charAt(0).toUpperCase() + profile.goal.slice(1)} weight` },
            { label: 'Daily Target', value: `${profile.dailyCalorieTarget} kcal` },
            { label: 'BMR / TDEE', value: `${profile.bmr} / ${profile.tdee}` },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -8 }}
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
        <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em]">Edit Profile</h3>
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
          <Label className="text-xs text-muted-foreground">Name</Label>
          <Input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="h-10 rounded-xl bg-muted/30 border-muted"
            maxLength={50}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Age</Label>
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
            <Label className="text-xs text-muted-foreground">Gender</Label>
            <Select value={form.gender} onValueChange={(v: Gender) => setForm(f => ({ ...f, gender: v }))}>
              <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-muted">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Height (cm)</Label>
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
            <Label className="text-xs text-muted-foreground">Weight (kg)</Label>
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
            <Label className="text-xs text-muted-foreground">Target (kg)</Label>
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
          <Label className="text-xs text-muted-foreground">Activity Level</Label>
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
          <Label className="text-xs text-muted-foreground">Goal</Label>
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
          <Save className="w-4 h-4" /> Save Changes
        </Button>
      </div>
    </motion.div>
  );
}
