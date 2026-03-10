import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Lock, Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setReady(true);
    } else {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') setReady(true);
      });
      const timer = setTimeout(() => setReady(true), 1000);
      return () => { subscription.unsubscribe(); clearTimeout(timer); };
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'שגיאה', description: 'הסיסמאות לא תואמות.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'שגיאה', description: 'הסיסמה חייבת להיות לפחות 6 תווים.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }} className="text-center mb-12">
          <div className="w-16 h-16 rounded-[18px] nova-gradient mx-auto flex items-center justify-center mb-5">
            <Activity className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-[32px] font-extrabold font-display tracking-tight">NovaFit</h1>
        </motion.div>

        {success ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center">
              <Check className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold font-display">הסיסמה עודכנה</h2>
            <p className="text-sm text-muted-foreground">מפנה אותך לאפליקציה...</p>
          </motion.div>
        ) : (
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }} onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h2 className="text-xl font-bold font-display tracking-tight">הגדר סיסמה חדשה</h2>
              <p className="text-sm text-muted-foreground mt-1">בחר סיסמה חזקה לחשבון שלך</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">סיסמה חדשה</Label>
                <div className="relative">
                  <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="h-12 ps-10 pe-10 rounded-xl bg-muted/50 border-0 focus-visible:ring-1 text-[15px]" required minLength={6} dir="ltr" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">אימות סיסמה</Label>
                <div className="relative">
                  <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="h-12 ps-10 rounded-xl bg-muted/50 border-0 focus-visible:ring-1 text-[15px]" required minLength={6} dir="ltr" />
                </div>
              </div>
            </div>
            <Button type="submit" disabled={loading || !password || !confirmPassword} className="w-full h-12 gap-2 rounded-xl font-semibold active:scale-[0.98] transition-transform text-[14px]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'עדכן סיסמה'}
            </Button>
          </motion.form>
        )}
      </div>
    </div>
  );
}
