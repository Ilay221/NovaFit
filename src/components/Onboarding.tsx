import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Flame, Target, Dumbbell, Scale, User, Ruler } from 'lucide-react';
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

  const activities: { value: ActivityLevel; label: string; desc: string }[] = [
    { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
    { value: 'light', label: 'Lightly Active', desc: 'Exercise 1-3 days/week' },
    { value: 'moderate', label: 'Moderate', desc: 'Exercise 3-5 days/week' },
    { value: 'active', label: 'Active', desc: 'Exercise 6-7 days/week' },
    { value: 'very_active', label: 'Very Active', desc: 'Hard exercise daily' },
  ];

  const pageVariants = {
    enter: { x: 40, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -40, opacity: 0 },
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress */}
        {step !== 'welcome' && (
          <div className="flex gap-1.5 mb-8">
            {STEPS.slice(1).map((s, i) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= STEPS.slice(1).indexOf(step) ? 'bg-primary' : 'bg-muted'
              }`} />
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
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {step === 'welcome' && (
              <div className="text-center space-y-6">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="w-20 h-20 rounded-2xl nova-gradient mx-auto flex items-center justify-center nova-glow"
                >
                  <Flame className="w-10 h-10 text-primary-foreground" />
                </motion.div>
                <div>
                  <h1 className="text-4xl font-bold font-display tracking-tight">NovaFit</h1>
                  <p className="text-muted-foreground mt-2">Your AI-powered health companion</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Let's set up your personalized nutrition plan. We'll calculate your ideal daily intake based on your body and goals.
                </p>
                <Button onClick={next} className="w-full gap-2 h-12 text-base">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {step === 'basics' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold font-display">About You</h2>
                  <p className="text-sm text-muted-foreground">Basic information to personalize your plan</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="mt-1.5 h-11" />
                  </div>
                  <div>
                    <Label>Age</Label>
                    <Input type="number" value={age} onChange={e => setAge(+e.target.value)} className="mt-1.5 h-11" />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <div className="grid grid-cols-2 gap-3 mt-1.5">
                      {(['male', 'female'] as Gender[]).map(g => (
                        <button key={g} onClick={() => setGender(g)}
                          className={`h-11 rounded-lg border text-sm font-medium transition-all ${
                            gender === g ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                          }`}
                        >
                          {g === 'male' ? '♂ Male' : '♀ Female'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={prev} className="h-11"><ArrowLeft className="w-4 h-4" /></Button>
                  <Button onClick={next} className="flex-1 h-11 gap-2" disabled={!name}>Next <ArrowRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}

            {step === 'body' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold font-display flex items-center gap-2"><Ruler className="w-5 h-5 text-primary" /> Body Stats</h2>
                  <p className="text-sm text-muted-foreground">Your current measurements</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Height (cm)</Label>
                    <Input type="number" value={heightCm} onChange={e => setHeightCm(+e.target.value)} className="mt-1.5 h-11" />
                  </div>
                  <div>
                    <Label>Current Weight (kg)</Label>
                    <Input type="number" value={weightKg} onChange={e => setWeightKg(+e.target.value)} className="mt-1.5 h-11" />
                  </div>
                  <div>
                    <Label>Target Weight (kg)</Label>
                    <Input type="number" value={targetWeightKg} onChange={e => setTargetWeightKg(+e.target.value)} className="mt-1.5 h-11" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={prev} className="h-11"><ArrowLeft className="w-4 h-4" /></Button>
                  <Button onClick={next} className="flex-1 h-11 gap-2">Next <ArrowRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}

            {step === 'activity' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold font-display flex items-center gap-2"><Dumbbell className="w-5 h-5 text-primary" /> Activity Level</h2>
                  <p className="text-sm text-muted-foreground">How active are you typically?</p>
                </div>
                <div className="space-y-2">
                  {activities.map(a => (
                    <button key={a.value} onClick={() => setActivityLevel(a.value)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        activityLevel === a.value ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-sm">{a.label}</div>
                      <div className="text-xs text-muted-foreground">{a.desc}</div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={prev} className="h-11"><ArrowLeft className="w-4 h-4" /></Button>
                  <Button onClick={next} className="flex-1 h-11 gap-2">Next <ArrowRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}

            {step === 'goal' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold font-display flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> Your Goal</h2>
                  <p className="text-sm text-muted-foreground">What would you like to achieve?</p>
                </div>
                <div className="space-y-3">
                  {([
                    { value: 'lose' as Goal, label: '🔥 Lose Weight', desc: 'Calorie deficit for fat loss' },
                    { value: 'maintain' as Goal, label: '⚖️ Maintain Weight', desc: 'Eat at maintenance calories' },
                    { value: 'gain' as Goal, label: '💪 Build Muscle', desc: 'Calorie surplus for muscle gain' },
                  ]).map(g => (
                    <button key={g.value} onClick={() => setGoal(g.value)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        goal === g.value ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium">{g.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{g.desc}</div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={prev} className="h-11"><ArrowLeft className="w-4 h-4" /></Button>
                  <Button onClick={next} className="flex-1 h-11 gap-2">See My Plan <ArrowRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}

            {step === 'results' && (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-bold font-display">Your Plan is Ready!</h2>
                  <p className="text-sm text-muted-foreground">Here's your personalized daily targets</p>
                </div>

                <div className="rounded-xl border bg-card p-5 text-center nova-glow-sm">
                  <div className="text-4xl font-bold font-display nova-text-gradient">{dailyCalorieTarget}</div>
                  <div className="text-sm text-muted-foreground mt-1">Daily Calorie Target</div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-card p-3 text-center">
                    <div className="text-lg font-bold text-nova-protein">{macros.protein}g</div>
                    <div className="text-xs text-muted-foreground">Protein</div>
                  </div>
                  <div className="rounded-lg border bg-card p-3 text-center">
                    <div className="text-lg font-bold text-nova-carbs">{macros.carbs}g</div>
                    <div className="text-xs text-muted-foreground">Carbs</div>
                  </div>
                  <div className="rounded-lg border bg-card p-3 text-center">
                    <div className="text-lg font-bold text-nova-fats">{macros.fats}g</div>
                    <div className="text-xs text-muted-foreground">Fats</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 rounded bg-muted/50">
                    <span className="text-muted-foreground">BMR</span><span className="font-medium">{bmr} kcal</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-muted/50">
                    <span className="text-muted-foreground">TDEE</span><span className="font-medium">{tdee} kcal</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={prev} className="h-11"><ArrowLeft className="w-4 h-4" /></Button>
                  <Button onClick={finish} className="flex-1 h-11 gap-2">Start Tracking <Flame className="w-4 h-4" /></Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
