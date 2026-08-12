import React, { useState } from 'react';
import { Copy, Check, Trash2 } from 'lucide-react';

interface TranscriptionResultProps {
  text: string;
  onClear: () => void;
}

export const TranscriptionResult: React.FC<TranscriptionResultProps> = ({ text, onClear }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 mb-4 max-h-[400px]">
        <div className="prose prose-slate sm:prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
          {text}
        </div>
      </div>
      <div className="flex justify-end pt-4 border-t border-slate-100 space-x-3">
        <button
          onClick={onClear}
          className="flex items-center space-x-2 px-4 py-2 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-all shadow-sm focus:outline-none active:scale-95"
        >
          <Trash2 size={14} strokeWidth={2.5} />
          <span>Limpar</span>
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-2 px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm focus:outline-none active:scale-95"
        >
          {copied ? (
            <>
              <Check size={14} className="text-green-500" strokeWidth={3} />
              <span className="text-green-600">Copiado</span>
            </>
          ) : (
            <>
              <Copy size={14} strokeWidth={2.5} />
              <span>Copiar Texto</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
