import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Activity, Target, Dumbbell, Ruler, Check, Sparkles, Calendar, AlertTriangle, Heart, Cookie, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserProfile, Gender, ActivityLevel, Goal } from '@/lib/types';
import { calculateBMR, calculateTDEE, calculateCalorieTarget, calculateMacros } from '@/lib/calculations';
import { calculateAdaptiveTargets } from '@/lib/adaptive-engine';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';

const STEPS = ['welcome', 'basics', 'body', 'activity', 'goal', 'preferences', 'timeline', 'results'] as const;
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
  const [targetDays, setTargetDays] = useState(90);
  const [useTimeline, setUseTimeline] = useState(false);
  const [favoriteFood, setFavoriteFood] = useState('');
  const [dietaryWeakness, setDietaryWeakness] = useState('');
  const [dailyHabits, setDailyHabits] = useState('');

  const stepIndex = STEPS.indexOf(step);
  const next = () => setStep(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)]);
  const prev = () => setStep(STEPS[Math.max(stepIndex - 1, 0)]);

  const bmr = calculateBMR(gender, weightKg, heightCm, age);
  const tdee = calculateTDEE(bmr, activityLevel);
  const dailyCalorieTarget = calculateCalorieTarget(tdee, goal);
  const macros = calculateMacros(dailyCalorieTarget, goal);

  const targetDateStr = useTimeline ? addDays(new Date(), targetDays).toISOString().slice(0, 10) : null;

  // Build a temporary profile for adaptive calculation
  const tempProfile: UserProfile = {
    name, age, gender, heightCm, weightKg, targetWeightKg,
    activityLevel, goal, bmr, tdee,
    dailyCalorieTarget, proteinTarget: macros.protein, carbsTarget: macros.carbs, fatsTarget: macros.fats,
    targetDate: targetDateStr,
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
      favoriteFood, dietaryWeakness, dailyHabits,
    });
  };

  const activities: { value: ActivityLevel; label: string; desc: string }[] = [
    { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
    { value: 'light', label: 'Lightly Active', desc: 'Exercise 1–3 days/week' },
    { value: 'moderate', label: 'Moderate', desc: 'Exercise 3–5 days/week' },
    { value: 'active', label: 'Active', desc: 'Exercise 6–7 days/week' },
    { value: 'very_active', label: 'Very Active', desc: 'Hard exercise daily' },
  ];

  const pageVariants = {
    enter: { x: 50, opacity: 0, filter: 'blur(8px)' },
    center: { x: 0, opacity: 1, filter: 'blur(0px)' },
    exit: { x: -50, opacity: 0, filter: 'blur(8px)' },
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 overflow-hidden relative">
      {/* Ambient background */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-[0.03] top-[-200px] left-[-100px]"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent)' }}
        animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Progress */}
        {step !== 'welcome' && (
          <motion.div
            className="flex gap-1.5 mb-12"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {STEPS.slice(1).map((s, i) => (
              <div key={s} className="h-[3px] flex-1 rounded-full overflow-hidden bg-border">
                <motion.div
                  className="h-full bg-foreground rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: i <= STEPS.slice(1).indexOf(step) ? 1 : 0 }}
                  transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                  style={{ transformOrigin: 'left' }}
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
                    animate={{
                      boxShadow: [
                        '0 0 0px hsl(var(--primary) / 0)',
                        '0 0 40px hsl(var(--primary) / 0.3)',
                        '0 0 0px hsl(var(--primary) / 0)',
                      ],
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                </motion.div>
                <div>
                  <motion.h1
                    initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="text-[40px] font-extrabold font-display tracking-tight leading-none"
                  >
                    NovaFit
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-muted-foreground mt-3 text-[15px]"
                  >
                    AI-powered nutrition tracking
                  </motion.p>
                </div>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto"
                >
                  Build a personalized plan based on your body composition and goals.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Button onClick={next} className="w-full gap-2.5 h-[52px] text-[15px] rounded-2xl font-semibold transition-all shadow-lg hover:shadow-xl">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              </div>
            )}

            {step === 'basics' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-[28px] font-extrabold font-display leading-tight">About You</h2>
                  <p className="text-sm text-muted-foreground mt-1.5">Basic information to personalize your plan</p>
                </div>
                <div className="space-y-5">
                  <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Name</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="h-[48px] rounded-xl bg-muted/50 border-0 focus-visible:ring-1 text-[15px] transition-all focus:shadow-md" />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Age</Label>
                    <Input type="number" value={age} onChange={e => setAge(+e.target.value)} className="h-[48px] rounded-xl bg-muted/50 border-0 focus-visible:ring-1 text-[15px] transition-all focus:shadow-md" />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Gender</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['male', 'female'] as Gender[]).map(g => (
                        <motion.button key={g} onClick={() => setGender(g)}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.95 }}
                          className={`h-[48px] rounded-xl text-[14px] font-semibold transition-all duration-300 ${
                            gender === g
                              ? 'bg-foreground text-background shadow-md'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {g === 'male' ? 'Male' : 'Female'}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </div>
                <div className="flex gap-3 pt-2">
                  <motion.div whileTap={{ scale: 0.9 }}>
                    <Button variant="outline" onClick={prev} className="h-[48px] w-[48px] rounded-xl p-0"><ArrowLeft className="w-4 h-4" /></Button>
                  </motion.div>
                  <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Button onClick={next} className="w-full h-[48px] gap-2 rounded-xl font-semibold text-[14px] shadow-lg" disabled={!name}>Continue <ArrowRight className="w-4 h-4" /></Button>
                  </motion.div>
                </div>
              </div>
            )}

            {step === 'body' && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <motion.div
                      className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <Ruler className="w-4 h-4 text-primary" />
                    </motion.div>
                    <h2 className="text-[28px] font-extrabold font-display leading-tight">Body Stats</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">Your current measurements</p>
                </div>
                <div className="space-y-5">
                  {[
                    { label: 'Height (cm)', value: heightCm, set: setHeightCm },
                    { label: 'Current Weight (kg)', value: weightKg, set: setWeightKg },
                    { label: 'Target Weight (kg)', value: targetWeightKg, set: setTargetWeightKg },
                  ].map((field, i) => (
                    <motion.div
                      key={field.label}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.06 }}
                    >
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">{field.label}</Label>
                      <Input type="number" value={field.value} onChange={e => field.set(+e.target.value)} className="h-[48px] rounded-xl bg-muted/50 border-0 focus-visible:ring-1 text-[15px] transition-all focus:shadow-md" />
                    </motion.div>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <motion.div whileTap={{ scale: 0.9 }}>
                    <Button variant="outline" onClick={prev} className="h-[48px] w-[48px] rounded-xl p-0"><ArrowLeft className="w-4 h-4" /></Button>
                  </motion.div>
                  <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Button onClick={next} className="w-full h-[48px] gap-2 rounded-xl font-semibold text-[14px] shadow-lg">Continue <ArrowRight className="w-4 h-4" /></Button>
                  </motion.div>
                </div>
              </div>
            )}

            {step === 'activity' && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <motion.div
                      className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"
                      initial={{ scale: 0, rotate: 45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <Dumbbell className="w-4 h-4 text-primary" />
                    </motion.div>
                    <h2 className="text-[28px] font-extrabold font-display leading-tight">Activity Level</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">How active are you on a typical week?</p>
                </div>
                <div className="space-y-2">
                  {activities.map((a, i) => (
                    <motion.button
                      key={a.value}
                      onClick={() => setActivityLevel(a.value)}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 + i * 0.05, duration: 0.4 }}
                      whileHover={{ x: 4, scale: 1.01 }}
                      whileTap={{ scale: 0.97 }}
                      className={`w-full text-left p-4 rounded-xl transition-all duration-300 flex items-center justify-between ${
                        activityLevel === a.value
                          ? 'bg-foreground text-background shadow-md'
                          : 'bg-muted/40 text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <div>
                        <div className={`font-semibold text-[14px] ${activityLevel === a.value ? 'text-background' : ''}`}>{a.label}</div>
                        <div className={`text-xs mt-0.5 ${activityLevel === a.value ? 'text-background/60' : 'text-muted-foreground'}`}>{a.desc}</div>
                      </div>
                      {activityLevel === a.value && (
                        <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500 }}>
                          <Check className="w-4 h-4" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <motion.div whileTap={{ scale: 0.9 }}>
                    <Button variant="outline" onClick={prev} className="h-[48px] w-[48px] rounded-xl p-0"><ArrowLeft className="w-4 h-4" /></Button>
                  </motion.div>
                  <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Button onClick={next} className="w-full h-[48px] gap-2 rounded-xl font-semibold text-[14px] shadow-lg">Continue <ArrowRight className="w-4 h-4" /></Button>
                  </motion.div>
                </div>
              </div>
            )}

            {step === 'goal' && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <motion.div
                      className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <Target className="w-4 h-4 text-primary" />
                    </motion.div>
                    <h2 className="text-[28px] font-extrabold font-display leading-tight">Your Goal</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">What would you like to achieve?</p>
                </div>
                <div className="space-y-2">
                  {([
                    { value: 'lose' as Goal, label: 'Lose Weight', desc: 'Calorie deficit for fat loss' },
                    { value: 'maintain' as Goal, label: 'Maintain Weight', desc: 'Eat at maintenance calories' },
                    { value: 'gain' as Goal, label: 'Build Muscle', desc: 'Calorie surplus for muscle gain' },
                  ]).map((g, i) => (
                    <motion.button
                      key={g.value}
                      onClick={() => setGoal(g.value)}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.08 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.97 }}
                      className={`w-full text-left p-5 rounded-xl transition-all duration-300 flex items-center justify-between ${
                        goal === g.value
                          ? 'bg-foreground text-background shadow-lg'
                          : 'bg-muted/40 text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <div>
                        <div className={`font-bold text-[15px] ${goal === g.value ? 'text-background' : ''}`}>{g.label}</div>
                        <div className={`text-xs mt-0.5 ${goal === g.value ? 'text-background/60' : 'text-muted-foreground'}`}>{g.desc}</div>
                      </div>
                      {goal === g.value && (
                        <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500 }}>
                          <Check className="w-4 h-4" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <motion.div whileTap={{ scale: 0.9 }}>
                    <Button variant="outline" onClick={prev} className="h-[48px] w-[48px] rounded-xl p-0"><ArrowLeft className="w-4 h-4" /></Button>
                  </motion.div>
                  <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Button onClick={next} className="w-full h-[48px] gap-2 rounded-xl font-semibold text-[14px] shadow-lg">See My Plan <ArrowRight className="w-4 h-4" /></Button>
                  </motion.div>
                </div>
              </div>
            )}

            {step === 'timeline' && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <motion.div
                      className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <Calendar className="w-4 h-4 text-primary" />
                    </motion.div>
                    <h2 className="text-[28px] font-extrabold font-display leading-tight">Timeline</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">Set a deadline to reach your target weight</p>
                </div>

                {goal !== 'maintain' && (
                  <div className="space-y-5">
                    <motion.button
                      onClick={() => setUseTimeline(!useTimeline)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className={`w-full text-left p-5 rounded-xl transition-all duration-300 flex items-center justify-between ${
                        useTimeline
                          ? 'bg-foreground text-background shadow-lg'
                          : 'bg-muted/40 text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <div>
                        <div className={`font-bold text-[15px] ${useTimeline ? 'text-background' : ''}`}>Set a deadline</div>
                        <div className={`text-xs mt-0.5 ${useTimeline ? 'text-background/60' : 'text-muted-foreground'}`}>
                          Auto-calculate daily calories to hit your target on time
                        </div>
                      </div>
                      {useTimeline && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}>
                          <Check className="w-4 h-4" />
                        </motion.div>
                      )}
                    </motion.button>

                    {useTimeline && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4"
                      >
                        <div>
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Days from now</Label>
                            <Input
                              type="number"
                              value={targetDays || ''}
                              onChange={e => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val > 0) {
                                  setTargetDays(val);
                                }
                              }}
                              min={1}
                              className="h-[48px] rounded-xl bg-muted/50 border-0 focus-visible:ring-1 text-[15px]"
                            />
                          <p className="text-xs text-muted-foreground mt-2">
                            Target date: <span className="text-foreground font-medium">{format(addDays(new Date(), targetDays), 'MMM d, yyyy')}</span>
                          </p>
                        </div>

                        <motion.div
                          className="nova-card p-4 space-y-2"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Adaptive daily target</span>
                            <span className="font-bold tabular-nums">{adaptive.dailyCalorieTarget} kcal</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Daily deficit</span>
                            <span className="font-medium tabular-nums">{adaptive.dailyDeficit} kcal</span>
                          </div>
                        </motion.div>

                        {!adaptive.isSafe && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20"
                          >
                            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-destructive">Unsafe timeline</p>
                              <p className="text-xs text-muted-foreground mt-1">{adaptive.unsafeReason}</p>
                              {adaptive.safestDate && (
                                <p className="text-xs mt-2">
                                  Suggested safe date: <span className="text-foreground font-semibold">{format(parseISO(adaptive.safestDate), 'MMM d, yyyy')}</span>
                                  <button
                                    onClick={() => {
                                      const safeDays = differenceInDays(parseISO(adaptive.safestDate!), new Date());
                                      setTargetDays(safeDays);
                                    }}
                                    className="ml-2 text-primary underline font-medium"
                                  >
                                    Use this
                                  </button>
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}

                {goal === 'maintain' && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Timeline targets are available for weight loss and gain goals.</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <motion.div whileTap={{ scale: 0.9 }}>
                    <Button variant="outline" onClick={prev} className="h-[48px] w-[48px] rounded-xl p-0"><ArrowLeft className="w-4 h-4" /></Button>
                  </motion.div>
                  <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Button onClick={next} className="w-full h-[48px] gap-2 rounded-xl font-semibold text-[14px] shadow-lg">See My Plan <ArrowRight className="w-4 h-4" /></Button>
                  </motion.div>
                </div>
              </div>
            )}

            {step === 'results' && (
              <div className="space-y-8">
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="w-14 h-14 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-5"
                  >
                    <Check className="w-7 h-7 text-primary" />
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-[28px] font-extrabold font-display"
                  >
                    Your Plan
                  </motion.h2>
                  <p className="text-sm text-muted-foreground mt-1">Personalized daily nutrition targets</p>
                </div>

                <motion.div
                  initial={{ scale: 0.85, opacity: 0, rotateY: 15 }}
                  animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                  transition={{ delay: 0.2, duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                  className="nova-card p-8 text-center nova-breathe"
                >
                  <motion.div
                    className="text-[48px] font-extrabold font-display tracking-tight nova-text-gradient leading-none"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                  >
                    {finalCalories}
                  </motion.div>
                  <div className="text-sm text-muted-foreground mt-2 font-medium">
                    {useTimeline ? 'adaptive calories per day' : 'calories per day'}
                  </div>
                </motion.div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: finalMacros.protein, label: 'Protein', color: 'text-nova-protein', unit: 'g' },
                    { value: finalMacros.carbs, label: 'Carbs', color: 'text-nova-carbs', unit: 'g' },
                    { value: finalMacros.fats, label: 'Fats', color: 'text-nova-fats', unit: 'g' },
                  ].map((m, i) => (
                    <motion.div
                      key={m.label}
                      initial={{ opacity: 0, y: 16, rotateX: 20 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                      whileHover={{ scale: 1.05, y: -3 }}
                      className="nova-card p-4 text-center"
                    >
                      <div className={`text-xl font-bold font-display ${m.color}`}>{m.value}{m.unit}</div>
                      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1.5">{m.label}</div>
                    </motion.div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  {[
                    { label: 'Basal Metabolic Rate', value: `${bmr} kcal` },
                    { label: 'Total Daily Expenditure', value: `${tdee} kcal` },
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.08 }}
                      className="flex justify-between p-3.5 rounded-xl bg-muted/40 text-sm"
                    >
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-semibold tabular-nums">{item.value}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <motion.div whileTap={{ scale: 0.9 }}>
                    <Button variant="outline" onClick={prev} className="h-[48px] w-[48px] rounded-xl p-0"><ArrowLeft className="w-4 h-4" /></Button>
                  </motion.div>
                  <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Button onClick={finish} className="w-full h-[48px] gap-2 rounded-xl font-semibold text-[14px] shadow-lg">
                      Start Tracking <ArrowRight className="w-4 h-4" />
                    </Button>
                  </motion.div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
