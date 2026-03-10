import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, Shield, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface PremiumPaywallProps {
  onSkip: () => void;
  onPurchased: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] as const } },
};

const features = [
  { icon: Zap, label: 'סריקת מזון מונעת AI' },
  { icon: Shield, label: 'אנליטיקס ותובנות מתקדמות' },
  { icon: Check, label: 'היסטוריית ארוחות ללא הגבלה' },
  { icon: Check, label: 'תמיכה בעדיפות' },
];

export default function PremiumPaywall({ onSkip, onPurchased }: PremiumPaywallProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePurchase = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-payment');
      if (fnError) throw fnError;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      setError(e.message || 'משהו השתבש');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-sm w-full">
        <motion.div variants={itemVariants} className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Crown className="w-10 h-10 text-primary" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="text-center mb-8">
          <h1 className="text-[28px] font-bold font-display tracking-tight mb-2">שדרג לפרימיום</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            הפק את המקסימום מ-NovaFit עם גישה לכל החיים לכל התכונות המתקדמות.
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="nova-card p-5 mb-6">
          <div className="space-y-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[14px] font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="text-center mb-6">
          <div className="inline-flex items-baseline gap-1">
            <span className="text-[40px] font-bold font-display tracking-tight">$0.50</span>
            <span className="text-sm text-muted-foreground font-medium">חד-פעמי</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">גישה לכל החיים. ללא חיובים חוזרים.</p>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-3">
          <Button onClick={handlePurchase} disabled={loading} className="w-full h-13 rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-transform">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'שדרג עכשיו'}
          </Button>
          <button onClick={onSkip} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2 font-medium">
            המשך עם הגרסה החינמית
          </button>
        </motion.div>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-destructive text-xs text-center mt-4">{error}</motion.p>
        )}

        <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 mt-6 text-[11px] text-muted-foreground">
          <Shield className="w-3 h-3" />
          <span>תשלום מאובטח. רכישה ללא ביטול.</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
