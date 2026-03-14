import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pin, PinOff, Pencil, Trash2, MessageSquare, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ChatSession {
  id: string;
  title: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface Props {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  onClose: () => void;
}

export default function ChatSessionSidebar({
  sessions, activeSessionId, onSelect, onNew, onRename, onPin, onDelete, onDeleteAll, onClose,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const pinned = sessions.filter(s => s.is_pinned).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const unpinned = sessions.filter(s => !s.is_pinned).sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const startEdit = (s: ChatSession) => {
    setEditingId(s.id);
    setEditTitle(s.title);
  };

  const confirmEdit = () => {
    if (editingId && editTitle.trim()) {
      onRename(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  const renderSession = (s: ChatSession) => {
    const isActive = s.id === activeSessionId;
    const isEditing = s.id === editingId;

    return (
      <motion.div
        key={s.id}
        layout
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 12 }}
        className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
          isActive ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/60'
        }`}
        onClick={() => !isEditing && onSelect(s.id)}
      >
        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        
        {isEditing ? (
          <div className="flex-1 flex items-center gap-1">
            <Input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditingId(null); }}
              className="h-6 text-xs px-1.5 py-0"
              autoFocus
              onClick={e => e.stopPropagation()}
            />
            <button onClick={(e) => { e.stopPropagation(); confirmEdit(); }} className="p-0.5 hover:text-primary">
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <span className={`flex-1 text-xs font-medium truncate ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
            {s.title}
          </span>
        )}

        {!isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onPin(s.id, !s.is_pinned); }}
              className="p-1 rounded hover:bg-muted"
              title={s.is_pinned ? 'בטל הצמדה' : 'הצמד'}
            >
              {s.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); startEdit(s); }}
              className="p-1 rounded hover:bg-muted"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
              className="p-1 rounded hover:bg-destructive/20 hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ x: -280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -280, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute inset-y-0 start-0 w-[280px] z-50 bg-card border-e border-border/50 flex flex-col shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe pb-3 border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-2">
          <h3 className="font-bold font-display text-sm">היסטוריית שיחות</h3>
          {sessions.length > 0 && !confirmDeleteAll && (
            <button 
              onClick={() => setConfirmDeleteAll(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="מחק הכל"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        {confirmDeleteAll ? (
          <div className="flex items-center gap-2 bg-destructive/10 px-2 py-1 rounded-lg border border-destructive/20 animate-in fade-in zoom-in duration-200">
            <span className="text-[10px] font-bold text-destructive">בטוח?</span>
            <button onClick={() => { onDeleteAll(); setConfirmDeleteAll(false); }} className="text-[10px] bg-destructive text-white px-2 py-0.5 rounded font-bold shadow-sm">כן</button>
            <button onClick={() => setConfirmDeleteAll(false)} className="text-[10px] bg-muted px-2 py-0.5 rounded font-bold">לא</button>
          </div>
        ) : (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* New Chat Button */}
      <div className="px-3 py-2">
        <Button onClick={onNew} variant="outline" size="sm" className="w-full gap-2 text-xs">
          <Plus className="w-3.5 h-3.5" />
          שיחה חדשה
        </Button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {pinned.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-2 pb-1">
              📌 מוצמדים
            </p>
            <AnimatePresence>
              {pinned.map(renderSession)}
            </AnimatePresence>
          </>
        )}
        {unpinned.length > 0 && (
          <>
            {pinned.length > 0 && (
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-3 pb-1">
                אחרונים
              </p>
            )}
            <AnimatePresence>
              {unpinned.map(renderSession)}
            </AnimatePresence>
          </>
        )}
        {sessions.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">
            אין שיחות עדיין.<br />התחל שיחה חדשה!
          </p>
        )}
      </div>
    </motion.div>
  );
}
