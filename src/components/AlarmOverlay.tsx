import React, { useEffect, useState } from 'react';
import { Bell, Volume2, ShieldCheck, PhoneCall, Coffee } from 'lucide-react';
import { DriverMetrics } from '../types/detector';

interface AlarmOverlayProps {
  isOpen: boolean;
  metrics: DriverMetrics;
  onDismiss: () => void;
  onOpenTips: () => void;
  sleepThresholdSec: number;
}

export const AlarmOverlay: React.FC<AlarmOverlayProps> = ({
  isOpen,
  metrics,
  onDismiss,
  onOpenTips,
  sleepThresholdSec,
}) => {
  const [pulsePhase, setPulsePhase] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setPulsePhase((prev) => !prev);
    }, 280);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const secondsClosed = (metrics.eyesClosedDurationMs / 1000).toFixed(1);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-6 select-none transition-colors duration-150 ${
        pulsePhase
          ? 'bg-rose-950/95 border-[12px] border-rose-600'
          : 'bg-black/95 border-[12px] border-rose-500'
      }`}
    >
      {/* Top Banner */}
      <div className="w-full max-w-md mx-auto text-center pt-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-600 text-white text-xs font-black uppercase tracking-widest animate-bounce mb-3 shadow-lg">
          <Bell className="w-4 h-4 fill-white" />
          ALERTA CRÍTICO DE MICROSSONO
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase leading-tight">
          ACORDE!
        </h2>
        <p className="text-rose-200 text-base sm:text-lg font-semibold mt-1">
          Olhos fechados por mais de {secondsClosed}s ao volante!
        </p>
      </div>

      {/* Central Pulsating Warning Icon */}
      <div className="flex flex-col items-center my-auto">
        <div
          className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center transition-transform duration-150 ${
            pulsePhase ? 'scale-110 bg-rose-600 shadow-[0_0_80px_rgba(225,29,72,0.9)]' : 'scale-95 bg-rose-700'
          }`}
        >
          <Volume2 className="w-16 h-16 sm:w-20 sm:h-20 text-white animate-pulse" />
        </div>
        <p className="text-xs sm:text-sm font-mono text-rose-300 uppercase tracking-widest mt-4">
          Sirene acústica em volume máximo · Limite de segurança: {sleepThresholdSec}s
        </p>
      </div>

      {/* Bottom Emergency Controls */}
      <div className="w-full max-w-md mx-auto space-y-3 pb-2">
        {/* Giant One-Tap Wakeup Confirmation Button */}
        <button
          onClick={onDismiss}
          className="w-full py-5 px-6 rounded-2xl bg-white hover:bg-slate-100 text-rose-700 hover:text-rose-800 text-lg sm:text-xl font-black tracking-wide uppercase shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all active:scale-95 flex items-center justify-center gap-3 border-4 border-rose-300"
        >
          <ShieldCheck className="w-7 h-7 text-rose-600" />
          ESTOU ACORDADO! DESATIVAR
        </button>

        {/* Secondary Safety Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              onDismiss();
              onOpenTips();
            }}
            className="py-3 px-3 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Coffee className="w-4 h-4 text-amber-400" />
            Parar para Café / Repouso
          </button>

          <a
            href="tel:190"
            className="py-3 px-3 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <PhoneCall className="w-4 h-4 text-emerald-400" />
            Ligar Emergência (190)
          </a>
        </div>
      </div>
    </div>
  );
};
