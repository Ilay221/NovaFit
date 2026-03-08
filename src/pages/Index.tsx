import { useState, useEffect } from 'react';
import { useProfile, useDailyLog, useWeightHistory, useTheme } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import Onboarding from '@/components/Onboarding';
import Dashboard from '@/components/Dashboard';
import PremiumPaywall from '@/components/PremiumPaywall';
import Auth from '@/pages/Auth';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, setProfile, loading: profileLoading } = useProfile();
  const { getLog, addMeal, removeMeal, addWater } = useDailyLog();
  const { entries: weightHistory, addEntry: addWeight } = useWeightHistory();
  useTheme();

  const [showPaywall, setShowPaywall] = useState(false);
  const [justOnboarded, setJustOnboarded] = useState(false);

  // After onboarding completes, show paywall if not premium
  const handleOnboardingComplete = async (p: any) => {
    await setProfile(p);
    setJustOnboarded(true);
  };

  useEffect(() => {
    if (justOnboarded && profile && !profile.isPremium) {
      setShowPaywall(true);
      setJustOnboarded(false);
    }
  }, [justOnboarded, profile]);

  // On returning from payment success, re-check premium status
  useEffect(() => {
    if (user && profile && !profile.isPremium) {
      const checkPremium = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', user.id)
          .maybeSingle();
        if ((data as any)?.is_premium && !profile.isPremium) {
          // Refresh profile
          const { data: full } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          if (full) {
            setProfile({
              ...profile,
              isPremium: true,
            });
          }
        }
      };
      checkPremium();
    }
  }, [user]);

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (!profile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (showPaywall) {
    return (
      <PremiumPaywall
        onSkip={() => setShowPaywall(false)}
        onPurchased={() => setShowPaywall(false)}
      />
    );
  }

  const todayLog = getLog();

  return (
    <Dashboard
      profile={profile}
      dailyLog={todayLog}
      weightHistory={weightHistory}
      onAddMeal={addMeal}
      onRemoveMeal={removeMeal}
      onAddWater={addWater}
      onAddWeight={addWeight}
      onUpdateProfile={setProfile}
    />
  );
};

export default Index;
