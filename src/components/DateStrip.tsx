import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { format, addDays, subDays, isSameDay, isToday } from 'date-fns';
import { he } from 'date-fns/locale';
import { haptics } from '@/lib/haptics';

interface DateStripProps {
  selectedDate: Date;
  onChangeDate: (date: Date) => void;
}

export default function DateStrip({ selectedDate, onChangeDate }: DateStripProps) {
  // Generate a window of dates: 14 days back, 1 day forward
  const [dates, setDates] = useState<Date[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const today = new Date();
    const generated: Date[] = [];
    // 14 days back
    for (let i = 14; i >= 1; i--) {
      generated.push(subDays(today, i));
    }
    // Today
    generated.push(today);
    // 1 day forward (for planning tomorrow)
    generated.push(addDays(today, 1));
    
    setDates(generated);
  }, []);

  // Center the selected date on mount or when it changes
  useEffect(() => {
    if (!scrollRef.current) return;
    const selectedIdx = dates.findIndex(d => isSameDay(d, selectedDate));
    if (selectedIdx === -1) return;

    const el = scrollRef.current.children[selectedIdx] as HTMLElement;
    if (el) {
       const scrollPos = el.offsetLeft - (scrollRef.current.clientWidth / 2) + (el.clientWidth / 2);
       scrollRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }, [selectedDate, dates]);

  const handleSelect = (date: Date) => {
    if (!isSameDay(date, selectedDate)) {
      haptics.light();
      onChangeDate(date);
    }
  };

  return (
    <div className="w-full relative py-2">
      {/* Fade Edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      <div 
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto hide-scrollbar px-safe scroll-smooth snap-x"
        dir="rtl"
      >
        {dates.map((date) => {
          const isSelected = isSameDay(date, selectedDate);
          const isCurrentToday = isToday(date);
          
          return (
            <motion.button
              key={date.toISOString()}
              onClick={() => handleSelect(date)}
              className={`flex flex-col items-center justify-center min-w-[64px] h-[72px] rounded-2xl snap-center shrink-0 transition-colors ${
                isSelected 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <span className={`text-[11px] font-semibold uppercase tracking-wider mb-1 ${
                 isSelected ? 'text-primary-foreground/80' : ''
              }`}>
                {format(date, 'EEEE', { locale: he })}
              </span>
              <span className="text-[20px] font-bold font-display tabular-nums leading-none">
                {format(date, 'd')}
              </span>
              {isCurrentToday && !isSelected && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 absolute bottom-2" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
