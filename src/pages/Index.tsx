import { useAuth } from '@/contexts/AuthContext';
import { AppStateProvider, useAppState } from '@/contexts/AppStateContext';
import { useTheme } from '@/lib/store';
import Onboarding from '@/components/Onboarding';
import Dashboard from '@/components/Dashboard';

import Auth from '@/pages/Auth';
import { Loader2 } from 'lucide-react';

const MainView = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, isReady, onUpdateProfile } = useAppState();
  useTheme();

  if (authLoading || (user && !isReady)) {
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
    return <Onboarding onComplete={async (p) => onUpdateProfile(p)} />;
  }

  return <Dashboard />;
};

const Index = () => {
  return (
    <AppStateProvider>
      <MainView />
    </AppStateProvider>
  );
};

export default Index;
