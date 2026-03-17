import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Activity, Target, Dumbbell, Ruler, Check, Sparkles, Calendar, AlertTriangle, Heart, Cookie, Clock, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { UserProfile, Gender, ActivityLevel, Goal } from '@/lib/types';
import { calculateBMR, calculateTDEE, calculateCalorieTarget, calculateMacros } from '@/lib/calculations';
import { calculateAdaptiveTargets } from '@/lib/adaptive-engine';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';

const STEPS = ['welcome', 'basics', 'body', 'activity', 'goal', 'preferences', 'health', 'timeline', 'results'] as const;
type Step = typeof STEPS[number];

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState<Gender>('male');
  const [heightCm, setHeightCm] = useState(175);
  const [weightKg, setWeightKg] = useState(80);
  const [targetWeightKg, setTargetWeightKg] = useState(72);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<Goal>('lose');
  const [weeklyPaceKg, setWeeklyPaceKg] = useState<number>(0.5); // Ranges from 0.25 to 2.5
  const [useTimeline, setUseTimeline] = useState(true);
  const [favoriteFood, setFavoriteFood] = useState('');
  const [dietaryWeakness, setDietaryWeakness] = useState('');
  const [dailyHabits, setDailyHabits] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [chatHarshness, setChatHarshness] = useState('בינוני');
  const [coachName, setCoachName] = useState('NovaFit AI');

  const stepIndex = STEPS.indexOf(step);
  const next = () => setStep(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)]);
  const prev = () => setStep(STEPS[Math.max(stepIndex - 1, 0)]);

  const bmr = calculateBMR(gender, weightKg, heightCm, age);
  const tdee = calculateTDEE(bmr, activityLevel);
  const dailyCalorieTarget = calculateCalorieTarget(tdee, goal);
  const macros = calculateMacros(dailyCalorieTarget, goal);

  // Real-time calculation of target days based on selected pace
  const weightDiffAbsolute = Math.abs(weightKg - targetWeightKg);
  const isLoss = weightKg > targetWeightKg;
  const calculatedDays = Math.max(1, Math.round((weightDiffAbsolute / weeklyPaceKg) * 7));

  const targetDateStr = useTimeline ? format(addDays(new Date(), calculatedDays), 'yyyy-MM-dd') : null;

  const tempProfile: UserProfile = {
    name, age, gender, heightCm, weightKg, targetWeightKg,
    activityLevel, goal, bmr, tdee,
    dailyCalorieTarget, proteinTarget: macros.protein, carbsTarget: macros.carbs, fatsTarget: macros.fats,
    targetDate: targetDateStr,
    calorieSpreadDays: 5,
  };

  const adaptive = calculateAdaptiveTargets(tempProfile, []);

  const finalCalories = useTimeline ? adaptive.dailyCalorieTarget : dailyCalorieTarget;
  const finalMacros = useTimeline
    ? { protein: adaptive.proteinTarget, carbs: adaptive.carbsTarget, fats: adaptive.fatsTarget }
    : macros;

  const finish = () => {
    onComplete({
      name, age, gender, heightCm, weightKg, targetWeightKg,
      activityLevel, goal, bmr, tdee,
      dailyCalorieTarget: finalCalories,
      proteinTarget: finalMacros.protein, carbsTarget: finalMacros.carbs, fatsTarget: finalMacros.fats,
      targetDate: targetDateStr,
      calorieSpreadDays: 5,
      favoriteFood, dietaryWeakness, dailyHabits, medicalConditions,
      chatHarshness, coachName: coachName.trim() || 'NovaFit AI',
    });
  };

  const activities: { value: ActivityLevel; label: string; desc: string }[] = [
    { value: 'sedentary', label: 'יושבני', desc: 'מעט או ללא פעילות גופנית' },
    { value: 'light', label: 'פעילות קלה', desc: 'אימון 1–3 ימים בשבוע' },
    { value: 'moderate', label: 'בינוני', desc: 'אימון 3–5 ימים בשבוע' },
    { value: 'active', label: 'פעיל', desc: 'אימון 6–7 ימים בשבוע' },
    { value: 'very_active', label: 'פעיל מאוד', desc: 'אימון קשה יומי' },
  ];

  const pageVariants = {
    enter: { x: -50, opacity: 0, filter: 'blur(8px)' },
    center: { x: 0, opacity: 1, filter: 'blur(0px)' },
    exit: { x: 50, opacity: 0, filter: 'blur(8px)' },
  };

  return (
    <div className="min-h-screen glass-screen flex items-center justify-center p-6 overflow-hidden relative">
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-[0.03] top-[-200px] right-[-100px]"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent)' }}
        animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />

      <div className="w-full max-w-md relative z-10">
        {step !== 'welcome' && (
          <motion.div className="flex gap-1.5 mb-12" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            {STEPS.slice(1).map((s, i) => (
              <div key={s} className="h-[3px] flex-1 rounded-full overflow-hidden bg-border">
                <motion.div
                  className="h-full bg-foreground rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: i <= STEPS.slice(1).indexOf(step) ? 1 : 0 }}
                  transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                  style={{ transformOrigin: 'right' }}
                />
              </div>
            ))}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
          >
            {step === 'welcome' && (
              <div className="text-center space-y-10">
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, duration: 0.7, type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 rounded-[22px] nova-gradient mx-auto flex items-center justify-center relative"
                >
                  <Activity className="w-10 h-10 text-primary-foreground" />
                  <motion.div
                    className="absolute inset-0 rounded-[22px]"
                    animate={{ boxShadow: ['0 0 0px hsl(var(--primary) / 0)', '0 0 40px hsl(var(--primary) / 0.3)', '0 0 0px hsl(var(--primary) / 0)'] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                </motion.div>
                <div>
                  <motion.h1 initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.3, duration: 0.6 }} className="text-[40px] font-extrabold font-display tracking-tight leading-none">
                    NovaFit
                  </motion.h1>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-muted-foreground mt-3 text-[15px]">
                    מעקב תזונה מונע בינה מלאכותית
                  </motion.p>
                </div>
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
                  בנה תוכנית מותאמת אישית על בסיס הרכב הגוף והמטרות שלך.
                </motion.p>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                  <Button shimmer onClick={next} className="w-full gap-3 h-[56px] text-[16px] rounded-2xl font-bold shadow-xl">
                    بואו נתחיל <ArrowLeft className="w-5 h-5" />
                  </Button>
                </motion.div>
              </div>
            )}

            {step === 'basics' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-[28px] font-extrabold font-display leading-tight">קצת עליך</h2>
                  <p className="text-sm text-muted-foreground mt-1.5">מידע בסיסי להתאמה אישית של התוכנית</p>
                </div>
                <div className="space-y-5">
                  <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">שם</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="השם שלך" className="h-[48px] rounded-xl bg-muted/50 border-0 focus-visible:ring-1 text-[15px] transition-all focus:shadow-md" />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">גיל</Label>
                    <Input type="number" value={age === 0 ? '' : age} onChange={e => { const val = parseInt(e.target.value); setAge(isNaN(val) || val <= 0 ? 0 : val); }} className="h-[48px] rounded-xl bg-muted/50 border-0 focus-visible:ring-1 text-[15px] transition-all focus:shadow-md" />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">מין</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['male', 'female'] as Gender[]).map(g => (
                         <motion.button key={g} onClick={() => setGender(g)} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                          className={`h-[52px] rounded-xl text-[14px] font-bold transition-all duration-300 btn-premium ${gender === g ? 'bg-primary text-primary-foreground shadow-[0_0_20px_hsla(var(--primary)/0.25)]' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
                          {g === 'male' ? 'זכר' : 'נקבה'}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </div>
                 <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={prev} className="h-[52px] w-[52px] rounded-xl p-0"><ArrowRight className="w-5 h-5" /></Button>
                  <Button shimmer onClick={next} className="flex-1 h-[52px] gap-2 rounded-xl font-bold text-[15px]" disabled={!name.trim() || age < 10 || age > 120}>המשך <ArrowLeft className="w-5 h-5" /></Button>
                </div>
              </div>
            )}

            {step === 'body' && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <motion.div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300 }}>
                      <Ruler className="w-4 h-4 text-primary" />
                    </motion.div>
                    <h2 className="text-[28px] font-extrabold font-display leading-tight">נתוני גוף</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">המידות הנוכחיות שלך</p>
                </div>
                <div className="space-y-5">
                  {[
                    { label: 'גובה (ס"מ)', value: heightCm === 0 ? '' : heightCm, set: setHeightCm },
                    { label: 'משקל נוכחי (ק"ג)', value: weightKg === 0 ? '' : weightKg, set: setWeightKg },
                    { label: 'משקל יעד (ק"ג)', value: targetWeightKg === 0 ? '' : targetWeightKg, set: setTargetWeightKg },
                  ].map((field, i) => (
                    <motion.div key={field.label} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }}>
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">{field.label}</Label>
                      <Input type="number" value={field.value} onChange={e => { const val = parseFloat(e.target.value); field.set(isNaN(val) || val <= 0 ? 0 : val); }} className="h-[48px] rounded-xl bg-muted/50 border-0 focus-visible:ring-1 text-[15px] transition-all focus:shadow-md" />
                    </motion.div>
                  ))}
                </div>
                 <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={prev} className="h-[52px] w-[52px] rounded-xl p-0"><ArrowRight className="w-5 h-5" /></Button>
                  <Button shimmer onClick={next} className="flex-1 h-[52px] gap-2 rounded-xl font-bold text-[15px]" disabled={heightCm < 50 || heightCm > 300 || weightKg < 20 || weightKg > 400 || targetWeightKg < 20 || targetWeightKg > 400}>המשך <ArrowLeft className="w-5 h-5" /></Button>
                </div>
              </div>
            )}

            {step === 'activity' && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <motion.div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center" initial={{ scale: 0, rotate: 45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300 }}>
                      <Dumbbell className="w-4 h-4 text-primary" />
                    </motion.div>
                    <h2 className="text-[28px] font-extrabold font-display leading-tight">רמת פעילות</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">כמה פעיל אתה בשבוע טיפוסי?</p>
                </div>
                <div className="space-y-2">
                  {activities.map((a, i) => (
                    <motion.button key={a.value} onClick={() => setActivityLevel(a.value)} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 + i * 0.05, duration: 0.4 }} whileHover={{ x: -4, scale: 1.01 }} whileTap={{ scale: 0.97 }}
                      className={`w-full text-right p-4 rounded-xl transition-all duration-300 flex items-center justify-between ${activityLevel === a.value ? 'bg-foreground text-background shadow-md' : 'bg-muted/40 text-foreground hover:bg-muted/60'}`}>
                      <div>
                        <div className={`font-semibold text-[14px] ${activityLevel === a.value ? 'text-background' : ''}`}>{a.label}</div>
                        <div className={`text-xs mt-0.5 ${activityLevel === a.value ? 'text-background/60' : 'text-muted-foreground'}`}>{a.desc}</div>
                      </div>
                      {activityLevel === a.value && <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500 }}><Check className="w-4 h-4" /></motion.div>}
                    </motion.button>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <motion.div whileTap={{ scale: 0.9 }}><Button variant="outline" onClick={prev} className="h-[52px] w-[52px] rounded-xl p-0"><ArrowRight className="w-5 h-5" /></Button></motion.div>
                  <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Button onClick={next} className="w-full h-[52px] gap-2 rounded-xl font-bold text-[15px] shadow-lg">המשך <ArrowLeft className="w-5 h-5" /></Button>
                  </motion.div>
                </div>
              </div>
            )}

            {step === 'goal' && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <motion.div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                      <Target className="w-4 h-4 text-primary" />
                    </motion.div>
                    <h2 className="text-[28px] font-extrabold font-display leading-tight">המטרה שלך</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">מה תרצה להשיג?</p>
                </div>
                <div className="space-y-2">
                  {([
                    { value: 'lose' as Goal, label: 'ירידה במשקל', desc: 'גירעון קלורי לשריפת שומן' },
                    { value: 'maintain' as Goal, label: 'שמירה על משקל', desc: 'אכילה בקלוריות תחזוקה' },
                    { value: 'gain' as Goal, label: 'בניית שריר', desc: 'עודף קלורי לבניית שריר' },
                  ]).map((g, i) => (
                    <motion.button key={g.value} onClick={() => setGoal(g.value)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }} whileHover={{ scale: 1.02, x: -4 }} whileTap={{ scale: 0.97 }}
                      className={`w-full text-right p-5 rounded-xl transition-all duration-300 flex items-center justify-between ${goal === g.value ? 'bg-foreground text-background shadow-lg' : 'bg-muted/40 text-foreground hover:bg-muted/60'}`}>
                      <div>
                        <div className={`font-bold text-[15px] ${goal === g.value ? 'text-background' : ''}`}>{g.label}</div>
                        <div className={`text-xs mt-0.5 ${goal === g.value ? 'text-background/60' : 'text-muted-foreground'}`}>{g.desc}</div>
                      </div>
                      {goal === g.value && <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500 }}><Check className="w-4 h-4" /></motion.div>}
                    </motion.button>
                  ))}
                </div>
                 <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={prev} className="h-[52px] w-[52px] rounded-xl p-0"><ArrowRight className="w-5 h-5" /></Button>
                  <Button shimmer onClick={next} className="flex-1 h-[52px] gap-2 rounded-xl font-bold text-[15px]">ראה את התוכנית <ArrowLeft className="w-5 h-5" /></Button>
                </div>
              </div>
            )}

            {step === 'preferences' && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <motion.div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300 }}>
                      <Heart className="w-4 h-4 text-primary" />
                    </motion.div>
                    <h2 className="text-[28px] font-extrabold font-display leading-tight">בואו נכיר</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">עזור למאמן ה-AI להכיר אותך יותר טוב</p>
                </div>
                <div className="space-y-5">
                  <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block flex items-center gap-1.5"><Heart className="w-3 h-3" /> אוכל אהוב</Label>
                    <Input value={favoriteFood} onChange={e => setFavoriteFood(e.target.value)} placeholder="למשל: סושי, פסטה, שווארמה..." className="h-[48px] rounded-xl bg-muted/50 border-0 focus-visible:ring-1 text-[15px] transition-all focus:shadow-md" />
                    <p className="text-[11px] text-muted-foreground mt-1.5">איזה אוכל הכי משמח אותך?</p>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }}>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block flex items-center gap-1.5"><Cookie className="w-3 h-3" /> חולשה תזונתית</Label>
                    <Input value={dietaryWeakness} onChange={e => setDietaryWeakness(e.target.value)} placeholder="למשל: שוקולד, פיצה, גלידה..." className="h-[48px] rounded-xl bg-muted/50 border-0 focus-visible:ring-1 text-[15px] transition-all focus:shadow-md" />
                    <p className="text-[11px] text-muted-foreground mt-1.5">הדבר שאתה לא יכול לעמוד בפניו 😅</p>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.26 }}>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block flex items-center gap-1.5"><Clock className="w-3 h-3" /> הרגלים יומיים</Label>
                    <textarea value={dailyHabits} onChange={e => setDailyHabits(e.target.value)} placeholder="למשל: מדלג על ארוחת בוקר, נשנש בלילה, אוכל צהריים ב-13:00..." rows={3}
                      className="flex w-full rounded-xl bg-muted/50 border-0 focus-visible:ring-1 text-[15px] transition-all focus:shadow-md px-3 py-3 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-ring resize-none" />
                    <p className="text-[11px] text-muted-foreground mt-1.5">מאמן ה-AI ישתמש בזה לייעוץ חכם יותר</p>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.32 }}>
                    <div className="pt-2 border-t border-border/50">
                      <Label className="text-[13px] font-bold text-foreground mb-4 block flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary" /> עיצוב אישיות המאמן</Label>
                      
                      <div className="space-y-5">
                        <div>
                          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">שם למאמן</Label>
                          <Input value={coachName} onChange={e => setCoachName(e.target.value)} placeholder="למשל: NovaFit AI, ארנון..." className="h-[48px] rounded-xl bg-muted/50 border-0 focus-visible:ring-1 text-[15px] transition-all focus:shadow-md" />
                          <p className="text-[11px] text-muted-foreground mt-1.5">איך תרצה לקרוא למאמן האישי שלך?</p>
                        </div>
                        
                        <div>
                          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">סגנון אימון (קשיחות)</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { value: 'עדין', label: 'עדין ומכיל' },
                              { value: 'בינוני', label: 'מאוזן (מומלץ)' },
                              { value: 'קשוח מאוד', label: 'קשוח בלי רחמים' },
                            ].map((option) => (
                              <button
                                key={option.value}
                                onClick={() => setChatHarshness(option.value)}
                                className={`py-2.5 rounded-lg text-[12px] font-bold transition-all duration-300 ${
                                  chatHarshness === option.value
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-2">איך תרצה שהמאמן ידבר איתך כשתפספס יעד?</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    מאמן התזונה ישתמש בהעדפות אלו כדי לתת לך <span className="text-foreground font-medium">המלצות ארוחות מותאמות אישית</span> ולעזור לך לנהל תשוקות בצורה חכמה.
                  </p>
                </motion.div>
                 <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={prev} className="h-[52px] w-[52px] rounded-xl p-0"><ArrowRight className="w-5 h-5" /></Button>
                  <Button shimmer onClick={next} className="flex-1 h-[52px] gap-2 rounded-xl font-bold text-[15px]">המשך <ArrowLeft className="w-5 h-5" /></Button>
                </div>
              </div>
            )}

            {step === 'health' && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <motion.div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300 }}>
                      <Stethoscope className="w-4 h-4 text-primary" />
                    </motion.div>
                    <h2 className="text-[28px] font-extrabold font-display leading-tight">מידע בריאותי</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">משהו שמאמן ה-AI צריך לדעת</p>
                </div>
                <div className="space-y-5">
                  <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block flex items-center gap-1.5"><Stethoscope className="w-3 h-3" /> מצבים רפואיים ואלרגיות</Label>
                    <textarea value={medicalConditions} onChange={e => setMedicalConditions(e.target.value)} placeholder="למשל: סוכרת סוג 2, צליאק, אי-סבילות ללקטוז, אלרגיה לאגוזים..." rows={4}
                      className="flex w-full rounded-xl bg-muted/50 border-0 focus-visible:ring-1 text-[15px] transition-all focus:shadow-md px-3 py-3 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-ring resize-none" />
                    <p className="text-[11px] text-muted-foreground mt-1.5">כלול מצבים רפואיים, אלרגיות, רגישויות או תרופות שמשפיעות על התזונה</p>
                  </motion.div>
                </div>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    מידע זה עוזר למאמן ה-AI לתת <span className="text-foreground font-medium">ייעוץ בטוח ומותאם אישית</span>. הוא לעולם לא ימליץ על מזונות שמתנגשים עם הצרכים הרפואיים שלך. ניתן לעדכן בכל עת בהגדרות.
                  </p>
                </motion.div>
                 <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={prev} className="h-[52px] w-[52px] rounded-xl p-0"><ArrowRight className="w-5 h-5" /></Button>
                  <Button shimmer onClick={next} className="flex-1 h-[52px] gap-2 rounded-xl font-bold text-[15px]">המשך <ArrowLeft className="w-5 h-5" /></Button>
                </div>
              </div>
            )}

            {step === 'timeline' && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <motion.div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                      <Calendar className="w-4 h-4 text-primary" />
                    </motion.div>
                    <h2 className="text-[28px] font-extrabold font-display leading-tight">ציר זמן</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">הגדר דד-ליין להגיע למשקל היעד</p>
                </div>
                {goal !== 'maintain' && weightKg !== targetWeightKg && (
                  <div className="space-y-5">
                    <motion.button onClick={() => setUseTimeline(!useTimeline)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      className={`w-full text-right p-5 rounded-xl transition-all duration-300 flex items-center justify-between ${useTimeline ? 'bg-foreground text-background shadow-lg' : 'bg-muted/40 text-foreground hover:bg-muted/60'}`}>
                      <div>
                        <div className={`font-bold text-[15px] ${useTimeline ? 'text-background' : ''}`}>הגדר דד-ליין</div>
                        <div className={`text-xs mt-0.5 ${useTimeline ? 'text-background/60' : 'text-muted-foreground'}`}>חישוב אוטומטי של קלוריות יומיות להשגת היעד בזמן</div>
                      </div>
                      {useTimeline && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}><Check className="w-4 h-4" /></motion.div>}
                    </motion.button>
                    {useTimeline && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
                        <div className="space-y-3 mt-4">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block text-center mb-6">בחר קצב {isLoss ? 'ירידה' : 'עלייה'}</Label>
                          
                          <div className="px-2 space-y-6">
                            <div className="flex items-end justify-center gap-1 mb-2">
                              <span className="text-4xl font-extrabold font-display leading-none text-primary">{weeklyPaceKg.toFixed(2)}</span>
                              <span className="text-sm text-muted-foreground font-medium pb-1">ק"ג בשבוע</span>
                            </div>
                            
                            <Slider 
                              value={[weeklyPaceKg]} 
                              min={0.25} 
                              max={2.5} 
                              step={0.05} 
                              onValueChange={(vals) => setWeeklyPaceKg(vals[0])}
                              className="w-full"
                            />
                            
                            <div className="flex justify-between text-[11px] text-muted-foreground font-medium px-1">
                              <span>0.25 ק"ג (רגוע)</span>
                              <span>2.5 ק"ג (קיצוני)</span>
                            </div>
                          </div>

                          <div className="bg-muted/40 rounded-xl p-4 mt-6 text-center">
                            <p className="text-xs text-muted-foreground mb-1">תאריך יעד משוער</p>
                            <p className="text-lg font-bold text-foreground">{format(addDays(new Date(), calculatedDays), 'd בMMMM, yyyy')}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">בעוד {calculatedDays} ימים</p>
                          </div>
                        </div>
                        <motion.div className="nova-card p-4 space-y-2 mt-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">יעד יומי מותאם</span>
                            <span className="font-bold tabular-nums text-primary">{adaptive.dailyCalorieTarget} קק"ל</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{isLoss ? 'גירעון יומי' : 'עודף יומי'}</span>
                            <span className="font-medium tabular-nums">{Math.abs(adaptive.dailyDeficit)} קק"ל</span>
                          </div>
                        </motion.div>
                        {!adaptive.isSafe && (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 mt-4">
                            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-destructive">קצב חריג או מסוכן מדי</p>
                              <p className="text-xs text-muted-foreground mt-1">{adaptive.unsafeReason}</p>
                              {adaptive.safestDate && (
                                <p className="text-xs mt-2">
                                  אנא בחר קצב רגוע יותר כדי שהגוף יוכל לעמוד ביעד בבטחה.
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}
                {(goal === 'maintain' || weightKg === targetWeightKg) && (
                  <div className="text-center py-8"><p className="text-sm text-muted-foreground">יעדי ציר זמן זמינים רק למטרות ירידה או עלייה במשקל השונות מהמשקל הנוכחי.</p></div>
                )}
                 <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={prev} className="h-[52px] w-[52px] rounded-xl p-0"><ArrowRight className="w-5 h-5" /></Button>
                  <Button shimmer onClick={next} className="flex-1 h-[52px] gap-2 rounded-xl font-bold text-[15px]" disabled={useTimeline && !adaptive.isSafe}>ראה את התוכנית <ArrowLeft className="w-5 h-5" /></Button>
                </div>
              </div>
            )}

            {step === 'results' && (
              <div className="space-y-8">
                <div className="text-center">
                  <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="w-14 h-14 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-5">
                    <Check className="w-7 h-7 text-primary" />
                  </motion.div>
                  <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-[28px] font-extrabold font-display">
                    התוכנית שלך
                  </motion.h2>
                  <p className="text-sm text-muted-foreground mt-1">יעדי תזונה יומיים מותאמים אישית</p>
                </div>
                <motion.div initial={{ scale: 0.85, opacity: 0, rotateY: 15 }} animate={{ scale: 1, opacity: 1, rotateY: 0 }} transition={{ delay: 0.2, duration: 0.6, ease: [0.32, 0.72, 0, 1] }} className="nova-card p-8 text-center nova-breathe">
                  <motion.div className="text-[48px] font-extrabold font-display tracking-tight nova-text-gradient leading-none" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}>
                    {finalCalories}
                  </motion.div>
                  <div className="text-sm text-muted-foreground mt-2 font-medium">
                    {useTimeline ? 'קלוריות מותאמות ליום' : 'קלוריות ליום'}
                  </div>
                </motion.div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: finalMacros.protein, label: 'חלבון', color: 'text-nova-protein', unit: 'גר׳' },
                    { value: finalMacros.carbs, label: 'פחמימות', color: 'text-nova-carbs', unit: 'גר׳' },
                    { value: finalMacros.fats, label: 'שומנים', color: 'text-nova-fats', unit: 'גר׳' },
                  ].map((m, i) => (
                    <motion.div key={m.label} initial={{ opacity: 0, y: 16, rotateX: 20 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }} whileHover={{ scale: 1.05, y: -3 }} className="nova-card p-4 text-center">
                      <div className={`text-xl font-bold font-display ${m.color}`}>{m.value}{m.unit}</div>
                      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1.5">{m.label}</div>
                    </motion.div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {[
                    { label: 'חילוף חומרים בסיסי', value: `${bmr} קק"ל` },
                    { label: 'הוצאה יומית כוללת', value: `${tdee} קק"ל` },
                  ].map((item, i) => (
                    <motion.div key={item.label} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.08 }} className="flex justify-between p-3.5 rounded-xl bg-muted/40 text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-semibold tabular-nums">{item.value}</span>
                    </motion.div>
                  ))}
                </div>
                 <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={prev} className="h-[52px] w-[52px] rounded-xl p-0"><ArrowRight className="w-5 h-5" /></Button>
                  <Button shimmer onClick={finish} className="flex-1 h-[52px] gap-2 rounded-xl font-bold text-[15px] shadow-xl">
                    התחל מעקב <ArrowLeft className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
