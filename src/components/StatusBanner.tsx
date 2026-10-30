import React from 'react';
import { CheckCircle2, AlertTriangle, Flame, EyeOff, UserX } from 'lucide-react';
import { DriverState, DriverMetrics } from '../types/detector';

interface StatusBannerProps {
  driverState: DriverState;
  metrics: DriverMetrics;
  isMonitoring: boolean;
  sleepThresholdSec: number;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  driverState,
  metrics,
  isMonitoring,
  sleepThresholdSec,
}) => {
  if (!isMonitoring) {
    return (
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 text-center select-none shadow-sm">
        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs sm:text-sm font-medium font-mono">
          <EyeOff className="w-4 h-4 text-slate-500" />
          <span>SISTEMA EM ESPERA · ACIONE "INICIAR SENTINELA" PARA ATIVAR O MONITORAMENTO</span>
        </div>
      </div>
    );
  }

  if (!metrics.faceDetected) {
    return (
      <div className="w-full bg-amber-950/50 border border-amber-600/70 rounded-xl p-3.5 text-center animate-pulse select-none shadow-sm">
        <div className="flex items-center justify-center gap-2 text-amber-300 text-xs sm:text-sm font-semibold font-mono">
          <UserX className="w-4 h-4" />
          <span>ENQUADRAMENTO FACIAL NÃO DETECTADO · ALINHE A CÂMERA À SUA LINHA DE VISÃO</span>
        </div>
      </div>
    );
  }

  if (driverState === 'asleep') {
    const elapsedSec = (metrics.eyesClosedDurationMs / 1000).toFixed(1);
    return (
      <div className="w-full bg-rose-600 border-2 border-rose-400 text-white rounded-xl p-3.5 shadow-[0_0_35px_rgba(225,29,72,0.7)] animate-pulse select-none">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-950/90 rounded-lg text-rose-200">
              <Flame className="w-6 h-6 text-rose-200 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-black tracking-wider uppercase font-mono text-rose-100">
                  DORMINDO! PERIGO IMEDIATO
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-rose-100">
                Olhos oclusos há {elapsedSec}s (limite: {sleepThresholdSec}s) · Alarme máximo ativo!
              </p>
            </div>
          </div>
          <div className="bg-rose-950 px-3 py-1.5 rounded-lg border border-rose-400">
            <span className="text-xs font-mono font-bold text-rose-200 uppercase tracking-widest">
              ALARME DISPARADO
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (driverState === 'drowsy') {
    return (
      <div className="w-full bg-amber-950/60 border border-amber-500/70 rounded-xl p-3.5 text-white shadow-[0_0_20px_rgba(245,158,11,0.25)] select-none">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-900/60 rounded-lg text-amber-300">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold tracking-wide uppercase font-mono text-amber-300">
                SONOLÊNCIA DETECTADA · FADIGA OCULAR
              </span>
              <p className="text-xs text-amber-200/90">
                {metrics.isYawning
                  ? 'Bocejo frequente detectado. Programe parada em posto seguro.'
                  : 'Pálpebras caídas ou piscadas prolongadas detectadas.'}
              </p>
            </div>
          </div>
          <div className="bg-amber-950 px-3 py-1.5 rounded-lg border border-amber-600">
            <span className="text-xs font-mono text-amber-300 font-bold">ALERTA PREVENTIVO</span>
          </div>
        </div>
      </div>
    );
  }

  // Awake / Alert
  return (
    <div className="w-full bg-slate-900/90 border border-emerald-600/60 rounded-xl p-3.5 text-white select-none shadow-sm">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-950/80 rounded-lg text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold tracking-wide uppercase font-mono text-emerald-400">
              MOTORISTA ATENTO · STATUS NOMINAL
            </span>
            <p className="text-xs text-slate-300">
              Olhos abertos ({Math.round(metrics.averageEyeOpen * 100)}%) · Cadência de piscadas regular · Sentinela ativa
            </p>
          </div>
        </div>
        <div className="bg-emerald-950/80 px-3 py-1.5 rounded-lg border border-emerald-600/50">
          <span className="text-xs font-mono text-emerald-400 font-semibold tracking-wide">STATUS SEGURO</span>
        </div>
      </div>
    </div>
  );
};
