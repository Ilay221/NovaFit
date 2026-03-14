import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, ChevronLeft, Search, Check, X, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

interface Client {
  id: string;
  name: string;
  avatar_url?: string;
  status: 'pending' | 'approved';
}

interface CoachDashboardProps {
  onClose: () => void;
  onViewClient: (clientId: string) => void;
}

export default function CoachDashboard({ onClose, onViewClient }: CoachDashboardProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientCode, setClientCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchClients();
  }, [user]);

  const fetchClients = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Step 1: Fetch relationships
      const { data: relationships, error: relError } = await supabase
        .from('coaching_relationships' as any)
        .select('id, status, client_id')
        .eq('coach_id', user.id);

      if (relError) throw relError;

      if (!relationships || relationships.length === 0) {
        setClients([]);
        setLoading(false);
        return;
      }

      // Step 2: Fetch profiles for these clients
      const clientIds = relationships.map((r: any) => r.client_id);
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', clientIds);

      if (profError) throw profError;

      // Step 3: Map them together
      const profileMap = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.id] = p.name;
        return acc;
      }, {});

      const formattedClients = relationships.map((r: any) => ({
        id: r.client_id,
        name: profileMap[r.client_id] || 'מתאמן',
        status: r.status,
      }));

      setClients(formattedClients);
    } catch (error: any) {
      console.error('CoachDashboard: Error fetching clients:', error);
      setClients([]);
      // Silent failure - don't show toast to user for background fetch failures
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    if (!user || !clientCode.trim()) return;
    setSubmitting(true);
    
    try {
      // 1. Find profile with that share code (id prefix)
      const cleanCode = clientCode.trim().toUpperCase().replace('NOVA-', '').toLowerCase();
      
      // We search using the first 8 characters of the UUID.
      // If the generated column doesn't exist yet, we try a text-based search.
      const { data: clientProfile, error: profileError } = await (supabase
        .from('profiles')
        .select('id, name')
        .or(`id.ilike.${cleanCode}%,share_code.eq.${clientCode.trim().toUpperCase()}`) as any)
        .limit(1)
        .maybeSingle();

      if (profileError || !clientProfile) {
        toast.error(profileError ? 'שגיאה בחיפוש משתמש' : 'קוד לא תקין או משתמש לא נמצא');
        setSubmitting(false);
        return;
      }

      if (clientProfile.id === user.id) {
        toast.error('אי אפשר לאמן את עצמך 😊');
        setSubmitting(false);
        return;
      }

      // 2. Create relationship
      const { error: relError } = await supabase
        .from('coaching_relationships' as any)
        .insert({
          coach_id: user.id,
          client_id: clientProfile.id,
          status: 'pending'
        });

      if (relError) {
        if (relError.code === '23505') {
          toast.error('מתאמן זה כבר נמצא ברשימה שלך');
        } else {
          throw relError;
        }
      } else {
        toast.success(`בקשה נשלחה ל-${clientProfile.name}`);
        setClientCode('');
        fetchClients();
        haptics.success();
      }
    } catch (err) {
      console.error('Error adding client:', err);
      toast.error('חלה שגיאה בשליחת הבקשה');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen glass-screen pb-20">
      <div className="max-w-lg mx-auto px-5 pt-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-tight">ניהול מתאמנים</h1>
              <p className="text-xs text-muted-foreground mt-0.5">מעקב ובקרה אחר התקדמות</p>
            </div>
          </div>
          <motion.button
            whileHover={{ x: -2 }}
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Add Client Section */}
        <motion.div 
          className="nova-card p-5 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" /> הוספת מתאמן חדש
          </h3>
          <div className="flex gap-2">
            <Input 
              value={clientCode}
              onChange={e => setClientCode(e.target.value)}
              placeholder="הכנס קוד שיתוף (למשל: NOVA-1234)"
              className="h-11 rounded-xl bg-muted/40 border-0"
              onKeyDown={e => e.key === 'Enter' && handleAddClient()}
            />
            <Button 
              onClick={handleAddClient}
              disabled={submitting || !clientCode.trim()}
              className="h-11 px-6 rounded-xl font-bold shadow-lg"
            >
              שלח בקשה
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3 italic text-center">
            בקש מהמתאמן שלך את קוד השיתוף המופיע ביומן שלו תחת Notifications/Coach
          </p>
        </motion.div>

        {/* Client List */}
        <div className="space-y-4">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">הרשימה שלי ({clients.length})</h3>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">טוען מתאמנים...</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-16 nova-card">
              <Users className="w-12 h-12 text-muted/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground font-medium">עדיין לא הוספת מתאמנים</p>
              <p className="text-xs text-muted-foreground mt-1">שלח בקשת הצטרפות למתאמן שלך</p>
            </div>
          ) : (
            clients.map((client, i) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="nova-card p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
                    {client.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold">{client.name}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${client.status === 'approved' ? 'bg-nova-success' : 'bg-amber-400'}`} />
                      <span className="text-[11px] text-muted-foreground">
                        {client.status === 'approved' ? 'מקושר' : 'ממתין לאישור'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {client.status === 'approved' && (
                  <Button 
                    shimmer
                    size="sm"
                    onClick={() => onViewClient(client.id)}
                    className="h-9 gap-2 px-4 rounded-xl text-xs font-bold"
                  >
                    צפה ביומן <ExternalLink className="w-3 h-3" />
                  </Button>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
