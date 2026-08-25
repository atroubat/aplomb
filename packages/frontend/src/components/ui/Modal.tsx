import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const previousOverflow = document.body.style.overflow;
    if (open) {
      document.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg';

  return createPortal(
    <div className="modal-shell fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className={`modal-panel relative w-full ${sizeClass} glass rounded-2xl shadow-2xl animate-fade-in`}>
        <div className="modal-header flex items-center justify-between px-6 py-4 border-b border-white/40 dark:border-white/10">
          <h2 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-500/10 dark:hover:bg-white/10 transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <div className="modal-body p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
