import React from 'react';
import { Volume2, VolumeX, Settings, ShieldAlert, Sparkles, Sun, Moon, Database, Smartphone, LayoutDashboard } from 'lucide-react';
import { DriverState } from '../types/detector';

interface CockpitHeaderProps {
  isMonitoring: boolean;
  driverState: DriverState;
  tripDurationSec: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
  onOpenTips: () => void;
  onOpenDatabase: () => void;
  dbTripCount: number;
  isNightMode: boolean;
  onToggleNightMode: () => void;
  viewMode: 'simplified' | 'advanced';
  onToggleViewMode: () => void;
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

export const CockpitHeader: React.FC<CockpitHeaderProps> = ({
  isMonitoring,
  driverState,
  tripDurationSec,
  isMuted,
  onToggleMute,
  onOpenSettings,
  onOpenStats,
  onOpenTips,
  onOpenDatabase,
  dbTripCount,
  isNightMode,
  onToggleNightMode,
  viewMode,
  onToggleViewMode,
}) => {
  return (
    <header className="w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800/90 px-4 py-2.5 select-none">
      <div className="max-w-[1520px] mx-auto flex items-center justify-between">
        {/* Brand & Live Industrial Status */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-bold tracking-wider text-white uppercase font-mono">
                VigiDrive
              </h1>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400">Sentinela Veicular</span>
              <span className="text-[11px] text-sky-400 font-mono hidden md:inline">
                [ESTAÇÃO PC]
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  !isMonitoring
                    ? 'bg-slate-600'
                    : driverState === 'asleep'
                    ? 'bg-rose-500 animate-ping'
                    : driverState === 'drowsy'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="font-mono text-[11px] text-slate-300">
                {isMonitoring ? `Tempo em Trânsito: ${formatDuration(tripDurationSec)}` : 'Em Espera (Standby)'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions (All Original Buttons Strictly Preserved) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Switch to Mobile Mode button */}
          <button
            onClick={onToggleViewMode}
            title={
              viewMode === 'simplified'
                ? 'Mudar para Painel PC (Completo)'
                : 'Alternar para Modo Mobile (Smartphone no Painel)'
            }
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-300 text-xs font-semibold transition-all shadow-sm shadow-emerald-950/40"
          >
            {viewMode === 'simplified' ? (
              <>
                <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Modo Completo</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">📱 Modo Mobile</span>
                <span className="sm:hidden">Mobile</span>
              </>
            )}
          </button>

          {/* Database Trips Modal Trigger */}
          <button
            onClick={onOpenDatabase}
            title="Abrir Banco de Dados de Viagens e Relatórios"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-sky-300 text-xs font-semibold transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Banco de Dados</span>
            <span className="bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.2 rounded text-[10px] font-mono text-sky-200">
              {dbTripCount}
            </span>
          </button>

          {/* Mute/Unmute quick toggle */}
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Ativar Som do Alarme' : 'Silenciar Alarme (Não Recomendado)'}
            className={`p-2 rounded-lg border transition-colors ${
              isMuted
                ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
          </button>

          {/* Night Mode HUD Toggle */}
          <button
            onClick={onToggleNightMode}
            title={isNightMode ? 'Modo Normal' : 'Modo Noturno (Baixo Ofuscamento)'}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            {isNightMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Rest Tips */}
          <button
            onClick={onOpenTips}
            title="Dicas de Segurança e Parada"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors hidden xs:flex items-center gap-1"
          >
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-medium hidden sm:inline">Dicas</span>
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            title="Configurações de Sensibilidade e Som"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
