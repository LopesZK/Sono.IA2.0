import React from 'react';
import { Play, Coffee, AlertOctagon, Volume2, Sliders } from 'lucide-react';
import { DriverState, AlarmSoundType } from '../types/detector';
import { audioAlarm } from '../services/audioAlarm';

interface SimulatorBarProps {
  onSimulateState: (state: DriverState) => void;
  activeSimulatedState: DriverState | null;
  onClearSimulation: () => void;
  soundType: AlarmSoundType;
  volume: number;
}

export const SimulatorBar: React.FC<SimulatorBarProps> = ({
  onSimulateState,
  activeSimulatedState,
  onClearSimulation,
  soundType,
  volume,
}) => {
  const [isPlayingTestSound, setIsPlayingTestSound] = React.useState(false);

  const handleTestSound = () => {
    setIsPlayingTestSound(true);
    audioAlarm.testAlarm(soundType, volume, true);
    setTimeout(() => {
      setIsPlayingTestSound(false);
    }, 1800);
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 select-none shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
            Calibração & Simulação de Teste
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-xs text-slate-400">Verificação de resposta do sistema</span>
        </div>

        {/* Quick Alarm Sound Test Button */}
        <button
          onClick={handleTestSound}
          disabled={isPlayingTestSound}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            isPlayingTestSound
              ? 'bg-rose-950 border-rose-600 text-rose-300 animate-pulse'
              : 'bg-slate-950 border-slate-800 text-slate-200 hover:text-white hover:border-slate-700'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5 text-rose-400" />
          <span>{isPlayingTestSound ? 'Disparando Sirene...' : 'Testar Sirene (1.8s)'}</span>
        </button>
      </div>

      {/* 3 State Simulator Buttons */}
      <div className="grid grid-cols-3 gap-2">
        {/* 1. Awake */}
        <button
          onClick={() => onSimulateState('awake')}
          className={`p-2.5 rounded-lg border text-center transition-all ${
            activeSimulatedState === 'awake'
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40'
              : 'bg-slate-950 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 mb-0.5 text-emerald-400">
            <Play className="w-3.5 h-3.5" />
            <span className="text-xs font-bold uppercase font-mono">1. Acordado</span>
          </div>
          <span className="text-[10px] text-slate-400 block truncate font-mono">EAR ≥ 0.35 (Vigília)</span>
        </button>

        {/* 2. Drowsy */}
        <button
          onClick={() => onSimulateState('drowsy')}
          className={`p-2.5 rounded-lg border text-center transition-all ${
            activeSimulatedState === 'drowsy'
              ? 'bg-amber-950/80 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
              : 'bg-slate-950 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 mb-0.5 text-amber-400">
            <Coffee className="w-3.5 h-3.5" />
            <span className="text-xs font-bold uppercase font-mono">2. Sonolento</span>
          </div>
          <span className="text-[10px] text-slate-400 block truncate font-mono">Pálpebra oclusa / Bocejo</span>
        </button>

        {/* 3. Asleep */}
        <button
          onClick={() => onSimulateState('asleep')}
          className={`p-2.5 rounded-lg border text-center transition-all ${
            activeSimulatedState === 'asleep'
              ? 'bg-rose-950/90 border-rose-500 text-rose-300 ring-1 ring-rose-500/50 animate-pulse'
              : 'bg-slate-950 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 mb-0.5 text-rose-400">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span className="text-xs font-bold uppercase font-mono">3. Dormindo</span>
          </div>
          <span className="text-[10px] text-slate-400 block truncate font-mono">Sirene contínua (&gt;1.2s)</span>
        </button>
      </div>

      {activeSimulatedState && (
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 px-1 font-mono">
          <span>
            Simulação ativa:{' '}
            <strong className="text-white uppercase">{activeSimulatedState}</strong>
          </span>
          <button
            onClick={onClearSimulation}
            className="text-sky-400 hover:text-sky-300 underline font-medium"
          >
            Restaurar Sensor Real
          </button>
        </div>
      )}
    </div>
  );
};
