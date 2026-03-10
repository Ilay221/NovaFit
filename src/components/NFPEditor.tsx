import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Cookie, Clock, Save, Loader2, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/lib/types';
import { toast } from 'sonner';

interface NFPEditorProps {
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] as const } },
};

export default function NFPEditor({ profile, onUpdateProfile }: NFPEditorProps) {
  const [favoriteFood, setFavoriteFood] = useState(profile.favoriteFood || '');
  const [dietaryWeakness, setDietaryWeakness] = useState(profile.dietaryWeakness || '');
  const [dailyHabits, setDailyHabits] = useState(profile.dailyHabits || '');
  const [medicalConditions, setMedicalConditions] = useState(profile.medicalConditions || '');
  const [saving, setSaving] = useState(false);

  const hasChanges =
    favoriteFood !== (profile.favoriteFood || '') ||
    dietaryWeakness !== (profile.dietaryWeakness || '') ||
    dailyHabits !== (profile.dailyHabits || '') ||
    medicalConditions !== (profile.medicalConditions || '');

  const handleSave = () => {
    setSaving(true);
    onUpdateProfile({
      ...profile,
      favoriteFood: favoriteFood.trim(),
      dietaryWeakness: dietaryWeakness.trim(),
      dailyHabits: dailyHabits.trim(),
      medicalConditions: medicalConditions.trim(),
    });
    setTimeout(() => {
      setSaving(false);
      toast.success('Preferences updated! AI coach will use these immediately.');
    }, 300);
  };

  const fields = [
    {
      icon: Heart,
      label: 'Favorite Food',
      description: 'What food makes you happiest?',
      value: favoriteFood,
      onChange: setFavoriteFood,
      placeholder: 'e.g., Sushi, Pasta, Shawarma...',
      multiline: false,
    },
    {
      icon: Cookie,
      label: 'Dietary Weakness',
      description: "What food can't you resist?",
      value: dietaryWeakness,
      onChange: setDietaryWeakness,
      placeholder: 'e.g., Ice cream, Chocolate, Pizza...',
      multiline: false,
    },
    {
      icon: Clock,
      label: 'Daily Habits',
      description: 'Your eating patterns and routines',
      value: dailyHabits,
      onChange: setDailyHabits,
      placeholder: 'e.g., Skip breakfast, Late dinner, Snack at work...',
      multiline: false,
    },
    {
      icon: Stethoscope,
      label: 'Medical Conditions & Allergies',
      description: 'Health info your AI coach needs to know',
      value: medicalConditions,
      onChange: setMedicalConditions,
      placeholder: 'e.g., Diabetes, Lactose intolerant, Nut allergy...',
      multiline: true,
    },
  ];

  return (
    <motion.div variants={itemVariants} className="nova-card p-5">
      <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] mb-1 flex items-center gap-2">
        <Heart className="w-3.5 h-3.5 text-primary" /> Food Preferences (NFP)
      </h3>
      <p className="text-[11px] text-muted-foreground mb-4">
        Your AI coach uses these to give personalized advice. Changes apply instantly.
      </p>

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.label}>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5">
              <field.icon className="w-3 h-3 text-primary" />
              {field.label}
            </label>
            <p className="text-[10px] text-muted-foreground mb-1.5">{field.description}</p>
            {field.multiline ? (
              <textarea
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                maxLength={500}
                className="w-full rounded-xl bg-muted/40 border border-border/50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
              />
            ) : (
              <input
                type="text"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder={field.placeholder}
                maxLength={200}
                className="w-full h-10 rounded-xl bg-muted/40 border border-border/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            )}
          </div>
        ))}
      </div>

      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full gap-2 h-10 rounded-xl text-xs font-semibold"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Preferences
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
