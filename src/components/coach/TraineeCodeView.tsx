
import React from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, UserPlus, UserCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/AppStateContext';
import { useConnections } from '@/lib/store';
import { toast } from 'sonner';

export default function TraineeCodeView() {
  const { profile } = useAppState();
  const { requests, coaches, respondToRequest, removeConnection } = useConnections();
  const [copied, setCopied] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);

  const copyToClipboard = () => {
    if (profile?.uniqueCode) {
      navigator.clipboard.writeText(profile.uniqueCode);
      setCopied(true);
      toast.success("הקוד הועתק!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRemoveCoach = async (connId: string, coachName: string) => {
    if (confirm(`האם אתה בטוח שברצונך להפסיק את הקשר עם המאמן ${coachName}?`)) {
      setIsDeleting(connId);
      const res = await removeConnection(connId);
      setIsDeleting(null);
      if (res.error) toast.error(res.error);
      else toast.success("המאמן הוסר בהצלחה");
    }
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="nova-card p-8 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <UserPlus className="w-24 h-24" />
        </div>
        
        <h3 className="text-lg font-bold font-display mb-2">כרטיס המתאמן שלך</h3>
        <p className="text-sm text-muted-foreground mb-6">שתף את הקוד הזה עם המאמן שלך כדי להתחבר</p>
        
        <div className="bg-muted/50 rounded-2xl p-6 border border-border/50 mb-6 inline-block min-w-[200px]">
          <span className="text-4xl font-black tracking-widest font-mono text-primary">
            {profile?.uniqueCode || '------'}
          </span>
        </div>
        
        <div>
          <Button
            onClick={copyToClipboard}
            variant="outline"
            className="rounded-xl gap-2 h-11 px-6"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'הועתק' : 'העתק קוד'}
          </Button>
        </div>
      </motion.div>

      {coaches.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">המאמנים שלי</h4>
          <div className="space-y-2">
            {coaches.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="nova-card p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                    {c.profile.name?.[0] || '?'}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{c.profile.name}</div>
                    <div className="text-[11px] text-muted-foreground">מאמן פעיל</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isDeleting === c.id}
                  onClick={() => handleRemoveCoach(c.id, c.profile.name)}
                  className="rounded-xl h-10 px-4 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive group transition-all"
                >
                  <X className="w-4 h-4 mr-2 opacity-60 group-hover:opacity-100" />
                  הסר מאמן
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {requests.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 bg-primary/10 py-1 inline-block rounded-md text-primary">בקשות ממתינות</h4>
          <div className="space-y-2">
            {requests.map((req) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="nova-card p-4 flex items-center justify-between border-dashed border-primary/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {req.coach.name?.[0] || '?'}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{req.coach.name}</div>
                    <div className="text-[11px] text-muted-foreground">רוצה להיות המאמן שלך</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => respondToRequest(req.id, false)}
                    className="rounded-lg h-9 w-9 p-0 text-destructive hover:bg-destructive/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => respondToRequest(req.id, true)}
                    className="rounded-lg h-9 gap-2 px-3"
                  >
                    <UserCheck className="w-4 h-4" />
                    אישור
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
