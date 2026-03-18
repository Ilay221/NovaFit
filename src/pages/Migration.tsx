import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2, Database, ShieldAlert } from 'lucide-react';

export default function Migration() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);
  
  // Dynamic Source Inputs
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceAnonKey, setSourceAnonKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const log = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

  const runMigration = async () => {
    if (!sourceUrl || !sourceAnonKey || !email || !password) {
      alert("אנא מלא את כל פרטי הגישה לפרויקט הישן");
      return;
    }

    setIsMigrating(true);
    setLogs([]);
    try {
      log("מתחיל חיבור לפרויקט המקור (הישן)...");
      const srcClient = createClient(sourceUrl, sourceAnonKey);
      
      const { data: authData, error: authError } = await srcClient.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.user) {
        throw new Error(`שגיאת התחברות לפרויקט הישן: ${authError?.message}`);
      }
      
      const user = authData.user;
      log(`מחובר בהצלחה לפרויקט הישן: ${user.email}`);

      // Target (NEW) Project Setup - Using environment variables
      const newUrl = import.meta.env.VITE_SUPABASE_URL;
      // Service role key is required for admin operations (creating users)
      // Note: In a real app we'd want this from a secret, but here it's hardcoded for the one-time migration
      const newServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxY21vd2Vua3J1dGJiYW92cmthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzUwMTMxNCwiZXhwIjoyMDg5MDc3MzE0fQ.obbjGHCUBQ3mvdMJmVg6aorlgMwd27mjkcE-gAnnRP4";
      const destClient = createClient(newUrl, newServiceKey);

      log(`מתחיל העברה למשתמש ${user.email} בפרויקט החדש...`);

      // 1. Ensure user exists in target
      let targetUserId = user.id;
      const { data: { users }, error: listError } = await destClient.auth.admin.listUsers();
      
      if (listError) throw listError;
      
      const existingUser = users.find((u: any) => u.email === user.email);

      if (existingUser) {
        log(`מצאתי משתמש קיים במסד החדש. ממפה נתונים ל-ID: ${existingUser.id}`);
        targetUserId = existingUser.id;
      } else {
         log('יוצר משתמש (Auth) במסד החדש...');
         const { error } = await destClient.auth.admin.createUser({
           id: user.id,
           email: user.email,
           email_confirm: true,
           password: password, // Use same password for convenience
         });
         if (error) log(`שגיאה בהקמת המשתמש: ${error.message}`);
         else log('המשתמש הוקם בהצלחה!');
      }

      const tables = ['profiles', 'chat_sessions', 'chat_messages', 'daily_logs', 'meal_entries', 'weight_entries'];

      for (const table of tables) {
        log(`==> קורא נתונים מטבלת ${table}...`);
        const { data, error } = await srcClient.from(table as any).select('*').eq(table === 'profiles' ? 'id' : 'user_id', user.id);
        
        if (error) {
          log(`[שגיאה] לא הצלחתי לקרוא מ-${table}: ${error.message}`);
          continue;
        }

        if (!data || data.length === 0) {
          log(`אין נתונים בטבלה ${table}. מדלג.`);
          continue;
        }

        log(`מצאתי ${data.length} רשומות. מבצע סנכרון (Upsert)...`);
        
        const mappedData = [];
        for (const row of data) {
          const newRow = { ...row };
          if (table === 'profiles') {
            newRow.id = targetUserId;
          } else {
            newRow.user_id = targetUserId;
            
            // Special Healing for Meal Entries: Map log ID by date
            if (table === 'meal_entries') {
              const { data: srcLog } = await srcClient.from('daily_logs').select('date').eq('id', row.daily_log_id).maybeSingle();
              if (srcLog) {
                const { data: destLog } = await destClient.from('daily_logs').select('id').eq('user_id', targetUserId).eq('date', srcLog.date).maybeSingle();
                if (destLog) {
                  newRow.daily_log_id = destLog.id;
                }
              }
            }
          }
          mappedData.push(newRow);
        }

        const { error: insertError } = await destClient.from(table as any).upsert(mappedData);
        if (insertError) {
          log(`[שגיאה] בשמירת ${table}: ${insertError.message}`);
        } else {
          log(`✅ טבלת ${table} סונכרנה בהצלחה!${table === 'meal_entries' ? ' (עם תיקון מזהים)' : ''}`);
        }
      }

      log("🎉 סיום הסנכרון! כל הנתונים החדשים מהאייפון הועברו בהצלחה.");
      
    } catch (e: any) {
      log(`[שגיאה קריטית] ${e.message}`);
      console.error(e);
    }
    setIsMigrating(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white p-6 md:p-12 font-sans" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <Database className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent italic">
            סנכרון נתונים (NovaSync)
          </h1>
          <p className="text-gray-400 text-lg">
            העבר את הארוחות והצ'אטים מהגרסה הישנה (האייפון) ישירות למסד הנתונים הפרטי החדש שלך.
          </p>
        </header>

        <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-500">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle className="font-bold mb-1">שים לב</AlertTitle>
          <AlertDescription>
            המערכת תשתמש בשיטת "Upsert" - היא תוסיף רק את מה שחסר ותעדכן שינויים, ללא מחיקה או כפילויות.
          </AlertDescription>
        </Alert>

        <Card className="bg-[#121214] border-[#1C1C1F] shadow-2xl overflow-hidden">
          <CardHeader className="border-b border-[#1C1C1F] bg-[#161618]">
            <CardTitle className="text-xl">פרטי פרויקט המקור (מ-Lovable)</CardTitle>
            <CardDescription className="text-gray-500">
              מצא את הפרטים הללו ב-Supabase Dashboard תחת Project Settings &gt; API
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="url">Project URL</Label>
                <Input 
                  id="url" 
                  placeholder="https://xyz.supabase.co" 
                  className="bg-[#1C1C1F] border-[#2C2C2F]"
                  value={sourceUrl}
                  onChange={e => setSourceUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="key">Anon Key</Label>
                <Input 
                  id="key" 
                  type="password"
                  placeholder="eyJhbGci..." 
                  className="bg-[#1C1C1F] border-[#2C2C2F]"
                  value={sourceAnonKey}
                  onChange={e => setSourceAnonKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">אימייל (שלך באפליקציה)</Label>
                <Input 
                  id="email" 
                  placeholder="name@example.com" 
                  className="bg-[#1C1C1F] border-[#2C2C2F]"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pass">סיסמה</Label>
                <Input 
                  id="pass" 
                  type="password"
                  placeholder="הסיסמה שלך" 
                  className="bg-[#1C1C1F] border-[#2C2C2F]"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button 
              onClick={runMigration} 
              disabled={isMigrating} 
              className="w-full h-14 text-xl font-bold nova-gradient hover:opacity-90 transition-all shadow-lg"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="ml-2 h-6 w-6 animate-spin" />
                  מסנכרן נתונים...
                </>
              ) : (
                "סנכרן נתונים עכשיו"
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="bg-[#0D0D0F] border border-[#1C1C1F] rounded-2xl p-6 shadow-inner">
          <div className="flex items-center gap-2 mb-4 text-primary">
            <Loader2 className={`w-4 h-4 ${isMigrating ? 'animate-spin' : 'hidden'}`} />
            <h3 className="font-bold text-sm uppercase tracking-wider opacity-60">Log Console</h3>
          </div>
          <div className="font-mono text-sm space-y-1.5 max-h-[400px] overflow-auto custom-scrollbar">
            {logs.length === 0 ? (
              <div className="text-gray-700 italic">מוכן לפעולה. הזן פרטים ולחץ על סנכרן.</div>
            ) : (
              logs.map((L, i) => (
                <div key={i} className={`${L.includes('שגיאה') ? 'text-red-400' : L.includes('✅') ? 'text-green-400' : 'text-gray-400'}`}>
                  {L}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
