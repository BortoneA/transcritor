import React, { useState } from 'react';
import { Copy, Check, FileText, Tags, ClipboardList, Lightbulb } from 'lucide-react';
import { MedicalRecord } from '../services/geminiService';

interface MedicalRecordGridProps {
  record: MedicalRecord | null;
  isLoading: boolean;
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
          <div className={`text-slate-400 group-hover:text-slate-600 transition-colors`}>
            {icon}
          </div>
          <h3 className="font-bold text-slate-800 text-sm tracking-tight">{title}</h3>
        </div>
        <button
          onClick={handleCopy}
          disabled={isLoading || !content}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          title="Copiar"
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

export const MedicalRecordGrid: React.FC<MedicalRecordGridProps> = ({ record, isLoading }) => {
  return (
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
  );
};
