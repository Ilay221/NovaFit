import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subDays, isSameDay, isToday } from 'date-fns';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { haptics } from '@/lib/haptics';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface DateStripProps {
  selectedDate: Date;
  onChangeDate: (date: Date) => void;
}

export default function DateStrip({ selectedDate, onChangeDate }: DateStripProps) {
  const [dates, setDates] = useState<Date[]>([]);

  useEffect(() => {
    const today = new Date();
    const generated: Date[] = [];
    for (let i = 3; i >= 1; i--) {
      generated.push(subDays(today, i));
    }
    generated.push(today);
    setDates(generated);
  }, []);

  const handleSelect = (date: Date) => {
    if (!isSameDay(date, selectedDate)) {
      haptics.light();
      onChangeDate(date);
    }
  };

  const currentIndex = dates.findIndex(d => isSameDay(d, selectedDate));

  const goBack = () => {
    if (currentIndex > 0) {
      haptics.light();
      onChangeDate(dates[currentIndex - 1]);
    }
  };

  const goForward = () => {
    if (currentIndex < dates.length - 1) {
      haptics.light();
      onChangeDate(dates[currentIndex + 1]);
    }
  };

  return (
    <div className="w-full px-1">
      <div className="flex items-center justify-center gap-2">
        {/* Right Arrow (RTL: navigates backwards in time) */}
        <motion.button
          onClick={goBack}
          whileTap={{ scale: 0.85 }}
          disabled={currentIndex <= 0}
          className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </motion.button>

        {/* Date Pills */}
        <div className="flex gap-1.5 items-center">
          {dates.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const isTodayDate = isToday(date);
            const dayName = format(date, 'EEE', { locale: he });
            const dayNum = format(date, 'd');

            return (
              <motion.button
                key={date.toISOString()}
                onClick={() => handleSelect(date)}
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.05 }}
                className="relative flex flex-col items-center justify-center transition-all duration-300"
              >
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      layoutId="date-highlight"
                      className="absolute inset-0 bg-primary rounded-2xl shadow-lg"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </AnimatePresence>

                <div className={`relative z-10 flex flex-col items-center justify-center w-[58px] h-[62px] rounded-2xl ${
                  isSelected
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}>
                  <span className={`text-[10px] font-semibold tracking-wide mb-0.5 ${
                    isSelected ? 'text-primary-foreground/70' : ''
                  }`}>
                    {isTodayDate ? 'היום' : dayName}
                  </span>
                  <span className="text-[18px] font-bold font-display tabular-nums leading-none">
                    {dayNum}
                  </span>
                  {isTodayDate && !isSelected && (
                    <motion.div 
                      className="w-1 h-1 rounded-full bg-primary mt-1"
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Left Arrow (RTL: navigates forward in time) */}
        <motion.button
          onClick={goForward}
          whileTap={{ scale: 0.85 }}
          disabled={currentIndex >= dates.length - 1}
          className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
}
