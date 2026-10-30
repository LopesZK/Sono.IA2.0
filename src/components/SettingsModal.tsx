import React from 'react';
import { X, Volume2, Bell, Sliders, Smartphone, Check, Moon, Mic } from 'lucide-react';
import { DetectionSettings, AlarmSoundType } from '../types/detector';
import { audioAlarm } from '../services/audioAlarm';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DetectionSettings;
  onUpdateSettings: (newSettings: Partial<DetectionSettings>) => void;
  wakeLockActive: boolean;
}

const SOUND_OPTIONS: { id: AlarmSoundType; label: string; desc: string }[] = [
  {
    id: 'shrill-buzzer',
    label: 'Buzzer Automotivo Agudo',
    desc: 'Tom estridente 1.8kHz - 2.6kHz (acorda instantaneamente)',
  },
  {
    id: 'emergency-siren',
    label: 'Sirene de Emergência',
    desc: 'Onda modulada de alta penetração sonora',
  },
  {
    id: 'two-tone',
    label: 'Sirene Bitonal Rápida',
    desc: 'Alternância Hi-Lo tipo ambulância/resgate',
  },
  {
    id: 'pulsed-alarm',
    label: 'Bipes Pulsantes',
    desc: 'Pulso rápido contínuo de alta frequência',
  },
];

const SLEEP_THRESHOLDS = [
  { sec: 0.8, label: '0.8s', desc: 'Ultra-rápido (máxima proteção)' },
  { sec: 1.2, label: '1.2s', desc: 'Padrão (recomendado para trânsito)' },
  { sec: 1.5, label: '1.5s', desc: 'Moderado (evita falsos alertas)' },
  { sec: 2.0, label: '2.0s', desc: 'Longo (ideal para óculos/piscadas lentas)' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  wakeLockActive,
}) => {
  if (!isOpen) return null;

  const handleTestSound = (type: AlarmSoundType) => {
    audioAlarm.testAlarm(type, settings.volume, settings.voiceAlertsEnabled);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wide">
              Configurações de Segurança
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 pt-4">
          {/* 1. Sleep Detection Threshold */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Tempo de Olhos Fechados para Disparar Alarme
            </label>
            <p className="text-xs text-slate-400 mb-3">
              Quanto tempo com os olhos cerrados antes de tocar a sirene de emergência.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SLEEP_THRESHOLDS.map((item) => (
                <button
                  key={item.sec}
                  onClick={() => onUpdateSettings({ sleepThresholdSeconds: item.sec })}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    settings.sleepThresholdSeconds === item.sec
                      ? 'bg-sky-950/80 border-sky-500 text-sky-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="text-sm font-bold block">{item.label}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Sound Choice */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Tom da Sirene de Alerta
            </label>
            <p className="text-xs text-slate-400 mb-3">
              Escolha o som mais eficiente para quebrar o estado de microssono.
            </p>
            <div className="space-y-2">
              {SOUND_OPTIONS.map((snd) => {
                const isSelected = settings.soundType === snd.id;
                return (
                  <div
                    key={snd.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-rose-950/40 border-rose-500/80 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <button
                      onClick={() => onUpdateSettings({ soundType: snd.id })}
                      className="flex-1 text-left flex items-center gap-2.5"
                    >
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-rose-400 bg-rose-500' : 'border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold block">{snd.label}</span>
                        <span className="text-[11px] text-slate-400 block">{snd.desc}</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleTestSound(snd.id)}
                      className="ml-2 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 font-medium flex items-center gap-1 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-rose-400" />
                      Ouvir
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Volume Slider */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-300 uppercase tracking-wider">
                Volume da Sirene
              </span>
              <span className="font-mono text-slate-200">{Math.round(settings.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={settings.volume}
              onChange={(e) => onUpdateSettings({ volume: parseFloat(e.target.value) })}
              className="w-full accent-rose-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
            <span className="text-[11px] text-slate-400 block mt-1">
              Recomendamos manter no volume máximo (100%) para segurança ao volante.
            </span>
          </div>

          {/* 4. Voice and Vibration Toggles */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            {/* Voice Alert */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-3">
                <Mic className="w-5 h-5 text-sky-400" />
                <div>
                  <span className="text-xs font-bold text-white block">Voz Sintetizada de Alerta</span>
                  <span className="text-[11px] text-slate-400 block">
                    Fala "Atenção motorista! Acorde!" simultaneamente com o som
                  </span>
                </div>
              </div>
              <button
                onClick={() => onUpdateSettings({ voiceAlertsEnabled: !settings.voiceAlertsEnabled })}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  settings.voiceAlertsEnabled ? 'bg-sky-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.voiceAlertsEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Vibration */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-purple-400" />
                <div>
                  <span className="text-xs font-bold text-white block">Vibração do Aparelho</span>
                  <span className="text-[11px] text-slate-400 block">
                    Vibra fortemente o smartphone durante o alarme
                  </span>
                </div>
              </div>
              <button
                onClick={() => onUpdateSettings({ vibrationEnabled: !settings.vibrationEnabled })}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  settings.vibrationEnabled ? 'bg-sky-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.vibrationEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Screen Wake Lock Info */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-amber-400" />
                <div>
                  <span className="text-xs font-bold text-white block">Prevenção de Tela Apagada</span>
                  <span className="text-[11px] text-slate-400 block">
                    {wakeLockActive ? 'Ativo (WakeLock protege tela)' : 'Mantém o display aceso'}
                  </span>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded bg-slate-800 text-[11px] font-mono text-emerald-400">
                {wakeLockActive ? 'ATIVO' : 'AUTO'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 mt-6 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-sky-600/20"
          >
            Salvar e Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
