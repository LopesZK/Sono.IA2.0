import React from 'react';
import { Eye, Coffee, Activity, Gauge } from 'lucide-react';
import { DriverMetrics } from '../types/detector';

interface FatigueGaugeProps {
  metrics: DriverMetrics;
  sleepThresholdSec: number;
}

export const FatigueGauge: React.FC<FatigueGaugeProps> = ({
  metrics,
  sleepThresholdSec,
}) => {
  const closedSec = metrics.eyesClosedDurationMs / 1000;
  const closureProgressPct = Math.min(100, Math.round((closedSec / sleepThresholdSec) * 100));

  const leftEyePct = Math.round(metrics.leftEyeOpen * 100);
  const rightEyePct = Math.round(metrics.rightEyeOpen * 100);
  const yawnPct = Math.round(metrics.yawnScore * 100);

  // Determine eye bar color
  const getEyeColor = (pct: number) => {
    if (pct < 25) return 'bg-rose-500 text-rose-400';
    if (pct < 55) return 'bg-amber-400 text-amber-300';
    return 'bg-emerald-400 text-emerald-400';
  };

  const getFatigueColor = (score: number) => {
    if (score > 70) return 'text-rose-400';
    if (score > 40) return 'text-amber-400';
    return 'text-emerald-400';
  };

  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 select-none">
      {/* 1. Eye Aperture Dual Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="flex items-center gap-1.5 font-medium">
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            Abertura Ocular
          </span>
          <span className="font-mono tabular-nums text-slate-200 font-semibold">
            {Math.round(metrics.averageEyeOpen * 100)}%
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>OE: {leftEyePct}%</span>
            <span>OD: {rightEyePct}%</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="h-2 w-full bg-slate-950 border border-slate-800 rounded-sm overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${getEyeColor(leftEyePct).split(' ')[0]}`}
                style={{ width: `${leftEyePct}%` }}
              />
            </div>
            <div className="h-2 w-full bg-slate-950 border border-slate-800 rounded-sm overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${getEyeColor(rightEyePct).split(' ')[0]}`}
                style={{ width: `${rightEyePct}%` }}
              />
            </div>
          </div>
        </div>

        <span className="text-[10px] font-mono text-slate-400 mt-2 block">
          {metrics.isBlinking ? 'Piscada ativa' : metrics.averageEyeOpen < 0.25 ? 'Pálpebra oclusa' : 'Abertura nominal'}
        </span>
      </div>

      {/* 2. Eye Closure Duration towards Trigger */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="flex items-center gap-1.5 font-medium">
            <Activity className="w-3.5 h-3.5 text-rose-400" />
            Oclusão / Alarme
          </span>
          <span className={`font-mono tabular-nums font-bold ${closureProgressPct > 50 ? 'text-rose-400' : 'text-slate-300'}`}>
            {closedSec.toFixed(1)}s / {sleepThresholdSec}s
          </span>
        </div>

        <div className="space-y-1">
          <div className="h-2 w-full bg-slate-950 border border-slate-800 rounded-sm overflow-hidden">
            <div
              className={`h-full transition-all duration-75 ${
                closureProgressPct >= 100
                  ? 'bg-rose-500 animate-pulse'
                  : closureProgressPct > 60
                  ? 'bg-amber-400'
                  : 'bg-sky-400'
              }`}
              style={{ width: `${closureProgressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>0.0s</span>
            <span>Gatilho {sleepThresholdSec}s</span>
          </div>
        </div>

        <span className="text-[10px] font-mono text-slate-400 mt-1 block">
          {closureProgressPct >= 100
            ? 'PERIGO: SIRENE DISPARADA'
            : closureProgressPct > 40
            ? 'Atenção: olhos cerrados'
            : 'Frequência regular'}
        </span>
      </div>

      {/* 3. Yawn / Mouth Metric */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="flex items-center gap-1.5 font-medium">
            <Coffee className="w-3.5 h-3.5 text-amber-400" />
            Abertura Oral (MAR)
          </span>
          <span className="font-mono tabular-nums text-slate-200 font-semibold">{yawnPct}%</span>
        </div>

        <div className="space-y-1">
          <div className="h-2 w-full bg-slate-950 border border-slate-800 rounded-sm overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${
                metrics.isYawning ? 'bg-amber-500 animate-pulse' : 'bg-slate-700'
              }`}
              style={{ width: `${yawnPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>Oclusa</span>
            <span>Bocejo Máx</span>
          </div>
        </div>

        <span className="text-[10px] font-mono text-slate-400 mt-1 block">
          {metrics.isYawning ? 'Bocejo em andamento!' : 'Sem bocejo'}
        </span>
      </div>

      {/* 4. Fatigue Level Index */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="flex items-center gap-1.5 font-medium">
            <Gauge className="w-3.5 h-3.5 text-sky-400" />
            Índice de Fadiga
          </span>
          <span className={`font-mono tabular-nums font-bold ${getFatigueColor(metrics.fatigueScore)}`}>
            {metrics.fatigueScore}/100
          </span>
        </div>

        <div className="space-y-1">
          <div className="h-2 w-full bg-slate-950 border border-slate-800 rounded-sm overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                metrics.fatigueScore > 70
                  ? 'bg-rose-500'
                  : metrics.fatigueScore > 40
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${metrics.fatigueScore}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>Nominal</span>
            <span>Exaustão</span>
          </div>
        </div>

        <span className="text-[10px] font-mono text-slate-400 mt-1 block">
          {metrics.fatigueScore > 70
            ? 'Pausa urgente necessária'
            : metrics.fatigueScore > 40
            ? 'Fadiga moderada'
            : 'Vigília adequada'}
        </span>
      </div>
    </div>
  );
};
