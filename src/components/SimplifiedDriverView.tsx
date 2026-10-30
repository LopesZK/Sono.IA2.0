import React from 'react';
import {
  Play,
  Square,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Volume2,
  VolumeX,
  Coffee,
  PhoneCall,
  UserCheck,
  Eye,
  Camera,
  Moon,
  Sun,
  Settings,
  Database,
  ArrowRightLeft,
} from 'lucide-react';
import { DriverState, DriverMetrics, DetectionSettings } from '../types/detector';
import { audioAlarm } from '../services/audioAlarm';

interface SimplifiedDriverViewProps {
  isMonitoring: boolean;
  driverState: DriverState;
  metrics: DriverMetrics;
  tripDurationSec: number;
  isMuted: boolean;
  onToggleMonitoring: () => void;
  onToggleMute: () => void;
  onDismissAlarm: () => void;
  onOpenTips: () => void;
  onOpenDatabase: () => void;
  onSwitchToAdvanced: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  settings: DetectionSettings;
  onUpdateSettings: (newSettings: Partial<DetectionSettings>) => void;
  dbTripCount: number;
}

function formatDuration(totalSec: number): string {
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const SimplifiedDriverView: React.FC<SimplifiedDriverViewProps> = ({
  isMonitoring,
  driverState,
  metrics,
  tripDurationSec,
  isMuted,
  onToggleMonitoring,
  onToggleMute,
  onDismissAlarm,
  onOpenTips,
  onOpenDatabase,
  onSwitchToAdvanced,
  videoRef,
  settings,
  onUpdateSettings,
  dbTripCount,
}) => {
  const [showCameraPIP, setShowCameraPIP] = React.useState(true);
  const [testingAlarm, setTestingAlarm] = React.useState(false);

  const handleTestSiren = () => {
    setTestingAlarm(true);
    audioAlarm.testAlarm(settings.soundType, settings.volume, true);
    setTimeout(() => setTestingAlarm(false), 1600);
  };

  // State-specific styling & text
  const isAsleep = driverState === 'asleep';
  const isDrowsy = driverState === 'drowsy';

  return (
    <div className={`min-h-screen flex flex-col justify-between p-3 sm:p-5 select-none transition-colors ${
      settings.nightModeHUD ? 'bg-black text-white' : 'bg-slate-950 text-slate-100'
    }`}>
      {/* Top Simple HUD Bar */}
      <header className="flex items-center justify-between py-2 border-b border-slate-800/80 max-w-md w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className={`w-3 h-3 rounded-full ${
            !isMonitoring
              ? 'bg-slate-600'
              : isAsleep
              ? 'bg-rose-500 animate-ping'
              : isDrowsy
              ? 'bg-amber-400 animate-pulse'
              : 'bg-emerald-400'
          }`} />
          <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
            {isMonitoring ? `Em Trânsito: ${formatDuration(tripDurationSec)}` : '📱 Modo Mobile (Veicular)'}
          </span>
        </div>

        {/* Quick Driver Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Night mode toggle */}
          <button
            onClick={() => onUpdateSettings({ nightModeHUD: !settings.nightModeHUD })}
            title="Alternar Modo Noturno (Baixo Ofuscamento)"
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            {settings.nightModeHUD ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Mute toggle */}
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Ativar Som do Alarme' : 'Silenciar Alarme'}
            className={`p-2.5 rounded-xl border transition-colors ${
              isMuted
                ? 'bg-rose-950/60 border-rose-700 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Database Trips Shortcut */}
          <button
            onClick={onOpenDatabase}
            title="Banco de Dados de Viagens"
            className="px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Banco</span>
            <span className="text-[10px] font-mono text-slate-400">({dbTripCount})</span>
          </button>

          {/* Switch to PC / Complete View */}
          <button
            onClick={onSwitchToAdvanced}
            title="Mudar para Modo PC (Completo com Telemetria e Copiloto IA)"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-950/80 hover:bg-sky-900 border border-sky-600/40 text-sky-200 text-xs font-bold transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">💻 Modo PC</span>
            <span className="sm:hidden">💻 PC</span>
          </button>
        </div>
      </header>

      {/* Centerpiece: Giant Driver Status Cockpit */}
      <main className="flex-1 max-w-md w-full mx-auto flex flex-col justify-center items-center py-4 my-auto">
        {!isMonitoring ? (
          // Idle / Standby Screen
          <div className="w-full text-center space-y-6">
            <div className="w-28 h-28 sm:w-36 sm:h-36 mx-auto rounded-3xl bg-slate-900 border-2 border-slate-800 flex items-center justify-center text-slate-500 shadow-2xl">
              <Eye className="w-14 h-14 sm:w-16 sm:h-16 text-sky-400" />
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wide text-white">
                Pronto para a Viagem
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto mt-1.5 leading-relaxed">
                Fixe o smartphone no suporte do painel na altura dos olhos e toque no botão abaixo para ligar a vigilância de sono.
              </p>
            </div>

            {/* Quick Siren Test Before Departure */}
            <button
              onClick={handleTestSiren}
              disabled={testingAlarm}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                testingAlarm
                  ? 'bg-rose-950 border-rose-600 text-rose-300 animate-pulse'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              <Volume2 className="w-4 h-4 text-rose-400" />
              <span>{testingAlarm ? 'Tocando Sirene...' : 'Testar Som da Sirene (Volume Máx)'}</span>
            </button>
          </div>
        ) : isAsleep ? (
          // CRITICAL ALARM STATE (DORMINDO)
          <div className="w-full text-center space-y-5 animate-pulse">
            <div className="w-36 h-36 sm:w-44 sm:h-44 mx-auto rounded-full bg-rose-600 border-8 border-rose-400 flex items-center justify-center text-white shadow-[0_0_80px_rgba(225,29,72,0.9)] animate-bounce">
              <Flame className="w-20 h-20 text-white" />
            </div>

            <div>
              <div className="inline-block px-4 py-1 rounded-full bg-rose-600 text-white text-xs font-black tracking-widest uppercase mb-2">
                PERIGO IMEDIATO
              </div>
              <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-rose-400 leading-none">
                ACORDE!
              </h2>
              <p className="text-rose-200 text-sm sm:text-base font-bold mt-2">
                Olhos fechados há {(metrics.eyesClosedDurationMs / 1000).toFixed(1)}s ao volante!
              </p>
            </div>

            {/* Huge Wakeup Button */}
            <button
              onClick={onDismissAlarm}
              className="w-full py-6 px-6 rounded-3xl bg-white hover:bg-slate-100 text-rose-700 text-xl sm:text-2xl font-black uppercase tracking-wider shadow-2xl transition-all active:scale-95 border-4 border-rose-400 flex items-center justify-center gap-3"
            >
              <ShieldCheck className="w-8 h-8 text-rose-600" />
              ESTOU ACORDADO!
            </button>
          </div>
        ) : isDrowsy ? (
          // WARNING STATE (SONOLENTO)
          <div className="w-full text-center space-y-5">
            <div className="w-32 h-32 sm:w-40 sm:h-40 mx-auto rounded-full bg-amber-500/20 border-4 border-amber-500 flex items-center justify-center text-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.3)] animate-pulse">
              <AlertTriangle className="w-16 h-16 text-amber-400" />
            </div>

            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wider uppercase mb-2">
                ALERTA DE FADIGA
              </div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-wide text-amber-300">
                {metrics.isYawning ? 'BOCEJO DETECTADO' : 'SONOLÊNCIA'}
              </h2>
              <p className="text-amber-200 text-xs sm:text-sm font-medium mt-1">
                Pálpebras pesadas detectadas. Programe uma parada em local seguro.
              </p>
            </div>

            <button
              onClick={onOpenTips}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <Coffee className="w-4 h-4 text-amber-400" />
              Dicas para Parada e Café
            </button>
          </div>
        ) : (
          // AWAKE / SAFE STATE (ACORDADO)
          <div className="w-full text-center space-y-5">
            <div className="w-32 h-32 sm:w-40 sm:h-40 mx-auto rounded-full bg-emerald-500/10 border-4 border-emerald-500/80 flex items-center justify-center text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
              <ShieldCheck className="w-16 h-16 sm:w-20 sm:h-20 text-emerald-400" />
            </div>

            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold tracking-wider uppercase mb-2">
                100% SEGURO
              </div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-wide text-emerald-400">
                MOTORISTA ATENTO
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">
                Olhos abertos ({Math.round(metrics.averageEyeOpen * 100)}%) · Sentinela ativa com alerta acústico imediato
              </p>
            </div>

            {/* Quick Metrics Bar for Driver */}
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Abertura Olhos</span>
                <span className="text-base font-bold text-emerald-400 mt-0.5 block">
                  {Math.round(metrics.averageEyeOpen * 100)}%
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Enquadramento</span>
                <span className="text-base font-bold text-sky-400 mt-0.5 block flex items-center justify-center gap-1">
                  <UserCheck className="w-4 h-4" />
                  {metrics.faceDetected ? 'Detectado' : 'Ajustar'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Floating Mini PIP Camera Guide (Can be toggled) */}
        {isMonitoring && (
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => setShowCameraPIP(!showCameraPIP)}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{showCameraPIP ? 'Ocultar Miniatura da Câmera' : 'Ver Miniatura da Câmera'}</span>
            </button>
          </div>
        )}

        {/* Small PIP camera preview to check position */}
        {isMonitoring && showCameraPIP && (
          <div className="mt-2 w-32 h-24 rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-900 relative shadow-lg">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover transform ${
                settings.facingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />
            <div className="absolute top-1 right-1">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                metrics.faceDetected ? 'bg-emerald-400 ring-2 ring-emerald-500/40' : 'bg-rose-500 animate-ping'
              }`} />
            </div>
          </div>
        )}
      </main>

      {/* Bottom Driver Controls */}
      <footer className="max-w-md w-full mx-auto space-y-3 pt-2">
        {/* Giant Start/Stop Trip Button */}
        <button
          onClick={onToggleMonitoring}
          className={`w-full py-5 px-6 rounded-3xl font-black uppercase tracking-wider text-lg sm:text-xl flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-[0.98] ${
            isMonitoring
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-900/40'
          }`}
        >
          {isMonitoring ? (
            <>
              <Square className="w-6 h-6 fill-current" />
              Encerrar Viagem e Salvar
            </>
          ) : (
            <>
              <Play className="w-6 h-6 fill-current" />
              Iniciar Monitoramento de Sono
            </>
          )}
        </button>

        {/* Secondary Quick Action Bar */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={onOpenTips}
            className="py-3 px-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Coffee className="w-4 h-4 text-amber-400" />
            Paradas e Descanso
          </button>

          <a
            href="tel:191"
            className="py-3 px-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <PhoneCall className="w-4 h-4 text-rose-400" />
            PRF Rodovias (191)
          </a>
        </div>
      </footer>
    </div>
  );
};
