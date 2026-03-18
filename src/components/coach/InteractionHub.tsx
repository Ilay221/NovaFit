
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, User, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/AppStateContext';
import CoachDashboard from './CoachDashboard';
import TraineeCodeView from './TraineeCodeView';

type HubView = 'selection' | 'coach' | 'trainee';

export default function InteractionHub({ onClose }: { onClose: () => void }) {
  const [view, setView] = React.useState<HubView>('selection');
  const { isViewing, setViewingUserId } = useAppState();


  return (
    <div className="max-w-lg mx-auto px-5 pt-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black font-display tracking-tight">אינטרקציה</h2>
        <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl h-10 px-4 bg-muted/50 border-none hover:bg-muted transition-colors">
          חזרה
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {view === 'selection' ? (
          <motion.div
            key="selection"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-2 gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setView('trainee')}
              className="nova-card p-6 flex flex-col items-center justify-center text-center gap-4 hover:border-primary/50 transition-colors"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <User className="w-8 h-8" />
              </div>
              <div>
                <div className="font-bold text-lg">אני מתאמן</div>
                <div className="text-[11px] text-muted-foreground mt-1">הצג קוד חיבור למאמן</div>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setView('coach')}
              className="nova-card p-6 flex flex-col items-center justify-center text-center gap-4 hover:border-primary/50 transition-colors"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <div className="font-bold text-lg">אני מאמן</div>
                <div className="text-[11px] text-muted-foreground mt-1">נהל את רשימת המתאמנים</div>
              </div>
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key={view}
            initial={{ opacity: 0, x: view === 'coach' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: view === 'coach' ? 20 : -20 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('selection')}
              className="mb-6 rounded-lg gap-2 text-muted-foreground -ml-2"
            >
              <ArrowLeft className="w-4 h-4" /> חזרה לבחירה
            </Button>
            
            {view === 'coach' ? <CoachDashboard onClose={onClose} /> : <TraineeCodeView />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
