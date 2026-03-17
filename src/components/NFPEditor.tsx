import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Cookie, Clock, Save, Loader2, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/lib/types';
import { toast } from 'sonner';

interface NFPEditorProps {
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] as const } },
};

export default function NFPEditor({ profile, onUpdateProfile }: NFPEditorProps) {
  const [favoriteFood, setFavoriteFood] = useState(profile.favoriteFood || '');
  const [dietaryWeakness, setDietaryWeakness] = useState(profile.dietaryWeakness || '');
  const [dailyHabits, setDailyHabits] = useState(profile.dailyHabits || '');
  const [medicalConditions, setMedicalConditions] = useState(profile.medicalConditions || '');
  const [chatHarshness, setChatHarshness] = useState(profile.chatHarshness || 'בינוני');
  const [coachName, setCoachName] = useState(profile.coachName || 'NovaFit AI');
  const [saving, setSaving] = useState(false);

  const hasChanges =
    favoriteFood !== (profile.favoriteFood || '') ||
    dietaryWeakness !== (profile.dietaryWeakness || '') ||
    dailyHabits !== (profile.dailyHabits || '') ||
    medicalConditions !== (profile.medicalConditions || '') ||
    chatHarshness !== (profile.chatHarshness || 'בינוני') ||
    coachName !== (profile.coachName || 'NovaFit AI');

  const handleSave = () => {
    setSaving(true);
    onUpdateProfile({
      ...profile,
      favoriteFood: favoriteFood.trim(),
      dietaryWeakness: dietaryWeakness.trim(),
      dailyHabits: dailyHabits.trim(),
      medicalConditions: medicalConditions.trim(),
      chatHarshness,
      coachName: coachName.trim() || 'NovaFit AI',
    });
    setTimeout(() => {
      setSaving(false);
      toast.success('ההעדפות עודכנו! מאמן ה-AI ישתמש בהן מיידית.');
    }, 300);
  };

  const fields = [
    {
      icon: Heart,
      label: 'אוכל אהוב',
      description: 'איזה אוכל הכי משמח אותך?',
      value: favoriteFood,
      onChange: setFavoriteFood,
      placeholder: 'למשל: סושי, פסטה, שווארמה...',
      multiline: false,
    },
    {
      icon: Cookie,
      label: 'חולשה תזונתית',
      description: 'איזה אוכל אתה לא יכול לעמוד בפניו?',
      value: dietaryWeakness,
      onChange: setDietaryWeakness,
      placeholder: 'למשל: גלידה, שוקולד, פיצה...',
      multiline: false,
    },
    {
      icon: Clock,
      label: 'הרגלים יומיים',
      description: 'דפוסי האכילה והשגרה שלך',
      value: dailyHabits,
      onChange: setDailyHabits,
      placeholder: 'למשל: מדלג על ארוחת בוקר, אוכל מאוחר, נשנש בעבודה...',
      multiline: false,
    },
    {
      icon: Stethoscope,
      label: 'מצבים רפואיים ואלרגיות',
      description: 'מידע בריאותי שמאמן ה-AI צריך לדעת',
      value: medicalConditions,
      onChange: setMedicalConditions,
      placeholder: 'למשל: סוכרת, אי-סבילות ללקטוז, אלרגיה לאגוזים...',
      multiline: true,
    },
  ];

  return (
    <motion.div variants={itemVariants} className="nova-card p-5">
      <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] mb-1 flex items-center gap-2">
        <Heart className="w-3.5 h-3.5 text-primary" /> העדפות אוכל (NFP)
      </h3>
      <p className="text-[11px] text-muted-foreground mb-4">
        מאמן ה-AI משתמש בנתונים אלו לייעוץ מותאם אישית. שינויים חלים מיידית.
      </p>

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.label}>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5">
              <field.icon className="w-3 h-3 text-primary" />
              {field.label}
            </label>
            <p className="text-[10px] text-muted-foreground mb-1.5">{field.description}</p>
            {field.multiline ? (
              <textarea
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                maxLength={500}
                className="w-full rounded-xl bg-muted/40 border border-border/50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
              />
            ) : (
              <input
                type="text"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder={field.placeholder}
                maxLength={200}
                className="w-full h-10 rounded-xl bg-muted/40 border border-border/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            )}
          </div>
        ))}
        
        {/* AI Chat Settings Section */}
        <div className="pt-4 mt-2 border-t border-border/50">
          <h4 className="text-xs font-semibold mb-3 flex items-center gap-1.5"><Heart className="w-3 h-3 text-primary" /> הגדרות מאמן AI</h4>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5">שם המאמן</label>
              <p className="text-[10px] text-muted-foreground mb-1.5">איך תרצה לקרוא למאמן ה-AI שלך?</p>
              <input
                type="text"
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                placeholder="למשל: NovaFit AI, דויד, אנה..."
                maxLength={50}
                className="w-full h-10 rounded-xl bg-muted/40 border border-border/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
            
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5">סגנון אימון (רמת קשיחות)</label>
              <p className="text-[10px] text-muted-foreground mb-2">איך תרצה שהמאמן יתייחס אליך?</p>
              
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'עדין', label: 'עדין ומכיל' },
                  { value: 'בינוני', label: 'מאוזן (מומלץ)' },
                  { value: 'קשוח מאוד', label: 'קשוח בלי רחמים' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setChatHarshness(option.value)}
                    className={`py-2 rounded-lg text-[11px] font-medium transition-all ${
                      chatHarshness === option.value
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full gap-2 h-10 rounded-xl text-xs font-semibold"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            שמור העדפות
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
