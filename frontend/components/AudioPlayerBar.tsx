import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Download } from 'lucide-react';

interface AudioPlayerBarProps {
  file: File | Blob | null;
  fileName?: string;
  onClearAudio?: () => void;
}

const SPEED_OPTIONS = [1, 1.25, 1.5, 1.75, 2];

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({ file, fileName }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // Gerencia o ciclo de vida do Blob URL com liberação de memória
  useEffect(() => {
    if (!file) {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      return;
    }

    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Atualiza a taxa de reprodução no elemento nativo
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Atualiza o volume no elemento nativo
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  }, [isPlaying]);

  const handleSkip = (seconds: number) => {
    if (!audioRef.current) return;
    const target = Math.max(0, Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const handleCycleSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    setPlaybackRate(SPEED_OPTIONS[nextIndex]);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickPos = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percentage = clickPos / rect.width;
    const newTime = percentage * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleDownload = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || (file instanceof File ? file.name : 'audio-consulta.webm');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '00:00';
    const m = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
    const s = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!file || !audioUrl) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

      <div className="flex flex-col gap-3">
        {/* Barra de Progresso Interativa */}
        <div
          ref={progressBarRef}
          onClick={handleSeek}
          className="relative w-full h-2 bg-slate-800 hover:h-3 rounded-full cursor-pointer transition-all group overflow-hidden"
          title="Clique para avançar ou retroceder"
        >
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-[width] duration-75 relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        </div>

        {/* Linha de Controles */}
        <div className="flex items-center justify-between gap-2">
          {/* Lado Esquerdo: Tempo e Playback */}
          <div className="flex items-center space-x-2">
            {/* Retroceder 5s */}
            <button
              onClick={() => handleSkip(-5)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors active:scale-95 flex items-center justify-center"
              title="Retroceder 5 segundos"
            >
              <RotateCcw size={17} />
              <span className="text-[10px] font-bold ml-0.5">5s</span>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-md shadow-blue-600/30 transition-all active:scale-95"
              title={isPlaying ? "Pausar" : "Reproduzir"}
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>

            {/* Avançar 5s */}
            <button
              onClick={() => handleSkip(5)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors active:scale-95 flex items-center justify-center"
              title="Avançar 5 segundos"
            >
              <RotateCw size={17} />
              <span className="text-[10px] font-bold ml-0.5">5s</span>
            </button>

            {/* Marcador de Tempo */}
            <div className="text-xs font-mono font-medium text-slate-400 pl-2">
              <span className="text-slate-200">{formatTime(currentTime)}</span> / {formatTime(duration)}
            </div>
          </div>

          {/* Lado Direito: Velocidade, Volume e Download */}
          <div className="flex items-center space-x-2">
            {/* Seletor de Velocidade */}
            <button
              onClick={handleCycleSpeed}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 transition-colors border border-slate-700"
              title="Velocidade de reprodução (Clique para alternar)"
            >
              {playbackRate}x
            </button>

            {/* Mute/Volume Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title={isMuted ? "Ativar som" : "Silenciar"}
            >
              {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>

            {/* Download Áudio */}
            <button
              onClick={handleDownload}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Baixar arquivo de áudio"
            >
              <Download size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
