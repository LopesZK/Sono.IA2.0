import React from 'react';
import { X, Coffee, Wind, Droplets, PhoneCall, ShieldCheck, HeartHandshake } from 'lucide-react';

interface SafetyTipsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SafetyTipsDrawer: React.FC<SafetyTipsDrawerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wide">
              Dicas de Sobrevivência contra o Sono
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 pt-4 text-xs">
          {/* Tip 1 */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 flex-shrink-0">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm mb-1">A Técnica do "Coffee Nap"</h3>
              <p className="text-slate-300 leading-relaxed">
                Tome uma xícara de café puro e durma imediatamente por 15 a 20 minutos em um posto seguro. A cafeína leva ~20 minutos para agir no cérebro, limpando a adenosina enquanto você cochila, permitindo acordar revigorado.
              </p>
            </div>
          </div>

          {/* Tip 2 */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 flex-shrink-0">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm mb-1">Circulação de Oxigênio</h3>
              <p className="text-slate-300 leading-relaxed">
                O acúmulo de $CO_2$ com vidros fechados e recirculação do ar-condicionado é uma das maiores causas de sonolência no trânsito. Abra as janelas por 3 minutos ou desligue a recirculação interna.
              </p>
            </div>
          </div>

          {/* Tip 3 */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 flex-shrink-0">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm mb-1">Água Gelada no Rosto</h3>
              <p className="text-slate-300 leading-relaxed">
                Em caso de sonolência súbita, pare no próximo acostamento seguro ou posto e lave o rosto e nuca com água gelada. Beba 500ml de água, pois desidratação reduz a atenção em 40%.
              </p>
            </div>
          </div>

          {/* Tip 4 */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm mb-1">Microssono mata</h3>
              <p className="text-slate-300 leading-relaxed">
                A 100 km/h, fechar os olhos por apenas 1.5 segundos significa que o veículo percorreu mais de <strong>42 metros completamente às cegas</strong> sem qualquer controle do motorista.
              </p>
            </div>
          </div>

          {/* Emergency Helplines Brazil */}
          <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-800/60">
            <h4 className="font-bold text-rose-200 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4 text-rose-400" />
              Telefones de Emergência Rodoviária
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <a
                href="tel:191"
                className="p-2 rounded-xl bg-rose-900/40 hover:bg-rose-900/80 border border-rose-700/50 block text-rose-200"
              >
                <span className="font-black text-sm block">191</span>
                <span className="text-[10px] text-slate-300">PRF Rodovias</span>
              </a>
              <a
                href="tel:193"
                className="p-2 rounded-xl bg-rose-900/40 hover:bg-rose-900/80 border border-rose-700/50 block text-rose-200"
              >
                <span className="font-black text-sm block">193</span>
                <span className="text-[10px] text-slate-300">Bombeiros</span>
              </a>
              <a
                href="tel:192"
                className="p-2 rounded-xl bg-rose-900/40 hover:bg-rose-900/80 border border-rose-700/50 block text-rose-200"
              >
                <span className="font-black text-sm block">192</span>
                <span className="text-[10px] text-slate-300">SAMU</span>
              </a>
            </div>
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            Entendido, Boa Viagem!
          </button>
        </div>
      </div>
    </div>
  );
};
