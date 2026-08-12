import React from 'react';
import { X, Send, MessageSquarePlus } from 'lucide-react';

interface EditRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: string;
  setSuggestion: (val: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const EditRecordModal: React.FC<EditRecordModalProps> = ({
  isOpen, onClose, suggestion, setSuggestion, onSubmit, isSubmitting
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={!isSubmitting ? onClose : undefined}
      ></div>
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
              <MessageSquarePlus size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Sugerir Edição</h2>
          </div>
          <button 
            onClick={onClose} 
            disabled={isSubmitting} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">
            Descreva o que você gostaria de alterar, adicionar ou remover do prontuário gerado. A IA irá reescrever o conteúdo com base na sua instrução.
          </p>
          <textarea
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            placeholder="Ex: Adicione que o paciente tem alergia a dipirona e mude a conduta para repouso de 3 dias."
            className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none"
            disabled={isSubmitting}
          />
        </div>
        
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end space-x-3">
          <button 
            onClick={onClose} 
            disabled={isSubmitting} 
            className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            onClick={onSubmit} 
            disabled={isSubmitting || !suggestion.trim()} 
            className="flex items-center px-6 py-2.5 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                Processando...
              </>
            ) : (
              <>
                <Send size={16} className="mr-2" />
                Aplicar Edição
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
