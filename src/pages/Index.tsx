import { useProfile, useDailyLog, useWeightHistory, useTheme } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import Onboarding from '@/components/Onboarding';
import Dashboard from '@/components/Dashboard';
import Auth from '@/pages/Auth';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, setProfile, loading: profileLoading } = useProfile();
  const { getLog, addMeal, removeMeal, addWater } = useDailyLog();
  const { entries: weightHistory, addEntry: addWeight } = useWeightHistory();
  useTheme();

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
    return <Onboarding onComplete={setProfile} />;
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
