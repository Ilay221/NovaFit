import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ScanLine, Search, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MealEntry } from '@/lib/types';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  onAddMeal: (entry: MealEntry) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onAddMeal, onClose }: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(true);

  // Mock a scan after 3 seconds for demonstration if they stay on the screen
  useEffect(() => {
    if (!isScanning) return;
    const timer = setTimeout(() => {
      haptics.success();
      toast.success('ברקוד זוהה בהצלחה (הדגמה)');
      setIsScanning(false);
      setManualCode('7290000000000'); // Mock Israeli barcode
    }, 4500);
    return () => clearTimeout(timer);
  }, [isScanning]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    haptics.light();
    setIsScanning(false);
    toast.info('מחפש מוצר...');
    
    // Simulate finding a product and opening the logger
    setTimeout(() => {
       haptics.success();
       // For MVP, we just add a mock product directly. In reality, this would query OpenFoodFacts.
       onAddMeal({
         id: crypto.randomUUID(),
         foodItem: {
           id: `barcode-${manualCode}`,
           name: `מוצר סרוק (${manualCode})`,
           calories: 120,
           protein: 5,
           carbs: 15,
           fats: 3,
           servingSize: '100 גרם',
           category: 'snack'
         },
         quantity: 1,
         mealType: 'snack',
         timestamp: new Date().toISOString()
       });
       onClose();
    }, 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border/50">
        <h2 className="text-xl font-bold font-display">סורק ברקוד</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col p-5">
        
        {/* Mock Scanner Area */}
        <div className="relative w-full aspect-square max-w-sm mx-auto bg-muted/30 rounded-3xl border-2 border-dashed border-primary/20 overflow-hidden flex items-center justify-center mb-8">
          {isScanning ? (
            <>
              <PackageOpen className="w-16 h-16 text-muted-foreground/30 absolute" />
              <motion.div 
                className="w-full h-1 bg-primary shadow-[0_0_15px_rgba(var(--primary),0.8)] absolute left-0"
                animate={{ top: ['10%', '90%', '10%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute bottom-4 text-xs font-medium text-muted-foreground bg-background/80 px-3 py-1 rounded-full">
                מכוון מצלמה לברקוד...
              </div>
            </>
          ) : (
            <div className="text-center">
              <ScanLine className="w-12 h-12 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">ברקוד נקלט</p>
              <p className="text-xs text-muted-foreground tabular-nums">{manualCode}</p>
            </div>
          )}
        </div>

        {/* Manual Entry */}
        <div className="mt-auto pb-safe">
          <p className="text-sm font-medium text-center text-muted-foreground mb-3">או הזן ברקוד ידנית</p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input 
              type="number"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="הקרידו ברקוד כאן"
              className="rounded-xl h-12 bg-muted/50 border-0"
            />
            <Button type="submit" className="h-12 rounded-xl px-6" disabled={!manualCode.trim()}>
              <Search className="w-4 h-4 ml-2" /> חפש
            </Button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
