import React, { useState, useEffect } from 'react';
import { X, Search, Trash2, Calendar, Clock, FileAudio, FileText, Stethoscope, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { ConsultationSummary, listConsultationSummaries, deleteConsultation, clearAllConsultations } from '../services/storageService';

interface ConsultationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConsultation: (id: string) => void;
}

export const ConsultationHistoryModal: React.FC<ConsultationHistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectConsultation,
}) => {
  const [consultations, setConsultations] = useState<ConsultationSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const list = await listConsultationSummaries();
      setConsultations(list);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      setSearchTerm('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza de que deseja excluir este atendimento do histórico local?')) {
      try {
        await deleteConsultation(id);
        setConsultations((prev) => prev.filter((c) => c.id !== id));
      } catch (err) {
        console.error('Erro ao deletar:', err);
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Atenção: Isso apagará TODOS os atendimentos salvos localmente neste navegador. Deseja continuar?')) {
      try {
        await clearAllConsultations();
        setConsultations([]);
      } catch (err) {
        console.error('Erro ao limpar histórico:', err);
      }
    }
  };

  const filtered = consultations.filter((c) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = c.patientName.toLowerCase().includes(term);
    const dateStr = new Date(c.createdAt).toLocaleDateString('pt-BR');
    const dateMatch = dateStr.includes(term);
    const previewMatch = c.recordPreview?.toLowerCase().includes(term);
    return nameMatch || dateMatch || previewMatch;
  });

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const dateStr = d.toLocaleDateString('pt-BR');
    const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return { dateStr, timeStr };
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Histórico de Atendimentos</h2>
              <p className="text-xs text-slate-500 font-medium">Consultas e gravações salvas com segurança no navegador</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por paciente ou data..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={loadHistory}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Recarregar histórico"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              <span>Atualizar</span>
            </button>
            {consultations.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                title="Apagar todo o histórico"
              >
                <Trash2 size={14} />
                <span>Limpar Tudo</span>
              </button>
            )}
          </div>
        </div>

        {/* Content / List */}
        <div className="p-6 overflow-y-auto flex-grow custom-scrollbar bg-slate-50/30">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium">Carregando consultas salvas...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center px-4">
              <Calendar size={48} strokeWidth={1} className="mb-3 opacity-40 text-slate-500" />
              <h3 className="text-base font-bold text-slate-700 mb-1">
                {searchTerm ? 'Nenhuma consulta encontrada' : 'Nenhuma consulta salva'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                {searchTerm
                  ? 'Tente buscar por outro nome de paciente ou data.'
                  : 'Assim que você gravar ou transcrever um atendimento, ele será salvo automaticamente aqui para consulta posterior.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => {
                const { dateStr, timeStr } = formatDate(item.createdAt);
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectConsultation(item.id);
                      onClose();
                    }}
                    className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all duration-200 group flex items-center justify-between gap-4"
                  >
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center space-x-3 mb-1.5">
                        <h4 className="text-base font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                          {item.patientName}
                        </h4>
                        <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium shrink-0">
                          <Clock size={12} />
                          <span>{dateStr} às {timeStr}</span>
                        </div>
                      </div>

                      {/* Badges de Conteúdo Disponível */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {item.hasAudio && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                            <FileAudio size={11} />
                            <span>Áudio {item.audioSizeBytes ? `(${(item.audioSizeBytes / 1024 / 1024).toFixed(1)}MB)` : ''}</span>
                          </span>
                        )}
                        {item.hasTranscription && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                            <FileText size={11} />
                            <span>Transcrição</span>
                          </span>
                        )}
                        {item.hasRecord && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                            <Stethoscope size={11} />
                            <span>Prontuário IA</span>
                          </span>
                        )}
                      </div>

                      {/* Snippet do prontuário se houver */}
                      {item.recordPreview && (
                        <p className="text-xs text-slate-500 line-clamp-1 italic font-normal">
                          "{item.recordPreview}"
                        </p>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={(e) => handleDelete(e, item.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors opacity-70 group-hover:opacity-100"
                        title="Excluir do histórico"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="p-2 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all">
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle size={14} className="text-slate-400" />
            <span>Dados armazenados localmente no seu dispositivo (IndexedDB). Não enviados a servidores externos.</span>
          </div>
          <span className="font-semibold text-slate-700">{consultations.length} atendimentos salvos</span>
        </div>
      </div>
    </div>
  );
};
