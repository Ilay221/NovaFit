import { useProfile, useDailyLog, useWeightHistory, useTheme } from '@/lib/store';
import Onboarding from '@/components/Onboarding';
import Dashboard from '@/components/Dashboard';

const Index = () => {
  const { profile, setProfile } = useProfile();
  const { getLog, addMeal, removeMeal, addWater } = useDailyLog();
  const { entries: weightHistory, addEntry: addWeight } = useWeightHistory();
  useTheme(); // initialize theme

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
