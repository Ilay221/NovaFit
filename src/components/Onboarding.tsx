import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Flame, Target, Dumbbell, Scale, Ruler, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserProfile, Gender, ActivityLevel, Goal } from '@/lib/types';
import { calculateBMR, calculateTDEE, calculateCalorieTarget, calculateMacros } from '@/lib/calculations';

const STEPS = ['welcome', 'basics', 'body', 'activity', 'goal', 'results'] as const;
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

  const stepIndex = STEPS.indexOf(step);
  const next = () => setStep(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)]);
  const prev = () => setStep(STEPS[Math.max(stepIndex - 1, 0)]);

  const bmr = calculateBMR(gender, weightKg, heightCm, age);
  const tdee = calculateTDEE(bmr, activityLevel);
  const dailyCalorieTarget = calculateCalorieTarget(tdee, goal);
  const macros = calculateMacros(dailyCalorieTarget, goal);

  const finish = () => {
    onComplete({
      name, age, gender, heightCm, weightKg, targetWeightKg,
      activityLevel, goal, bmr, tdee, dailyCalorieTarget,
      ...macros,
      proteinTarget: macros.protein, carbsTarget: macros.carbs, fatsTarget: macros.fats,
    });
  };

  const activities: { value: ActivityLevel; label: string; desc: string; emoji: string }[] = [
    { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise', emoji: '🪑' },
    { value: 'light', label: 'Lightly Active', desc: 'Exercise 1-3 days/week', emoji: '🚶' },
    { value: 'moderate', label: 'Moderate', desc: 'Exercise 3-5 days/week', emoji: '🏃' },
    { value: 'active', label: 'Active', desc: 'Exercise 6-7 days/week', emoji: '💪' },
    { value: 'very_active', label: 'Very Active', desc: 'Hard exercise daily', emoji: '🏋️' },
  ];

  const pageVariants = {
    enter: { x: 60, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -60, opacity: 0 },
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        {/* Progress */}
        {step !== 'welcome' && (
          <div className="flex gap-1.5 mb-10">
            {STEPS.slice(1).map((s, i) => (
              <motion.div
                key={s}
                className="h-1 flex-1 rounded-full overflow-hidden bg-muted"
              >
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: i <= STEPS.slice(1).indexOf(step) ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                  style={{ transformOrigin: 'left' }}
                />
              </motion.div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {step === 'welcome' && (
              <div className="text-center space-y-8">
                <motion.div
                  initial={{ scale: 0.3, opacity: 0, rotate: -20 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                  className="w-24 h-24 rounded-3xl nova-gradient mx-auto flex items-center justify-center nova-glow"
                >
                  <Flame className="w-12 h-12 text-primary-foreground" />
                </motion.div>
                <div>
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-5xl font-extrabold font-display tracking-tight"
                  >
                    NovaFit
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                    className="text-muted-foreground mt-2 font-medium"
                  >
                    Your AI-powered health companion
                  </motion.p>
                </div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto"
                >
                  Let's build your personalized nutrition plan based on your body and goals.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                >
                  <Button onClick={next} className="w-full gap-2 h-14 text-base rounded-2xl font-semibold active:scale-[0.98] transition-transform">
                    Get Started <ArrowRight className="w-5 h-5" />
                  </Button>
                </motion.div>
              </div>
            )}

            {step === 'basics' && (
              <div className="space-y-7">
                <div>
                  <h2 className="text-3xl font-extrabold font-display">About You</h2>
                  <p className="text-sm text-muted-foreground mt-1">Basic info to personalize your plan</p>
                </div>
                <div className="space-y-5">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="mt-2 h-12 rounded-2xl bg-muted/40 border-0 focus-visible:ring-1 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Age</Label>
                    <Input type="number" value={age} onChange={e => setAge(+e.target.value)} className="mt-2 h-12 rounded-2xl bg-muted/40 border-0 focus-visible:ring-1 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gender</Label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {(['male', 'female'] as Gender[]).map(g => (
                        <button key={g} onClick={() => setGender(g)}
                          className={`h-12 rounded-2xl text-sm font-semibold transition-all duration-200 active:scale-95 ${
                            gender === g
                              ? 'bg-primary text-primary-foreground shadow-md'
                              : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {g === 'male' ? '♂ Male' : '♀ Female'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={prev} className="h-12 w-12 rounded-2xl p-0 active:scale-95"><ArrowLeft className="w-5 h-5" /></Button>
                  <Button onClick={next} className="flex-1 h-12 gap-2 rounded-2xl font-semibold active:scale-[0.98] transition-transform" disabled={!name}>Next <ArrowRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}

            {step === 'body' && (
              <div className="space-y-7">
                <div>
                  <h2 className="text-3xl font-extrabold font-display flex items-center gap-3"><Ruler className="w-7 h-7 text-primary" /> Body Stats</h2>
                  <p className="text-sm text-muted-foreground mt-1">Your current measurements</p>
                </div>
                <div className="space-y-5">
                  {[
                    { label: 'Height (cm)', value: heightCm, set: setHeightCm },
                    { label: 'Current Weight (kg)', value: weightKg, set: setWeightKg },
                    { label: 'Target Weight (kg)', value: targetWeightKg, set: setTargetWeightKg },
                  ].map(field => (
                    <div key={field.label}>
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{field.label}</Label>
                      <Input type="number" value={field.value} onChange={e => field.set(+e.target.value)} className="mt-2 h-12 rounded-2xl bg-muted/40 border-0 focus-visible:ring-1 text-sm" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={prev} className="h-12 w-12 rounded-2xl p-0 active:scale-95"><ArrowLeft className="w-5 h-5" /></Button>
                  <Button onClick={next} className="flex-1 h-12 gap-2 rounded-2xl font-semibold active:scale-[0.98] transition-transform">Next <ArrowRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}

            {step === 'activity' && (
              <div className="space-y-7">
                <div>
                  <h2 className="text-3xl font-extrabold font-display flex items-center gap-3"><Dumbbell className="w-7 h-7 text-primary" /> Activity</h2>
                  <p className="text-sm text-muted-foreground mt-1">How active are you?</p>
                </div>
                <div className="space-y-2">
                  {activities.map(a => (
                    <button key={a.value} onClick={() => setActivityLevel(a.value)}
                      className={`w-full text-left p-4 rounded-2xl transition-all duration-200 active:scale-[0.98] ${
                        activityLevel === a.value
                          ? 'bg-primary/10 ring-2 ring-primary/30'
                          : 'bg-muted/40 hover:bg-muted/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{a.emoji}</span>
                        <div>
                          <div className="font-semibold text-sm">{a.label}</div>
                          <div className="text-xs text-muted-foreground">{a.desc}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={prev} className="h-12 w-12 rounded-2xl p-0 active:scale-95"><ArrowLeft className="w-5 h-5" /></Button>
                  <Button onClick={next} className="flex-1 h-12 gap-2 rounded-2xl font-semibold active:scale-[0.98] transition-transform">Next <ArrowRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}

            {step === 'goal' && (
              <div className="space-y-7">
                <div>
                  <h2 className="text-3xl font-extrabold font-display flex items-center gap-3"><Target className="w-7 h-7 text-primary" /> Your Goal</h2>
                  <p className="text-sm text-muted-foreground mt-1">What would you like to achieve?</p>
                </div>
                <div className="space-y-3">
                  {([
                    { value: 'lose' as Goal, label: 'Lose Weight', desc: 'Calorie deficit for fat loss', emoji: '🔥' },
                    { value: 'maintain' as Goal, label: 'Maintain Weight', desc: 'Eat at maintenance calories', emoji: '⚖️' },
                    { value: 'gain' as Goal, label: 'Build Muscle', desc: 'Calorie surplus for muscle gain', emoji: '💪' },
                  ]).map(g => (
                    <button key={g.value} onClick={() => setGoal(g.value)}
                      className={`w-full text-left p-5 rounded-2xl transition-all duration-200 active:scale-[0.98] ${
                        goal === g.value
                          ? 'bg-primary/10 ring-2 ring-primary/30'
                          : 'bg-muted/40 hover:bg-muted/60'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{g.emoji}</span>
                        <div>
                          <div className="font-bold text-base">{g.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{g.desc}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={prev} className="h-12 w-12 rounded-2xl p-0 active:scale-95"><ArrowLeft className="w-5 h-5" /></Button>
                  <Button onClick={next} className="flex-1 h-12 gap-2 rounded-2xl font-semibold active:scale-[0.98] transition-transform">See My Plan <ArrowRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}

            {step === 'results' && (
              <div className="space-y-7">
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-4"
                  >
                    <Sparkles className="w-8 h-8 text-primary" />
                  </motion.div>
                  <h2 className="text-3xl font-extrabold font-display">Your Plan</h2>
                  <p className="text-sm text-muted-foreground mt-1">Personalized daily targets</p>
                </div>

                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="nova-card p-6 text-center"
                >
                  <div className="text-5xl font-extrabold font-display nova-text-gradient">{dailyCalorieTarget}</div>
                  <div className="text-sm text-muted-foreground mt-1 font-medium">Daily Calories</div>
                </motion.div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: macros.protein, label: 'Protein', color: 'text-nova-protein', unit: 'g' },
                    { value: macros.carbs, label: 'Carbs', color: 'text-nova-carbs', unit: 'g' },
                    { value: macros.fats, label: 'Fats', color: 'text-nova-fats', unit: 'g' },
                  ].map(m => (
                    <div key={m.label} className="nova-card p-4 text-center">
                      <div className={`text-xl font-bold font-display ${m.color}`}>{m.value}{m.unit}</div>
                      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">{m.label}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {[
                    { label: 'BMR', value: `${bmr} kcal` },
                    { label: 'TDEE', value: `${tdee} kcal` },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between p-3 rounded-2xl bg-muted/40 text-sm">
                      <span className="text-muted-foreground font-medium">{item.label}</span>
                      <span className="font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={prev} className="h-12 w-12 rounded-2xl p-0 active:scale-95"><ArrowLeft className="w-5 h-5" /></Button>
                  <Button onClick={finish} className="flex-1 h-12 gap-2 rounded-2xl font-semibold active:scale-[0.98] transition-transform">
                    Start Tracking <Flame className="w-5 h-5" />
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
