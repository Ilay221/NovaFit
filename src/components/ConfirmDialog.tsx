import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'כן, בטוח',
  cancelLabel = 'ביטול',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCancel}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="fixed z-[101] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(85vw,340px)]"
          >
            <div className="bg-card border border-border/60 rounded-3xl shadow-2xl overflow-hidden">
              {/* Header Accent */}
              <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />

              <div className="px-6 pt-6 pb-5 text-center" dir="rtl">
                {/* Icon */}
                <motion.div
                  initial={{ rotate: -10, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                  className="w-14 h-14 rounded-2xl bg-amber-500/10 mx-auto flex items-center justify-center mb-4"
                >
                  <AlertTriangle className="w-7 h-7 text-amber-500" />
                </motion.div>

                {/* Title */}
                <h3 className="text-[16px] font-bold font-display mb-1.5 text-foreground">
                  {title}
                </h3>

                {/* Message */}
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {message}
                </p>
              </div>

              {/* Buttons */}
              <div className="flex border-t border-border/50" dir="rtl">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onCancel}
                  className="flex-1 py-3.5 text-[14px] font-semibold text-muted-foreground hover:bg-muted/50 transition-colors border-l border-border/50"
                >
                  {cancelLabel}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onConfirm}
                  className="flex-1 py-3.5 text-[14px] font-bold text-primary hover:bg-primary/5 transition-colors"
                >
                  {confirmLabel}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
