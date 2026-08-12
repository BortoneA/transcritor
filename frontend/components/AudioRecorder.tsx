import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MonitorUp, Square, AlertCircle, Radio, Activity, Volume2, Settings2, Pause, Play } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingStart?: () => void;
  onRecordingComplete: (file: File) => void;
  onRecordingPause?: (file: File) => void;
  disabled?: boolean;
}

type RecordMode = 'presencial' | 'telemedicina';
type AudioQuality = 'low' | 'medium' | 'high';

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingStart, onRecordingComplete, onRecordingPause, disabled }) => {
  const [mode, setMode] = useState<RecordMode>('telemedicina');
  const [quality, setQuality] = useState<AudioQuality>('low');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRefs = useRef<MediaStream[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPausingRef = useRef(false);
  
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const screenAnalyserRef = useRef<AnalyserNode | null>(null);
  
  const timerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const micCanvasRef = useRef<HTMLCanvasElement>(null);
  const screenCanvasRef = useRef<HTMLCanvasElement>(null);

  const drawCanvas = (
    canvas: HTMLCanvasElement | null, 
    analyser: AnalyserNode | null, 
    colorStart: string, 
    colorEnd: string
  ) => {
    if (!canvas || !analyser) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, rect.width, rect.height);

    const barWidth = (rect.width / bufferLength) * 2.5;
    let x = 0;
    const centerY = rect.height / 2;

    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i];
      const percent = value / 255;
      
      const heightMultiplier = Math.pow(percent, 1.5);
      const maxBarHeight = (rect.height * 0.8); 
      const barHeight = Math.max(2, maxBarHeight * heightMultiplier);

      const gradient = ctx.createLinearGradient(0, centerY - barHeight/2, 0, centerY + barHeight/2);
      gradient.addColorStop(0, colorStart);
      gradient.addColorStop(0.5, colorEnd);
      gradient.addColorStop(1, colorStart);

      ctx.fillStyle = gradient;
      
      ctx.beginPath();
      ctx.roundRect(x, centerY - barHeight/2, barWidth - 1.5, barHeight, 2);
      ctx.fill();

      x += barWidth;
    }
  };

  const drawVisualizer = useCallback(() => {
    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      
      if (micCanvasRef.current && micAnalyserRef.current) {
        drawCanvas(micCanvasRef.current, micAnalyserRef.current, '#3b82f6', '#60a5fa'); 
      }
      
      if (screenCanvasRef.current && screenAnalyserRef.current) {
        drawCanvas(screenCanvasRef.current, screenAnalyserRef.current, '#10b981', '#34d399');
      }
    };

    draw();
  }, []);

  const drawFlatLine = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.roundRect(0, rect.height / 2 - 1, rect.width, 2, 2);
    ctx.fill();
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      isPausingRef.current = true;
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      drawFlatLine(micCanvasRef.current);
      if (mode === 'telemedicina') {
        drawFlatLine(screenCanvasRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      drawVisualizer();
    }
  };

  const stopRecording = useCallback((save: boolean = true) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (!save) {
        chunksRef.current = [];
      }
      mediaRecorderRef.current.stop();
    }

    streamRefs.current.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    streamRefs.current = [];

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    drawFlatLine(micCanvasRef.current);
    drawFlatLine(screenCanvasRef.current);

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
      micAnalyserRef.current = null;
      screenAnalyserRef.current = null;
    }

    setIsRecording(false);
    setIsPaused(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopRecording(false);
    };
  }, [stopRecording]);

  useEffect(() => {
    if (!isRecording) {
      drawFlatLine(micCanvasRef.current);
      if (mode === 'telemedicina') {
        setTimeout(() => drawFlatLine(screenCanvasRef.current), 50);
      }
    }
  }, [isRecording, mode]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startMediaRecorder = (stream: MediaStream) => {
    let options: MediaRecorderOptions = {};
    
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      options.mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
      options.mimeType = 'audio/webm';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      options.mimeType = 'audio/mp4';
    }

    const bpsMap = {
      high: 128000,
      medium: 64000,
      low: 16000
    };
    options.audioBitsPerSecond = bpsMap[quality];

    try {
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          
          if (isPausingRef.current) {
            const actualMimeType = mediaRecorder.mimeType || 'audio/webm';
            const blob = new Blob(chunksRef.current, { type: actualMimeType });
            const ext = actualMimeType.includes('mp4') ? 'mp4' : 'webm';
            const partialFile = new File([blob], `consulta-parcial-${new Date().getTime()}.${ext}`, { type: actualMimeType });
            
            if (onRecordingPause) {
              onRecordingPause(partialFile);
            }
            isPausingRef.current = false;
          }
        }
      };

      mediaRecorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const actualMimeType = mediaRecorder.mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: actualMimeType });
          
          const ext = actualMimeType.includes('mp4') ? 'mp4' : 'webm';
          const file = new File([blob], `consulta-${new Date().getTime()}.${ext}`, { type: actualMimeType });
          
          onRecordingComplete(file);
        }
        chunksRef.current = [];
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      setError(null);
      if (onRecordingStart) onRecordingStart();
      drawVisualizer();
    } catch (err) {
      console.error("MediaRecorder initialization error:", err);
      throw new Error("Não foi possível inicializar o gravador com as configurações selecionadas.");
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;
      
      const dest = audioCtx.createMediaStreamDestination();

      const micAnalyser = audioCtx.createAnalyser();
      micAnalyser.fftSize = 128;
      micAnalyser.smoothingTimeConstant = 0.85;
      micAnalyserRef.current = micAnalyser;

      if (mode === 'presencial') {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRefs.current.push(micStream);
        
        const micSource = audioCtx.createMediaStreamSource(micStream);
        micSource.connect(micAnalyser);
        micAnalyser.connect(dest);
        
      } else if (mode === 'telemedicina') {
        const screenAnalyser = audioCtx.createAnalyser();
        screenAnalyser.fftSize = 128;
        screenAnalyser.smoothingTimeConstant = 0.85;
        screenAnalyserRef.current = screenAnalyser;

        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRefs.current.push(micStream);

        let displayStream: MediaStream;
        try {
          displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
          streamRefs.current.push(displayStream);
        } catch (err) {
          micStream.getTracks().forEach(t => t.stop());
          throw err;
        }

        if (displayStream.getAudioTracks().length === 0) {
          streamRefs.current.forEach(s => s.getTracks().forEach(t => t.stop()));
          streamRefs.current = [];
          throw new Error("Áudio do sistema não detectado. Certifique-se de marcar a opção 'Compartilhar áudio' ao selecionar a tela/guia.");
        }

        displayStream.getVideoTracks()[0].addEventListener('ended', () => {
          stopRecording(true);
        });

        const micSource = audioCtx.createMediaStreamSource(micStream);
        const displaySource = audioCtx.createMediaStreamSource(displayStream);
        
        micSource.connect(micAnalyser);
        micAnalyser.connect(dest);

        displaySource.connect(screenAnalyser);
        screenAnalyser.connect(dest);
      }

      startMediaRecorder(dest.stream);

    } catch (err) {
      console.error("Recording start error:", err);
      setError(err instanceof Error ? err.message : "Falha ao iniciar gravação. Verifique as permissões de microfone e tela.");
      streamRefs.current.forEach(s => s.getTracks().forEach(t => t.stop()));
      streamRefs.current = [];
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-2 text-slate-800">
        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
          <Mic size={18} />
        </div>
        <h3 className="font-bold text-base">Gravação de Áudio</h3>
      </div>

      <div className="p-5 flex flex-col gap-5">
        
        {/* Mode Selection Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setMode('telemedicina')}
            disabled={isRecording}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
              mode === 'telemedicina' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <MonitorUp size={16} />
            <span>Telemedicina</span>
          </button>
          <button
            onClick={() => setMode('presencial')}
            disabled={isRecording}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
              mode === 'presencial' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Mic size={16} />
            <span>Presencial</span>
          </button>
        </div>

        {/* Instructions Box */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-xs text-slate-600">
          <div className="flex items-center font-bold text-blue-800 mb-2">
            <AlertCircle size={14} className="mr-1.5" />
            Instruções de Uso
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {mode === 'telemedicina' ? (
              <>
                <li>O sistema capturará o áudio do seu microfone e da aba selecionada.</li>
                <li>Ao iniciar, selecione a aba da sua videochamada.</li>
                <li><strong>Importante:</strong> Marque a opção "Compartilhar áudio da aba".</li>
              </>
            ) : (
              <>
                <li>O sistema capturará apenas o áudio do seu microfone.</li>
                <li>Certifique-se de estar em um ambiente silencioso.</li>
              </>
            )}
          </ul>
        </div>

        {/* Visualizers Section */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Níveis de Áudio</h4>
          
          {/* Mic Visualizer */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center text-xs font-bold text-slate-700">
                <Mic size={14} className="mr-1.5 text-blue-500" /> Microfone
              </div>
              {isRecording && !isPaused && <span className="text-[10px] font-mono text-blue-500 animate-pulse">Ativo</span>}
              {isPaused && <span className="text-[10px] font-mono text-amber-500">Pausado</span>}
            </div>
            <div className={`h-10 w-full bg-white rounded-lg border border-slate-100 overflow-hidden transition-opacity duration-300 ${isPaused ? 'opacity-30' : 'opacity-100'}`}>
              <canvas ref={micCanvasRef} className="w-full h-full" style={{ display: 'block' }} />
            </div>
          </div>

          {/* Screen Visualizer */}
          {mode === 'telemedicina' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center text-xs font-bold text-slate-700">
                  <Volume2 size={14} className="mr-1.5 text-emerald-500" /> Áudio da Tela
                </div>
                {isRecording && !isPaused && <span className="text-[10px] font-mono text-emerald-500 animate-pulse">Ativo</span>}
                {isPaused && <span className="text-[10px] font-mono text-amber-500">Pausado</span>}
              </div>
              <div className={`h-10 w-full bg-white rounded-lg border border-slate-100 overflow-hidden transition-opacity duration-300 ${isPaused ? 'opacity-30' : 'opacity-100'}`}>
                <canvas ref={screenCanvasRef} className="w-full h-full" style={{ display: 'block' }} />
              </div>
            </div>
          )}
        </div>

        {/* Quality Settings */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Qualidade da Gravação
          </label>
          <div className="relative">
            <select 
              value={quality}
              onChange={(e) => setQuality(e.target.value as AudioQuality)}
              disabled={isRecording || disabled}
              className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="low">Otimizada (16 kbps) - Ideal para IA e consultas longas</option>
              <option value="medium">Padrão (64 kbps) - Equilíbrio tamanho/qualidade</option>
              <option value="high">Alta (128 kbps) - Maior qualidade, arquivos grandes</option>
            </select>
            <Settings2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
            * Reduzir a qualidade diminui drasticamente o tamanho do arquivo sem afetar a transcrição da IA.
          </p>
        </div>

        {/* Record Button & Timer */}
        <div className="mt-2">
          {!isRecording ? (
            <button 
              onClick={startRecording} 
              disabled={disabled} 
              className="w-full flex items-center justify-center space-x-2 bg-red-500 hover:bg-red-600 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-md shadow-red-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Radio size={20} />
              <span>Iniciar Gravação</span>
            </button>
          ) : (
            <div className="flex flex-col space-y-4">
              <div className="flex flex-row items-center justify-center space-x-4">
                <button
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none border-4 border-white text-white ${
                    isPaused ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/30' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
                  }`}
                  title={isPaused ? "Retomar Gravação" : "Pausar Gravação"}
                >
                  {isPaused ? <Play size={24} fill="currentColor" className="ml-1" /> : <Pause size={24} fill="currentColor" />}
                </button>
                <button
                  onClick={() => stopRecording(true)}
                  className="relative z-10 w-20 h-20 bg-slate-900 hover:bg-black text-white rounded-full flex items-center justify-center shadow-xl shadow-slate-900/30 transition-all duration-300 hover:scale-105 focus:outline-none border-4 border-white"
                  title="Finalizar Gravação"
                >
                  <Square size={28} fill="currentColor" />
                </button>
              </div>
              
              <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                {isPaused ? (
                  <div className="flex items-center text-amber-600 text-sm font-bold">
                    <Pause size={16} className="mr-2" /> Gravação Pausada
                  </div>
                ) : (
                  <div className="flex items-center text-red-600 text-sm font-bold animate-pulse">
                    <div className="w-2 h-2 bg-red-600 rounded-full mr-2"></div>
                    Gravando...
                  </div>
                )}
                <div className={`font-mono font-bold tabular-nums ${isPaused ? 'text-amber-700' : 'text-red-700'}`}>
                  {formatTime(recordingTime)}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
