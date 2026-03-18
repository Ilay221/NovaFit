
import React from 'react';
import { motion } from 'framer-motion';
import { Search, UserPlus, Eye, Clock, User, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConnections } from '@/lib/store';
import { useAppState } from '@/contexts/AppStateContext';
import { toast } from 'sonner';
import { formatDistanceToNow, differenceInHours, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

export default function CoachDashboard() {
  const [code, setCode] = React.useState('');
  const [isAdding, setIsAdding] = React.useState(false);
  const { trainees, addTraineeByCode, loading } = useConnections();
  const { setViewingUserId } = useAppState();

  const handleAddTrainee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || isAdding) return;
    
    setIsAdding(true);
    const res = await addTraineeByCode(code.trim().toUpperCase());
    setIsAdding(false);
    
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("בקשת החיבור נשלחה!");
      setCode('');
    }
  };

  const getStatusColor = (lastSeen?: string) => {
    if (!lastSeen) return 'bg-destructive'; // Never seen
    
    const lastSeenDate = parseISO(lastSeen);
    const now = new Date();
    const diffHours = differenceInHours(now, lastSeenDate);
    
    // Check if "currently online" (updated in the last 5 minutes)
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    if (diffMinutes < 10) return 'bg-[#10b981]'; // Green
    if (diffHours < 24) return 'bg-muted-foreground'; // Grey
    return 'bg-destructive'; // Red
  };

  const getStatusLabel = (lastSeen?: string) => {
    if (!lastSeen) return 'מעולם לא התחבר';
    
    const lastSeenDate = parseISO(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    
    if (diffMinutes < 10) return 'מחובר כעת';
    return `נראה לאחרונה: ${formatDistanceToNow(lastSeenDate, { addSuffix: true, locale: he })}`;
  };

  return (
    <div className="space-y-6">
      {/* Add Trainee Form */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="nova-card p-5"
      >
        <h3 className="text-sm font-bold font-display mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" /> הוספת מתאמן חדש
        </h3>
        <form onSubmit={handleAddTrainee} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="הכנס קוד מתאמן (למשל: AB12CD)"
              className="pl-10 h-11 rounded-xl text-sm"
              maxLength={6}
            />
          </div>
          <Button
            type="submit"
            disabled={isAdding || !code.trim()}
            className="h-11 rounded-xl px-6 gap-2"
          >
            {isAdding ? 'מוסיף...' : 'הוסף'}
          </Button>
        </form>
      </motion.div>

      {/* Trainees List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">רשימת המתאמנים שלך</h4>
        
        {loading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">טוען נתונים...</div>
        ) : trainees.length === 0 ? (
          <div className="nova-card p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
              <User className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">עוד לא הוספת מתאמנים.</p>
          </div>
        ) : (
          trainees.map((trainee, i) => (
            <motion.div
              key={trainee.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="nova-card p-4 flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl font-display">
                    {trainee.name?.[0] || '?'}
                  </div>
                  {/* Status Indicator */}
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${getStatusColor(trainee.lastSeen)} shadow-sm`} />
                </div>
                
                <div>
                  <div className="font-bold text-sm flex items-center gap-2">
                    {trainee.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {getStatusLabel(trainee.lastSeen)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setViewingUserId(trainee.id); toast.info(`צופה בנתונים של ${trainee.name}`); }}
                  className="rounded-xl h-10 gap-2 px-4 border-primary/20 hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <Eye className="w-4 h-4" />
                  צפה ביומן
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex gap-3"
      >
        <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed text-primary/80">
          כמאמן, תוכל לראות את היומן התזונתי, המשקל וההתקדמות של המתאמנים שלך. 
          שינויים שנעשים ביומן שלהם יהיו <strong>לקריאה בלבד</strong> ולא תוכל לבצע פעולות בשמם.
        </p>
      </motion.div>
    </div>
  );
}
