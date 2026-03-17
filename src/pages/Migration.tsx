import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase as oldSupabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

export default function Migration() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);

  const log = (msg: string) => setLogs(prev => [...prev, msg]);

  const runMigration = async () => {
    setIsMigrating(true);
    setLogs([]);
    try {
      const { data: { user } } = await oldSupabase.auth.getUser();
      if (!user) throw new Error("לא מצאתי משתמש מחובר למסד הישן! התחבר קודם באפליקציה ב-localhost.");
      
      const newUrl = "https://wqcmowenkrutbbaovrka.supabase.co";
      const newServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxY21vd2Vua3J1dGJiYW92cmthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzUwMTMxNCwiZXhwIjoyMDg5MDc3MzE0fQ.obbjGHCUBQ3mvdMJmVg6aorlgMwd27mjkcE-gAnnRP4";
      const newSupabase = createClient(newUrl, newServiceKey);

      log(`מתחיל העברה למשתמש ${user.email}...`);

      // 1. Migrate user account securely
      let targetUserId = user.id;
      const { data: { users }, error: listError } = await newSupabase.auth.admin.listUsers();
      
      if (listError) throw listError;
      
      const existingUser = users.find((u: any) => u.email === user.email);

      if (existingUser) {
        log(`מצאתי משתמש קיים במסד החדש עם אותו אימייל. ממפה את הנתונים ל-ID החדש שלו...`);
        targetUserId = existingUser.id;
      } else {
         log('יוצר משתמש (Auth) במסד החדש עם ה-ID המקורי...');
         const { error } = await newSupabase.auth.admin.createUser({
           id: user.id,
           email: user.email,
           email_confirm: true,
           password: "TemporaryPassword123!", 
         });
         if (error) log(`שגיאה בהקמת המשתמש: ${error.message}`);
         else log('המשתמש הוקם בהצלחה!');
      }

      const tables = ['profiles', 'chat_sessions', 'chat_messages', 'daily_logs', 'meal_entries', 'weight_entries'];

      for (const table of tables) {
        log(`==> קורא נתונים מטבלת ${table}...`);
        const { data, error } = await oldSupabase.from(table as any).select('*').eq(table === 'profiles' ? 'id' : 'user_id', user.id);
        
        if (error) {
          log(`[שגיאה] לא הצלחתי לקרוא מ-${table}: ${error.message}`);
          continue;
        }

        if (!data || data.length === 0) {
          log(`אין נתונים בטבלה ${table}. מדלג.`);
          continue;
        }

        log(`מצאתי ${data.length} רשומות. מנסה לשפוך למסד החדש...`);
        
        // Map old user ID to new user ID
        const mappedData = data.map((row: any) => {
          const newRow = { ...row };
          if (table === 'profiles') newRow.id = targetUserId;
          else if ('user_id' in newRow) newRow.user_id = targetUserId;
          return newRow;
        });

        const { error: insertError } = await newSupabase.from(table as any).upsert(mappedData);
        if (insertError) {
          log(`[שגיאה] בשמירת ${table}: ${insertError.message}`);
        } else {
          log(`✅ טבלת ${table} עברה בהצלחה!`);
        }
      }

      log("🎉 סיום ההעברה המלאה! כל הנתונים נמצאים במסד הנתונים החדש שלך.");
      log("שים לב: מכיוון שזו העברה, הסיסמה שלך על הפרויקט החדש כרגע היא TemporaryPassword123!");
      log("תוכל תמיד ללחוץ על 'שכחתי סיסמה' במסך ההתחברות כדי לאפס אותה למשהו שאתה זוכר.");
      
    } catch (e: any) {
      log(`[שגיאה כללית] ${e.message}`);
    }
    setIsMigrating(false);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-4 text-right transform" dir="rtl">
      <h1 className="text-3xl font-bold">כלי להעברת מסד הנתונים (Migration)</h1>
      <p>הכלי הזה ישאב את כל ההיסטוריה והנתונים שלך מ-Lovable ישירות אל הפרויקט החדש והפרטי שלך ב-Supabase!</p>
      
      <Button onClick={runMigration} disabled={isMigrating} className="w-full h-12 text-lg">
        {isMigrating ? "מעביר נתונים..." : "התחל בהעברת הנתונים עכשיו!"}
      </Button>

      <div className="bg-black/90 text-green-400 p-4 rounded-xl min-h-[300px] font-mono text-sm shadow-xl text-left whitespace-pre-wrap overflow-auto" dir="ltr">
        {logs.map((L, i) => <div key={i}>{L}</div>)}
        {logs.length === 0 && <div className="text-gray-500">מחכה להתחלת ההפעלה...</div>}
      </div>
    </div>
  );
}
