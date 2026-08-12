import React, { useState, useCallback, useEffect } from 'react';
import { Mic, AlertCircle, Sparkles, RotateCcw, FileAudio, Stethoscope, User, Calendar, Clock, ChevronRight, BrainCircuit, Activity, CheckCircle2, Settings, MessageSquarePlus } from 'lucide-react';
import { TranscriptionResult } from './components/TranscriptionResult';
import { AudioRecorder } from './components/AudioRecorder';
import { MedicalRecordGrid } from './components/MedicalRecordGrid';
import { SettingsModal, AppSettings } from './components/SettingsModal';
import { EditRecordModal } from './components/EditRecordModal';
import { transcribeAudio, generateMedicalRecord, editMedicalRecord, MedicalRecord, DEFAULT_SYSTEM_INSTRUCTION } from './services/geminiService';

export default function App() {
  const [patientName, setPatientName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    return {
      language: localStorage.getItem('transcription_lang') || 'pt',
      customPrompt: localStorage.getItem('custom_ai_prompt') || DEFAULT_SYSTEM_INSTRUCTION,
      aiProvider: (localStorage.getItem('ai_provider') as 'gemini' | 'openrouter') || 'gemini',
      openRouterModel: localStorage.getItem('openrouter_model') || 'nvidia/nemotron-3.5-lightning:free'
    };
  });
  
  // Transcription states
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>('');
  const [transcription, setTranscription] = useState<string | null>(null);
  
  // Medical Record states
  const [isGeneratingRecord, setIsGeneratingRecord] = useState(false);
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecord | null>(null);
  
  // Edit Record states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSuggestion, setEditSuggestion] = useState('');
  const [isEditingRecord, setIsEditingRecord] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('transcription_lang', newSettings.language);
    localStorage.setItem('custom_ai_prompt', newSettings.customPrompt);
    localStorage.setItem('ai_provider', newSettings.aiProvider);
    localStorage.setItem('openrouter_model', newSettings.openRouterModel);
  };

  const handlePauseTranscription = useCallback(async (partialFile: File) => {
    setFile(partialFile);
    
    setIsTranscribing(true);
    setError(null);
    setTranscriptionStatus('Transcrevendo trecho parcial...');

    try {
      const result = await transcribeAudio(partialFile, '', settings.language, setTranscriptionStatus);
      setTranscription(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado durante a transcrição parcial.');
    } finally {
      setIsTranscribing(false);
      setTranscriptionStatus('');
    }
  }, [settings]);

  const handleRecordingComplete = useCallback((recordedFile: File) => {
    setFile(recordedFile);
    setError(null);
  }, []);

  const handleReset = useCallback(() => {
    setFile(null);
    setTranscription(null);
    setMedicalRecord(null);
    setError(null);
    setIsRecordingActive(false);
  }, []);

  const handleTranscribe = async () => {
    if (!file) return;

    setIsTranscribing(true);
    setError(null);
    setTranscription(null);
    setMedicalRecord(null);
    setTranscriptionStatus('Iniciando transcrição final...');

    try {
      const result = await transcribeAudio(file, '', settings.language, setTranscriptionStatus);
      setTranscription(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado durante a transcrição.');
    } finally {
      setIsTranscribing(false);
      setTranscriptionStatus('');
    }
  };

  const handleGenerateRecord = async () => {
    if (!transcription) return;

    setIsGeneratingRecord(true);
    setError(null);

    try {
      const record = await generateMedicalRecord(
        transcription,
        settings.customPrompt,
        settings.aiProvider,
        settings.openRouterModel
      );
      setMedicalRecord(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro ao gerar o prontuário.');
    } finally {
      setIsGeneratingRecord(false);
    }
  };

  const handleEditRecord = async () => {
    if (!medicalRecord || !editSuggestion.trim()) return;

    setIsEditingRecord(true);
    setError(null);

    try {
      const updatedRecord = await editMedicalRecord(
        medicalRecord,
        editSuggestion,
        settings.customPrompt,
        settings.aiProvider,
        settings.openRouterModel
      );
      setMedicalRecord(updatedRecord);
      setIsEditModalOpen(false);
      setEditSuggestion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro ao editar o prontuário.');
    } finally {
      setIsEditingRecord(false);
    }
  };

  const currentDate = new Date().toLocaleDateString('pt-BR');
  const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-200 selection:text-blue-900">
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSave={handleSaveSettings}
      />

      <EditRecordModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        suggestion={editSuggestion}
        setSuggestion={setEditSuggestion}
        onSubmit={handleEditRecord}
        isSubmitting={isEditingRecord}
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 group cursor-pointer" onClick={handleReset}>
            <div className="bg-blue-600 p-2 rounded-lg shadow-md shadow-blue-500/20">
              <Mic className="text-white" size={20} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Med<span className="text-blue-600">Scribe</span>
            </h1>
            <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-400 border-l border-slate-300 pl-3">
              Sistema Inteligente de Transcrição Clínica
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-4 text-sm font-medium text-slate-500">
              <div className="flex items-center"><Calendar size={14} className="mr-1.5" /> {currentDate}</div>
              <div className="flex items-center"><Clock size={14} className="mr-1.5" /> {currentTime}</div>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full">
              <Sparkles size={14} className="text-indigo-600" />
              <span className="text-xs font-bold text-indigo-700 hidden sm:inline">
                {settings.aiProvider === 'gemini' 
                  ? 'Gemini 2.5 Flash Lite' 
                  : `OpenRouter: ${settings.openRouterModel.split('/').pop()?.replace(':free', '') || 'Nemotron'}`
                }
              </span>
            </div>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              title="Painel de Controle"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="flex-grow max-w-[1400px] mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
        
        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3 text-red-800 shadow-sm animate-in fade-in">
            <AlertCircle className="shrink-0 mt-0.5 text-red-500" size={20} />
            <div className="text-sm font-semibold leading-relaxed">{error}</div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Recording & Controls */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Patient Info Section */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <User size={18} />
                </div>
                <h2 className="text-base font-bold text-slate-800">Paciente</h2>
              </div>
              <div>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Nome completo do paciente (Opcional)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
              </div>
            </section>

            {/* Audio Recorder Component */}
            <AudioRecorder
              onRecordingStart={() => setIsRecordingActive(true)}
              onRecordingComplete={(recordedFile) => {
                setIsRecordingActive(false);
                handleRecordingComplete(recordedFile);
              }}
              onRecordingPause={handlePauseTranscription}
              disabled={isGeneratingRecord || isEditingRecord}
            />

            {/* File Status & Transcribe Action */}
            {!isRecordingActive && file && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                  <FileAudio size={16} className="mr-2 text-blue-500" />
                  Arquivo Selecionado
                </h3>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4">
                  <p className="text-sm font-medium text-slate-700 truncate" title={file.name}>{file.name}</p>
                  <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                    <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    <button onClick={handleReset} className="text-red-500 hover:text-red-700 font-medium flex items-center">
                      <RotateCcw size={12} className="mr-1" /> Descartar
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleTranscribe}
                  disabled={isTranscribing}
                  className={`
                    w-full flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl font-bold text-white transition-all duration-300 shadow-sm
                    ${isTranscribing 
                      ? 'bg-blue-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md active:scale-[0.98]'
                    }
                  `}
                >
                  {isTranscribing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Processando...</span>
                    </>
                  ) : transcription ? (
                    <>
                      <RotateCcw size={18} />
                      <span>Atualizar Transcrição Final</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>Transcrever Áudio</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Results & AI Assistant */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Transcription Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[300px]">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-800">
                  <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                    <FileAudio size={18} />
                  </div>
                  <h3 className="font-bold text-base">Transcrição</h3>
                </div>
              </div>
              
              <div className="p-6 flex-grow relative">
                {!transcription && !isTranscribing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <FileAudio size={48} strokeWidth={1} className="mb-3 opacity-50" />
                    <p className="text-sm font-medium">Aguardando gravação e transcrição...</p>
                  </div>
                )}
                
                {isTranscribing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-500 bg-white/80 backdrop-blur-sm z-10">
                    <div className="w-12 h-12 border-4 border-blue-100 rounded-full mb-4 relative">
                      <div className="w-12 h-12 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute -top-1 -left-1"></div>
                    </div>
                    <p className="text-sm font-bold animate-pulse mb-1">{transcriptionStatus || 'Processando áudio...'}</p>
                    <p className="text-xs text-slate-500">Isso pode levar alguns minutos dependendo do tamanho do arquivo.</p>
                  </div>
                )}

                {transcription && (
                  <div className="animate-in fade-in duration-500 h-full">
                    <TranscriptionResult text={transcription} onClear={handleReset} />
                  </div>
                )}
              </div>
            </div>

            {/* AI Processing Trigger */}
            {transcription && (
              <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4">
                <button
                  onClick={handleGenerateRecord}
                  disabled={isGeneratingRecord || !!medicalRecord}
                  className={`
                    group relative flex items-center justify-center space-x-2 px-10 py-4 rounded-full font-bold text-white transition-all duration-300 shadow-lg
                    ${isGeneratingRecord 
                      ? 'bg-purple-400 cursor-not-allowed' 
                      : medicalRecord
                        ? 'bg-green-500 cursor-not-allowed shadow-green-500/20'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:shadow-purple-500/30 hover:-translate-y-1 active:translate-y-0'
                    }
                  `}
                >
                  {isGeneratingRecord ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Analisando Contexto Clínico...</span>
                    </>
                  ) : medicalRecord ? (
                    <>
                      <CheckCircle2 size={20} />
                      <span>Prontuário Gerado</span>
                    </>
                  ) : (
                    <>
                      <BrainCircuit size={22} className="text-purple-200 group-hover:animate-pulse" />
                      <span className="text-lg">Processar com IA</span>
                      <ChevronRight size={20} className="ml-1 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* AI Assistant / Medical Record Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-2 text-slate-800">
                <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                  <Stethoscope size={18} />
                </div>
                <h3 className="font-bold text-base">Assistente de Prontuário IA</h3>
              </div>
              
              <div className="p-6 bg-slate-50/30">
                {(!medicalRecord && !isGeneratingRecord && !isEditingRecord) ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <BrainCircuit size={48} strokeWidth={1} className="mb-3 opacity-50" />
                    <p className="text-sm font-medium text-center max-w-md mb-6">
                      Gere a transcrição primeiro e clique em "Processar com IA" para estruturar o prontuário automaticamente.
                    </p>
                    {transcription && (
                      <button
                        onClick={handleGenerateRecord}
                        disabled={isGeneratingRecord}
                        className={`
                          group relative flex items-center justify-center space-x-2 px-10 py-4 rounded-full font-bold text-white transition-all duration-300 shadow-lg
                          ${isGeneratingRecord 
                            ? 'bg-purple-400 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:shadow-purple-500/30 hover:-translate-y-1 active:translate-y-0'
                          }
                        `}
                      >
                        <BrainCircuit size={22} className="text-purple-200 group-hover:animate-pulse" />
                        <span className="text-lg">Processar com IA</span>
                        <ChevronRight size={20} className="ml-1 group-hover:translate-x-1 transition-transform" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="animate-in fade-in duration-500">
                    <div className="flex justify-end mb-4">
                      {medicalRecord && (
                        <button
                          onClick={() => setIsEditModalOpen(true)}
                          disabled={isGeneratingRecord || isEditingRecord}
                          className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-all shadow-sm active:scale-95"
                        >
                          <MessageSquarePlus size={16} />
                          <span>Sugerir Edição</span>
                        </button>
                      )}
                    </div>
                    <MedicalRecordGrid record={medicalRecord} isLoading={isGeneratingRecord || isEditingRecord} />
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
