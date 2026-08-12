import React, { useState, useEffect } from 'react';
import { X, Save, Key, Globe, MessageSquare, Settings2, BrainCircuit, Activity } from 'lucide-react';
import { DEFAULT_SYSTEM_INSTRUCTION } from '../services/geminiService';

export interface AppSettings {
  language: string;
  customPrompt: string;
  aiProvider: 'gemini' | 'openrouter';
  openRouterModel: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'geral' | 'ia'>('geral');

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      setActiveTab('geral');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleResetPrompt = () => {
    setLocalSettings({ ...localSettings, customPrompt: DEFAULT_SYSTEM_INSTRUCTION });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <Settings2 size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Painel de Controle</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 border-b border-slate-100 space-x-6">
          <button
            onClick={() => setActiveTab('geral')}
            className={`pb-3 text-sm font-bold transition-colors border-b-2 ${
              activeTab === 'geral' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Configurações Gerais
          </button>
          <button
            onClick={() => setActiveTab('ia')}
            className={`pb-3 text-sm font-bold transition-colors border-b-2 ${
              activeTab === 'ia' 
                ? 'border-purple-600 text-purple-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Assistente IA (Prompt)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-grow custom-scrollbar bg-slate-50/30">
          
          {activeTab === 'geral' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
              {/* Provedor de IA */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="flex items-center text-sm font-bold text-slate-700 mb-3">
                  <BrainCircuit size={16} className="mr-2 text-indigo-500" />
                  Provedor de Inteligência Artificial
                </label>
                <select
                  value={localSettings.aiProvider}
                  onChange={(e) => setLocalSettings({ ...localSettings, aiProvider: e.target.value as 'gemini' | 'openrouter' })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none"
                >
                  <option value="gemini">Gemini 2.5 Flash Lite (Google AI Studio)</option>
                  <option value="openrouter">OpenRouter (NVIDIA Nemotron Modelos Gratuitos)</option>
                </select>
              </div>

              {/* Modelo OpenRouter */}
              {localSettings.aiProvider === 'openrouter' && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="flex items-center text-sm font-bold text-slate-700 mb-3">
                    <Activity size={16} className="mr-2 text-emerald-500" />
                    Modelo NVIDIA Nemotron (Gratuito)
                  </label>
                  <select
                    value={localSettings.openRouterModel}
                    onChange={(e) => setLocalSettings({ ...localSettings, openRouterModel: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none"
                  >
                    <option value="nvidia/nemotron-3.5-lightning:free">nvidia/nemotron-3.5-lightning:free (Recomendado)</option>
                    <option value="nvidia/nemotron-3-ultra-550b-a55b:free">nvidia/nemotron-3-ultra-550b-a55b:free (Ultra MoE)</option>
                    <option value="nvidia/nemotron-3-super-120b-a12b:free">nvidia/nemotron-3-super-120b-a12b:free (Super MoE)</option>
                    <option value="nvidia/nemotron-3-nano-30b-a3b:free">nvidia/nemotron-3-nano-30b-a3b:free (Nano MoE)</option>
                    <option value="nvidia/nemotron-nano-9b-v2:free">nvidia/nemotron-nano-9b-v2:free (Nano v2)</option>
                    <option value="nvidia/nemotron-nano-12b-v2-vl:free">nvidia/nemotron-nano-12b-v2-vl:free (Vision-Language)</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-2">
                    Estes modelos são oferecidos gratuitamente pelo OpenRouter, mas podem possuir limites diários de uso.
                  </p>
                </div>
              )}

              {/* Language */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="flex items-center text-sm font-bold text-slate-700 mb-3">
                  <Globe size={16} className="mr-2 text-slate-400" />
                  Idioma da Transcrição
                </label>
                <select
                  value={localSettings.language}
                  onChange={(e) => setLocalSettings({ ...localSettings, language: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none"
                >
                  <option value="pt">Português (Brasil)</option>
                  <option value="en">Inglês (EUA)</option>
                  <option value="es">Espanhol</option>
                  <option value="fr">Francês</option>
                </select>
              </div>

              {/* Informação sobre Credenciais */}
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-start space-x-3 text-blue-800">
                <Key className="shrink-0 mt-0.5 text-blue-500" size={16} />
                <div className="text-xs font-medium leading-relaxed">
                  As chaves de API do AssemblyAI, OpenRouter e Gemini estão configuradas e são mantidas com segurança diretamente no servidor backend (<code className="bg-blue-100/50 px-1 py-0.5 rounded text-blue-900 font-mono">.env.local</code>).
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ia' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <label className="flex items-center text-sm font-bold text-slate-700">
                  <MessageSquare size={16} className="mr-2 text-purple-500" />
                  Instrução do Sistema (Prompt)
                </label>
                <button 
                  onClick={handleResetPrompt}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Restaurar Padrão
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Personalize como a IA deve se comportar ao gerar o prontuário. Mantenha a estrutura JSON solicitada intacta.
              </p>
              <textarea
                value={localSettings.customPrompt}
                onChange={(e) => setLocalSettings({ ...localSettings, customPrompt: e.target.value })}
                className="w-full flex-grow min-h-[300px] p-4 bg-slate-900 text-slate-100 font-mono text-xs rounded-2xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 custom-scrollbar"
                placeholder="Insira as instruções do sistema aqui..."
              />
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all active:scale-95"
          >
            <Save size={18} className="mr-2" />
            Salvar Alterações
          </button>
        </div>

      </div>
    </div>
  );
};
