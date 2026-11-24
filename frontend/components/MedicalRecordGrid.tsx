import React, { useState } from 'react';
import { Copy, Check, FileText, Tags, ClipboardList, Lightbulb, Printer, CheckCheck } from 'lucide-react';
import { MedicalRecord } from '../services/geminiService';

interface MedicalRecordGridProps {
  record: MedicalRecord | null;
  isLoading: boolean;
  patientName?: string;
}

interface RecordCardProps {
  title: string;
  content?: string;
  isLoading: boolean;
  icon: React.ReactNode;
  colorClass: string;
}

const RecordCard = ({ title, content, isLoading, icon, colorClass }: RecordCardProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col h-full min-h-[200px] transition-all duration-300 hover:shadow-md group relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${colorClass}`}></div>
      
      <div className="flex items-center justify-between mb-4 pl-2">
        <div className="flex items-center space-x-2">
          <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
            {icon}
          </div>
          <h3 className="font-bold text-slate-800 text-sm tracking-tight">{title}</h3>
        </div>
        <button
          onClick={handleCopy}
          disabled={isLoading || !content}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          title="Copiar este bloco"
        >
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
        </button>
      </div>
      
      <div className="flex-grow overflow-y-auto pl-2 pr-1 custom-scrollbar">
        {isLoading ? (
          <div className="space-y-2.5 animate-pulse mt-2">
            <div className="h-3 bg-slate-100 rounded w-3/4"></div>
            <div className="h-3 bg-slate-100 rounded w-full"></div>
            <div className="h-3 bg-slate-100 rounded w-5/6"></div>
          </div>
        ) : content ? (
          <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">
            {content}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-2 opacity-50">
            <FileText size={24} strokeWidth={1} />
            <p className="italic text-xs font-medium">Aguardando processamento...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const MedicalRecordGrid: React.FC<MedicalRecordGridProps> = ({ record, isLoading, patientName }) => {
  const [copiedAll, setCopiedAll] = useState(false);

  const formatFullRecord = () => {
    if (!record) return '';
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const pName = patientName && patientName.trim() ? patientName.trim() : 'Paciente';

    return `===========================================================
REGISTRO CLÍNICO - ${pName.toUpperCase()}
Data: ${dateStr} às ${timeStr}
===========================================================

1. HISTÓRIA DA MOLÉSTIA ATUAL (HPMA):
${record.hpma || 'Não informado.'}

-----------------------------------------------------------
2. HIPÓTESE DIAGNÓSTICA / CID-10:
${record.cid || 'Não informado.'}

-----------------------------------------------------------
3. CONDUTA E PRESCRIÇÕES:
${record.conduta || 'Não informado.'}

-----------------------------------------------------------
4. SUGESTÕES CLÍNICAS COMPLEMENTARES:
${record.sugestao || 'Nenhuma.'}
===========================================================`;
  };

  const handleCopyAll = async () => {
    if (!record) return;
    const fullText = formatFullRecord();
    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handlePrint = () => {
    if (!record) return;
    window.print();
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Barra de Ações Globais do Prontuário */}
      {record && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-purple-50/70 border border-purple-100 rounded-xl p-3 print:hidden">
          <div className="flex items-center space-x-2 text-xs font-semibold text-purple-900">
            <CheckCheck size={16} className="text-purple-600" />
            <span>Prontuário Estruturado por IA</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyAll}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-white border border-purple-200 hover:border-purple-300 text-purple-700 hover:text-purple-900 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
              title="Copiar todo o prontuário formatado para colar no prontuário eletrônico"
            >
              {copiedAll ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              <span>{copiedAll ? 'Copiado!' : 'Copiar Prontuário Completo'}</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
              title="Imprimir ou Salvar em PDF"
            >
              <Printer size={14} />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* Grid de Cartões */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <RecordCard 
          title="HPMA" 
          content={record?.hpma} 
          isLoading={isLoading}
          icon={<FileText size={16} />}
          colorClass="from-blue-400 to-blue-600"
        />
        <RecordCard 
          title="CIDs Possíveis" 
          content={record?.cid} 
          isLoading={isLoading}
          icon={<Tags size={16} />}
          colorClass="from-amber-400 to-orange-500"
        />
        <RecordCard 
          title="Conduta" 
          content={record?.conduta} 
          isLoading={isLoading}
          icon={<ClipboardList size={16} />}
          colorClass="from-emerald-400 to-teal-500"
        />
        <RecordCard 
          title="Sugestão de Conduta IA" 
          content={record?.sugestao} 
          isLoading={isLoading}
          icon={<Lightbulb size={16} />}
          colorClass="from-purple-400 to-purple-600"
        />
      </div>
    </div>
  );
};
