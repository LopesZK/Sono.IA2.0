import React from 'react';
import { X, Award, AlertTriangle, Flame, Clock, Trash2 } from 'lucide-react';
import { TripSummary } from '../types/detector';

interface TripStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripSummary: TripSummary;
  tripDurationSec: number;
  onClearStats: () => void;
}

export const TripStatsModal: React.FC<TripStatsModalProps> = ({
  isOpen,
  onClose,
  tripSummary,
  tripDurationSec,
  onClearStats,
}) => {
  if (!isOpen) return null;

  const minutes = Math.floor(tripDurationSec / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  const timeFormatted =
    hours > 0 ? `${hours}h ${remainingMins}min` : `${minutes} minutos`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wide">
              Relatório da Viagem Atual
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Big Key Metrics */}
        <div className="grid grid-cols-3 gap-3 my-4">
          {/* Duration */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
            <Clock className="w-4 h-4 text-sky-400 mx-auto mb-1" />
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tempo</span>
            <span className="text-sm font-bold text-white block mt-0.5">{timeFormatted}</span>
          </div>

          {/* Drowsy Incidents */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
            <AlertTriangle className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Sonolência</span>
            <span className="text-sm font-bold text-amber-300 block mt-0.5">
              {tripSummary.totalDrowsyCount} alertas
            </span>
          </div>

          {/* Sleep Critical */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
            <Flame className="w-4 h-4 text-rose-500 mx-auto mb-1" />
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Microssono</span>
            <span className="text-sm font-bold text-rose-400 block mt-0.5">
              {tripSummary.totalAsleepCount} salvos
            </span>
          </div>
        </div>

        {/* Safety Assessment */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mb-4">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
            Diagnóstico de Fadiga
          </span>
          <p className="text-xs text-slate-300 leading-relaxed">
            {tripSummary.totalAsleepCount > 0
              ? 'ALERTA MÁXIMO: Foram detectados episódios críticos de microssono nesta sessão. Você deve encostar em local seguro (posto ou área de descanso) e dormir por pelo menos 20 a 30 minutos antes de continuar guiando.'
              : tripSummary.totalDrowsyCount > 2
              ? 'ATENÇÃO: Múltiplos avisos de fadiga e bocejos foram registrados. Considere tomar água gelada, ventilar a cabine do veículo e programar uma parada em breve.'
              : 'EXCELENTE VIGÍLIA: O motorista manteve bom nível de atenção durante o percurso. Mantenha as pausas regulares a cada 2 horas de volante.'}
          </p>
        </div>

        {/* Event Timeline List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Histórico de Ocorrências
            </span>
            <button
              onClick={onClearStats}
              className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Limpar
            </button>
          </div>

          {tripSummary.events.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl text-xs text-slate-500">
              Nenhuma anomalia de sono registrada nesta viagem.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {tripSummary.events.slice().reverse().map((ev) => {
                const timeStr = new Date(ev.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
                const isAsleep = ev.type === 'asleep';
                return (
                  <div
                    key={ev.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                      isAsleep
                        ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                        : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isAsleep ? (
                        <Flame className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      )}
                      <div>
                        <span className="font-bold block">
                          {isAsleep ? 'Microssono ao volante' : 'Aviso de Sonolência / Bocejo'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Duração: {(ev.durationMs / 1000).toFixed(1)}s · Fadiga: {ev.fatigueScore}%
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">{timeStr}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="pt-4 mt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
