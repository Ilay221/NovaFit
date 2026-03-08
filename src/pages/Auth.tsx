import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ArrowRight, ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type AuthView = 'signin' | 'signup' | 'forgot';

export default function Auth() {
  const [view, setView] = useState<AuthView>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (view === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Check your email', description: 'We sent you a password reset link.' });
        setView('signin');
      }
      return;
    }

    if (!email || !password) { setLoading(false); return; }

    const { error } = view === 'signup'
      ? await signUp(email, password)
      : await signIn(email, password);

    setLoading(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else if (view === 'signup') {
      toast({ title: 'Check your email', description: 'We sent you a verification link to confirm your account.' });
    }
  };

  const pageVariants = {
    enter: { opacity: 0, y: 24, filter: 'blur(6px)' },
    center: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, y: -24, filter: 'blur(6px)' },
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent)' }}
          animate={{
            x: ['-20%', '20%', '-20%'],
            y: ['-10%', '15%', '-10%'],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-0 bottom-0 w-[300px] h-[300px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, hsl(var(--nova-info)), transparent)' }}
          animate={{
            x: ['10%', '-15%', '10%'],
            y: ['10%', '-20%', '10%'],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <motion.div
          initial={{ scale: 0.3, opacity: 0, rotate: -15 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
          className="text-center mb-12"
        >
          <motion.div
            className="w-16 h-16 rounded-[18px] nova-gradient mx-auto flex items-center justify-center mb-5 relative"
            animate={{
              boxShadow: [
                '0 0 0px hsl(var(--primary) / 0)',
                '0 0 30px hsl(var(--primary) / 0.3)',
                '0 0 0px hsl(var(--primary) / 0)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Activity className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <motion.h1
            className="text-[32px] font-extrabold font-display tracking-tight"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            NovaFit
          </motion.h1>
          <motion.p
            className="text-sm text-muted-foreground mt-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            AI-powered nutrition tracking
          </motion.p>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.form
            key={view}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <h2 className="text-xl font-bold font-display tracking-tight">
                {view === 'signin' && 'Welcome Back'}
                {view === 'signup' && 'Create Account'}
                {view === 'forgot' && 'Reset Password'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {view === 'signin' && 'Sign in to continue tracking'}
                {view === 'signup' && 'Start your nutrition journey'}
                {view === 'forgot' && "Enter your email and we'll send a reset link"}
              </p>
            </div>

            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-12 pl-10 rounded-xl bg-muted/50 border-0 focus-visible:ring-1 text-[15px] transition-all duration-300 focus:shadow-md"
                    required
                  />
                </div>
              </motion.div>

              {view !== 'forgot' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                >
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-12 pl-10 pr-10 rounded-xl bg-muted/50 border-0 focus-visible:ring-1 text-[15px] transition-all duration-300 focus:shadow-md"
                      required
                      minLength={6}
                    />
                    <motion.button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      whileTap={{ scale: 0.85 }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </div>

            {view === 'signin' && (
              <motion.div
                className="text-right -mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <button
                  type="button"
                  onClick={() => setView('forgot')}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
                >
                  Forgot password?
                </button>
              </motion.div>
            )}

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button
                type="submit"
                disabled={loading || !email || (view !== 'forgot' && !password)}
                className="w-full h-12 gap-2 rounded-xl font-semibold transition-all text-[14px] shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {view === 'signin' && 'Sign In'}
                    {view === 'signup' && 'Create Account'}
                    {view === 'forgot' && 'Send Reset Link'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </motion.div>

            <motion.div
              className="text-center pt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {view === 'forgot' ? (
                <button
                  type="button"
                  onClick={() => setView('signin')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 mx-auto"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setView(view === 'signin' ? 'signup' : 'signin')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {view === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
                  <span className="font-semibold text-primary">{view === 'signup' ? 'Sign In' : 'Sign Up'}</span>
                </button>
              )}
            </motion.div>
          </motion.form>
        </AnimatePresence>
      </div>
    </div>
  );
}
