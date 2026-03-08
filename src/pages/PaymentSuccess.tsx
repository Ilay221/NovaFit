import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export default function PaymentSuccess() {
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-payment');
        if (!error && data?.is_premium) {
          setSuccess(true);
        }
      } catch {
        // fallback
      }
      setVerifying(false);
    };
    // Small delay to let Stripe process
    setTimeout(verify, 1500);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        className="max-w-sm w-full text-center"
      >
        {verifying ? (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <h1 className="text-xl font-bold font-display tracking-tight mb-2">Verifying payment...</h1>
            <p className="text-sm text-muted-foreground">Please wait while we confirm your purchase.</p>
          </>
        ) : success ? (
          <>
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6">
              <Crown className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-[28px] font-bold font-display tracking-tight mb-2">Welcome to Premium</h1>
            <p className="text-sm text-muted-foreground mb-8">Your account has been upgraded. Enjoy all premium features.</p>
            <Button onClick={() => navigate('/')} className="h-12 px-8 rounded-2xl text-[14px] font-semibold">
              <Check className="w-4 h-4 mr-2" /> Go to Dashboard
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold font-display tracking-tight mb-2">Payment Processing</h1>
            <p className="text-sm text-muted-foreground mb-8">Your payment may still be processing. Try refreshing in a moment.</p>
            <Button onClick={() => navigate('/')} variant="outline" className="h-12 px-8 rounded-2xl text-[14px] font-semibold">
              Go to Dashboard
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}
