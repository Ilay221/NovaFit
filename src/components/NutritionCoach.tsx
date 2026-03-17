import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Send, Sparkles, Bot, User, Loader2, RefreshCw, AlertCircle, Menu, Check, X, UtensilsCrossed, Camera, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import ChatSessionSidebar, { type ChatSession } from './ChatSessionSidebar';
import { MealEntry, getCurrentMealType } from '@/lib/types';
import { toast } from 'sonner';

interface DetectedFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  serving_size: string;
  quantity: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'late_night';
}

interface FoodAction {
  foods: DetectedFood[];
}

type Msg = { 
  role: 'user' | 'assistant'; 
  content: string; 
  imageUrl?: string;
  error?: boolean; 
  foodAction?: FoodAction; 
  foodActionHandled?: boolean 
};

interface BankingContext {
  dynamicTarget: number;
  baseTarget: number;
  rollover: number;
  spreadDays: number;
  status: 'saved' | 'overage' | 'neutral';
  explanation: string;
}

interface NutritionCoachProps {
  onClose: () => void;
  userName: string;
  onAddMeal?: (entry: MealEntry) => void;
  bankingContext?: BankingContext;
}

const FOOD_TAG_REGEX = /<!--FOOD_ADD:([\s\S]*?)-->/;

function parseFoodAction(content: string): { cleanContent: string; foodAction?: FoodAction } {
  const match = content.match(FOOD_TAG_REGEX);
  if (!match) return { cleanContent: content };
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed?.foods?.length > 0) {
      return { cleanContent: content.replace(FOOD_TAG_REGEX, '').trim(), foodAction: parsed as FoodAction };
    }
  } catch { }
  return { cleanContent: content.replace(FOOD_TAG_REGEX, '').trim() };
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nutrition-chat`;
const CLIENT_TIMEOUT_MS = 45000;
const MAX_CLIENT_RETRIES = 2;

const FRIENDLY_ERRORS: Record<string, string> = {
  RATE_LIMITED: "🧘 אני מקבל הרבה שאלות כרגע! תן לי רגע ונסה שוב.",
  CREDITS_EXHAUSTED: "⚡ נגמרו הקרדיטים של ה-AI. נסה שוב מאוחר יותר.",
  TIMEOUT: "⏳ זה לקח יותר מדי זמן. בוא ננסה שוב!",
  SERVICE_ERROR: "🔧 רגע של תחזוקה. נסה שוב בקרוב!",
  INTERNAL_ERROR: "🤔 קרה משהו לא צפוי. בוא ננסה שוב!",
  FETCH_FAILED: "😅 לא הצלחתי להתחבר לשרת. נסה שוב בעוד רגע.",
  UNAUTHORIZED: "🔒 נראה שיש בעיית התחברות או חסרות הרשאות. רענן את העמוד נסה שוב.",
  NOT_FOUND: "🔍 צ'אט ה-AI עדיין לא זמין בשרת. ודא שסיימת את תהליך ההתקנה.",
};

function getFriendlyError(code?: string): string {
  if (code && FRIENDLY_ERRORS[code]) return FRIENDLY_ERRORS[code];
  return "🤔 מאמן ה-AI שלך לוקח הפסקה קצרה. נסה שוב בעוד רגע! (שגיאה מהשרת)";
}

function classifyError(e: any): string {
  if (e?.name === 'AbortError' || e?.code === 20) return 'TIMEOUT';
  if (e?.code === 401 || e?.code === 403) return 'UNAUTHORIZED';
  if (typeof e?.code === 'string') return e.code;
  return 'FETCH_FAILED';
}

export default function NutritionCoach({ onClose, userName, onAddMeal, bankingContext }: NutritionCoachProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastFailedInput, setLastFailedInput] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [titleGenerated, setTitleGenerated] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => { return () => { abortRef.current?.abort(); }; }, []);

  useEffect(() => { loadSessions(); }, []);

  const loadSessions = async () => {
    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false });
    if (data) setSessions(data as ChatSession[]);
  };

  const loadSessionMessages = async (sessionId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(data.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })));
    }
    setTitleGenerated(true);
  };

  const createSession = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: user.id, title: 'שיחה חדשה' })
      .select()
      .single();
    if (error || !data) return null;
    setSessions(prev => [data as ChatSession, ...prev]);
    return data.id;
  };

  const saveMessage = async (sessionId: string, role: string, content: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      user_id: user.id,
      role,
      content,
    });
    await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);
  };

  const truncateToWords = (text: string, count: number) => {
    const words = text.trim().split(/\s+/);
    if (words.length <= count) return text;
    return words.slice(0, count).join(' ') + '...';
  };

  const autoGenerateTitle = async (sessionId: string, msgs: Msg[]) => {
    if (titleGenerated) return;
    const userMsg = msgs.find(m => m.role === 'user' && !m.error);
    if (!userMsg) return;

    setTitleGenerated(true);

    // Initial fallback: First 4 words of the user's message
    const fallbackTitle = truncateToWords(userMsg.content, 4);
    const currentSession = sessions.find(s => s.id === sessionId);
    
    if (currentSession && (currentSession.title === 'שיחה חדשה' || !currentSession.title)) {
      await supabase.from('chat_sessions').update({ title: fallbackTitle }).eq('id', sessionId);
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: fallbackTitle } : s));
    }

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action: 'generate-title',
          // Only send the user's first message to ensure the title is user-centric
          messages: [{ role: 'user', content: userMsg.content }],
        }),
      });
      if (resp.ok) {
        let { title } = await resp.json();
        if (title && title !== 'שיחה חדשה') {
          // Strictly enforce 4 word limit on AI response too
          title = truncateToWords(title, 4);
          await supabase.from('chat_sessions').update({ title }).eq('id', sessionId);
          setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title } : s));
        }
      }
    } catch { /* non-critical */ }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setTitleGenerated(false);
    setLastFailedInput(null);
    setSidebarOpen(false);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    loadSessionMessages(id);
    setLastFailedInput(null);
    setSidebarOpen(false);
  };

  const handleRename = async (id: string, title: string) => {
    await supabase.from('chat_sessions').update({ title }).eq('id', id);
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s));
  };

  const handlePin = async (id: string, pinned: boolean) => {
    await supabase.from('chat_sessions').update({ is_pinned: pinned }).eq('id', id);
    setSessions(prev => prev.map(s => s.id === id ? { ...s, is_pinned: pinned } : s));
  };

  const handleDelete = async (id: string) => {
    await supabase.from('chat_sessions').delete().eq('id', id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) handleNewChat();
  };

  const handleDeleteAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from('chat_sessions').delete().eq('user_id', user.id);
    setSessions([]);
    handleNewChat();
    toast.success('כל השיחות נמחקו');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('התמונה גדולה מדי (מקסימום 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const send = useCallback(async (overrideInput?: string, overrideImage?: string) => {
    const text = (overrideInput ?? input).trim();
    const image = overrideImage ?? selectedImage;
    if ((!text && !image) || isLoading) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = await createSession();
      if (!sessionId) return;
      setActiveSessionId(sessionId);
    }

    const userMsg: Msg = { role: 'user', content: text, imageUrl: image || undefined };
    const prevMessages = overrideInput ? messages : [...messages, userMsg];
    if (!overrideInput) setMessages(prev => [...prev, userMsg]);
    
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);
    setLastFailedInput(null);

    await saveMessage(sessionId, 'user', text + (image ? ' [תמונה מצורפת]' : ''));

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let assistantSoFar = '';
    let succeeded = false;

    for (let attempt = 0; attempt <= MAX_CLIENT_RETRIES && !succeeded; attempt++) {
      if (controller.signal.aborted) break;
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const cleanMessages = prevMessages.filter(m => !m.error).map(m => ({ role: m.role, content: m.content }));

        // Inject banking context as first message so AI knows the real daily target
        const bankingNote = bankingContext
          ? `[CONTEXT UPDATE - IMPORTANT]: The user's calorie target for TODAY has been dynamically adjusted by the Smart Balance (Calorie Banking) system. 
- Base target (from profile): ${bankingContext.baseTarget} kcal
- TODAY's ACTUAL target: ${bankingContext.dynamicTarget} kcal
- Rollover adjustment: ${bankingContext.rollover > 0 ? '+' : ''}${Math.round(bankingContext.rollover)} kcal (${bankingContext.status === 'saved' ? 'bonus from savings yesterday' : bankingContext.status === 'overage' ? `debt from overage${bankingContext.spreadDays > 0 ? ` spread over ${bankingContext.spreadDays} days` : ' yesterday'}` : 'neutral'})
- Summary: ${bankingContext.explanation}
Always use ${bankingContext.dynamicTarget} kcal as the calorie target when answering questions about today. NEVER use ${bankingContext.baseTarget} as today's target.`
          : null;

        const currentHour = new Date().getHours();
        const currentMinutes = new Date().getMinutes();
        const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;
        const suggestedMeal = getCurrentMealType();

        const messagesWithContext = [
          { 
            role: 'user' as const, 
            content: `[SYSTEM CONTEXT - IMPORTANT]: 
Current time is ${currentTimeStr}.
Based on the time, the default meal category should be: '${suggestedMeal}'.
You are aware of the 'late_night' (לילה מאוחרת) category for foods eaten late at night.
The user wants you to monitor this specifically to identify "difficult times" or triggers for late-night eating.
When analyzing or suggesting, be supportive about late-night habit changes.
${bankingNote || ''}` 
          },
          { role: 'assistant' as const, content: 'מובן, אני מודע לשעה (' + currentTimeStr + ') ולעדכונים לגבי סוגי הארוחות.' },
          ...cleanMessages
        ];

        const timeoutId = setTimeout(() => { if (!succeeded) controller.abort(); }, CLIENT_TIMEOUT_MS);

        const resp = await fetch(CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            messages: messagesWithContext.map(m => ({
              role: m.role,
              content: m.content,
              ...(m.role === 'user' && (m as any).imageUrl ? { image_url: (m as any).imageUrl } : {})
            }))
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!resp.ok) {
          let errData: any = {};
          try { errData = await resp.json(); } catch { try { await resp.text(); } catch { } }
          if (resp.status === 402 || resp.status === 400) {
            throw { code: errData.code || 'CREDITS_EXHAUSTED', noRetry: true };
          }
          if (attempt < MAX_CLIENT_RETRIES) {
            await new Promise(r => setTimeout(r, 1500 * Math.pow(2, attempt) + Math.random() * 500));
            continue;
          }
          throw { code: errData.code || 'SERVICE_ERROR' };
        }

        if (!resp.body) throw { code: 'SERVICE_ERROR' };
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = '';
        let streamDone = false;

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') { streamDone = true; break; }
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                assistantSoFar += content;
                const current = assistantSoFar;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant' && !last.error) {
                    return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: current } : m);
                  }
                  return [...prev, { role: 'assistant', content: current }];
                });
              }
            } catch {
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        }

        succeeded = true;
        if (assistantSoFar) {
          const { cleanContent, foodAction } = parseFoodAction(assistantSoFar);
          // Update the message with clean content and food action
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant' && !last.error) {
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: cleanContent, foodAction } : m);
            }
            return prev;
          });
          await saveMessage(sessionId!, 'assistant', cleanContent);
          autoGenerateTitle(sessionId!, [...prevMessages, { role: 'assistant' as const, content: cleanContent }]);
        }
      } catch (e: any) {
        if (e?.noRetry || attempt >= MAX_CLIENT_RETRIES || controller.signal.aborted) {
          const code = classifyError(e);
          
          if (code === 'UNAUTHORIZED') {
            await supabase.auth.signOut().catch(() => {});
            for (let k = 0; k < localStorage.length; k++) {
              const key = localStorage.key(k);
              if (key?.startsWith('sb-')) localStorage.removeItem(key);
            }
            window.location.reload();
            break;
          }

          setMessages(prev => [...prev, { role: 'assistant', content: getFriendlyError(code), error: true }]);
          setLastFailedInput(text);
          break;
        }
        await new Promise(r => setTimeout(r, 1500 * Math.pow(2, attempt) + Math.random() * 500));
      }
    }

    setIsLoading(false);
  }, [input, isLoading, messages, activeSessionId, titleGenerated, bankingContext]);

  const retry = useCallback(() => {
    if (lastFailedInput) {
      setMessages(prev => {
        const idx = prev.length - 1;
        if (prev[idx]?.error) return prev.slice(0, idx);
        return prev;
      });
      send(lastFailedInput);
    }
  }, [lastFailedInput, send]);

  const handleFoodAction = useCallback(async (msgIndex: number, accepted: boolean) => {
    setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, foodActionHandled: true } : m));

    if (!accepted || !onAddMeal) return;

    const msg = messages[msgIndex];
    if (!msg?.foodAction?.foods) return;

    const mealTypeLabels: Record<string, string> = {
      breakfast: 'בוקר',
      lunch: 'צהריים',
      dinner: 'ערב',
      snack: 'חטיף',
      late_night: 'לילה מאוחרת'
    };

    for (const food of msg.foodAction.foods) {
      const entry: MealEntry = {
        id: crypto.randomUUID(),
        foodItem: {
          id: crypto.randomUUID(),
          name: food.name,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fats: food.fats,
          servingSize: food.serving_size,
          category: 'general',
        },
        quantity: food.quantity,
        mealType: food.meal_type,
        timestamp: new Date().toISOString(),
      };
      await onAddMeal(entry);
    }

    const foodNames = msg.foodAction.foods.map(f => f.name).join(', ');
    toast.success(`✅ ${foodNames} נוסף ליומן!`);
  }, [messages, onAddMeal]);

  const suggestions = [
    '🍽️ מה כדאי לי לאכול לארוחת ערב?',
    '🥤 כמה מים כדאי לי לשתות?',
    '💪 האם אני עומד ביעדי החלבון?',
    '🍫 אני משתוקק למשהו מתוק',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      className="fixed inset-0 z-50 glass-screen flex flex-col overflow-hidden"
    >
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[5] bg-foreground"
              onClick={() => setSidebarOpen(false)}
            />
            <ChatSessionSidebar
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelect={handleSelectSession}
              onNew={handleNewChat}
              onRename={handleRename}
              onPin={handlePin}
              onDelete={handleDelete}
              onDeleteAll={handleDeleteAll}
              onClose={() => setSidebarOpen(false)}
            />
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-safe pb-3 border-b border-border/50 bg-background/80 backdrop-blur-xl relative z-[1]">
        <motion.button onClick={onClose} whileTap={{ scale: 0.9 }} className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
          <ArrowRight className="w-4 h-4" />
        </motion.button>
        <motion.button onClick={() => setSidebarOpen(true)} whileTap={{ scale: 0.9 }} className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
          <Menu className="w-4 h-4" />
        </motion.button>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full nova-gradient flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold font-display text-[15px] leading-tight truncate">
              {activeSessionId ? sessions.find(s => s.id === activeSessionId)?.title || 'NovaFit AI' : 'NovaFit AI'}
            </h2>
            <p className="text-[11px] text-muted-foreground">מאמן התזונה האישי שלך</p>
          </div>
        </div>
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center text-center pt-12 pb-6"
          >
            <motion.div
              className="w-16 h-16 rounded-2xl nova-gradient flex items-center justify-center mb-5"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </motion.div>
            <h3 className="font-bold font-display text-lg">היי {userName}! 👋</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-[260px]">
              אני מאמן התזונה שלך. שאל אותי כל דבר!
            </p>
            <div className="grid grid-cols-2 gap-2 mt-6 w-full max-w-sm">
              {suggestions.map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setInput(s)}
                  className="text-right p-3 rounded-xl bg-muted/50 border border-border/50 text-xs font-medium hover:bg-muted/80 transition-colors"
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
            >
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : msg.error
                    ? 'bg-destructive/5 border border-destructive/20 rounded-bl-md'
                    : 'bg-muted/60 border border-border/40 rounded-bl-md'
                }`}>
                {msg.imageUrl && (
                  <div className="mb-2 relative rounded-lg overflow-hidden border border-border/20">
                    <img src={msg.imageUrl} alt="User upload" className="max-w-full h-auto object-cover max-h-48" />
                  </div>
                )}
                {msg.role === 'assistant' ? (
                  <>
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ol]:mb-2">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    {msg.error && lastFailedInput && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={retry}
                        className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        נסה שוב
                      </motion.button>
                    )}
                    {msg.foodAction && !msg.foodActionHandled && !isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/20"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <UtensilsCrossed className="w-4 h-4 text-primary" />
                          <span className="text-xs font-semibold text-foreground">האם להוסיף ליומן?</span>
                        </div>
                        <div className="space-y-1.5 mb-3">
                          {msg.foodAction.foods.map((food, fi) => (
                            <div key={fi} className="flex items-center justify-between text-xs">
                              <span className="font-medium">{food.name} {food.quantity > 1 ? `×${food.quantity}` : ''}</span>
                              <span className="text-muted-foreground">{Math.round(food.calories * food.quantity)} קק״ל</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            shimmer
                            onClick={() => handleFoodAction(i, true)}
                            className="flex-1 h-8 text-xs font-bold gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            כן, הוסף
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFoodAction(i, false)}
                            className="h-8 text-xs font-bold gap-1.5 px-3"
                          >
                            <X className="w-3.5 h-3.5" />
                            לא
                          </Button>
                        </div>
                      </motion.div>
                    )}
                    {msg.foodActionHandled && msg.foodAction && (
                      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-primary" />
                        נוסף ליומן
                      </div>
                    )}
                  </>
                ) : (
                  <span>{msg.content}</span>
                )}
              </div>
              {msg.role === 'assistant' && (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.error ? 'bg-destructive/10' : 'nova-gradient'}`}>
                  {msg.error ? <AlertCircle className="w-3.5 h-3.5 text-destructive" /> : <Bot className="w-3.5 h-3.5 text-primary-foreground" />}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5 justify-end">
            <div className="bg-muted/60 border border-border/40 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-muted-foreground/40"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </div>
            <div className="w-7 h-7 rounded-full nova-gradient flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border/50 bg-background/80 backdrop-blur-xl px-4 py-3 pb-safe">
        <div className="max-w-lg mx-auto flex flex-col gap-2">
          {selectedImage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative self-start"
            >
              <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-primary shadow-lg">
                <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md scale-90 hover:scale-110 transition-transform"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          <div className="flex gap-2 items-end">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageSelect}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="h-[42px] w-[42px] rounded-xl shrink-0 bg-muted/50 border-border/50"
            >
              <Camera className="w-4 h-4 text-muted-foreground" />
            </Button>
            
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="שאל אותי או צרף תמונה..."
              rows={1}
              className="flex-1 resize-none rounded-xl bg-muted/50 border border-border/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all min-h-[42px] max-h-[120px]"
              style={{ height: 'auto', overflowY: input.split('\n').length > 3 ? 'auto' : 'hidden' }}
            />
            <Button
              shimmer
              onClick={() => send()}
              disabled={(!input.trim() && !selectedImage) || isLoading}
              className="h-[42px] w-[42px] rounded-xl p-0 shadow-md shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
