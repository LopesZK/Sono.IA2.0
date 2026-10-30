import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Calendar,
  Clock,
  AlertTriangle,
  Flame,
  Download,
  Trash2,
  User,
  Car,
  ChevronRight,
  ShieldCheck,
  Check,
  FileSpreadsheet,
} from 'lucide-react';
import { localDb, StoredTrip, StoredAlertEvent, DriverProfile } from '../services/database';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTripId: string | null;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  currentTripId,
}) => {
  const [activeTab, setActiveTab] = useState<'trips' | 'profile' | 'export'>('trips');
  const [trips, setTrips] = useState<StoredTrip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<StoredTrip | null>(null);
  const [selectedTripEvents, setSelectedTripEvents] = useState<StoredAlertEvent[]>([]);
  const [profile, setProfile] = useState<DriverProfile>({
    id: 'current_driver',
    name: 'Motorista Padrão',
    vehicle: 'Veículo Particular',
    preferredSound: 'shrill-buzzer',
    createdAt: Date.now(),
  });
  const [isSavedMessage, setIsSavedMessage] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load trips from DB
  const loadTrips = async () => {
    setLoading(true);
    try {
      const allTrips = await localDb.getAllTrips();
      setTrips(allTrips);
      const savedProfile = await localDb.getProfile();
      if (savedProfile) {
        setProfile(savedProfile);
      }
    } catch (e) {
      console.error('Error loading trips from database:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTrips();
      setSelectedTrip(null);
      setSelectedTripEvents([]);
    }
  }, [isOpen]);

  // View specific trip details
  const handleSelectTrip = async (trip: StoredTrip) => {
    setSelectedTrip(trip);
    try {
      const events = await localDb.getEventsForTrip(trip.id);
      setSelectedTripEvents(events);
    } catch (err) {
      console.error('Failed to load trip events:', err);
    }
  };

  // Delete trip
  const handleDeleteTrip = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja excluir permanentemente este registro de viagem do banco de dados?')) {
      await localDb.deleteTrip(id);
      if (selectedTrip?.id === id) {
        setSelectedTrip(null);
      }
      loadTrips();
    }
  };

  // Save profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await localDb.saveProfile(profile);
    setIsSavedMessage(true);
    setTimeout(() => setIsSavedMessage(false), 2500);
  };

  // Export JSON
  const handleExportJSON = async () => {
    const allTrips = await localDb.getAllTrips();
    const exportData: any[] = [];

    for (const t of allTrips) {
      const events = await localDb.getEventsForTrip(t.id);
      exportData.push({ ...t, events });
    }

    const blob = new Blob([JSON.stringify({ exportDate: new Date().toISOString(), driver: profile, trips: exportData }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vigidrive-relatorio-banco-de-dados-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV
  const handleExportCSV = async () => {
    const allTrips = await localDb.getAllTrips();
    let csv = 'ID_Viagem,Data,Duracao_Segundos,Alertas_Sonolencia,Microssonos_Prevenidos,Fadiga_Media,Status\n';

    allTrips.forEach((t) => {
      const dateStr = new Date(t.startTime).toLocaleString('pt-BR');
      csv += `"${t.id}","${dateStr}",${t.durationSeconds},${t.totalDrowsyCount},${t.totalAsleepCount},${t.averageFatigueScore},"${t.status}"\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vigidrive-viagens-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear all database
  const handleClearAll = async () => {
    if (confirm('ATENÇÃO: Deseja apagar TODO o banco de dados local com todas as viagens e históricos? Esta ação não pode ser desfeita.')) {
      await localDb.clearAllData();
      setSelectedTrip(null);
      loadTrips();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm select-none">
      <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wide">
                Banco de Dados VigiDrive
              </h2>
              <span className="text-xs text-slate-400">
                Armazenamento Transacional Persistente (IndexedDB)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl my-4 flex-shrink-0 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('trips');
              setSelectedTrip(null);
            }}
            className={`flex-1 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'trips'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            Viagens Salvas ({trips.length})
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            Perfil do Motorista
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'export'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-4 h-4" />
            Exportar / Backup
          </button>
        </div>

        {/* Tab 1: Saved Trips List or Detail */}
        {activeTab === 'trips' && (
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {selectedTrip ? (
              // Trip Detail View
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedTrip(null)}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                  >
                    ← Voltar para lista de viagens
                  </button>
                  <span className="text-[11px] font-mono text-slate-400">
                    ID: {selectedTrip.id}
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Data / Hora</span>
                      <span className="text-xs font-bold text-white block mt-0.5">
                        {new Date(selectedTrip.startTime).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Duração</span>
                      <span className="text-xs font-bold text-white block mt-0.5">
                        {Math.floor(selectedTrip.durationSeconds / 60)}m {selectedTrip.durationSeconds % 60}s
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Sonolência</span>
                      <span className="text-xs font-bold text-amber-400 block mt-0.5">
                        {selectedTrip.totalDrowsyCount} eventos
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Microssonos</span>
                      <span className="text-xs font-bold text-rose-500 block mt-0.5">
                        {selectedTrip.totalAsleepCount} salvos
                      </span>
                    </div>
                  </div>
                </div>

                {/* Events list in this trip */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Eventos de Alerta Gravados no Banco ({selectedTripEvents.length})
                  </h4>

                  {selectedTripEvents.length === 0 ? (
                    <div className="p-5 border border-dashed border-slate-800 rounded-2xl text-center text-xs text-slate-500">
                      Nenhum alarme acionado durante esta viagem. Motorista permaneceu 100% acordado.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedTripEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                            ev.type === 'asleep'
                              ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                              : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {ev.type === 'asleep' ? (
                              <Flame className="w-4 h-4 text-rose-500 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            )}
                            <div>
                              <span className="font-bold block">
                                {ev.type === 'asleep'
                                  ? 'Alarme de Sono Disparado'
                                  : 'Aviso Preventivo de Sonolência'}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                Olhos fechados por {(ev.eyesClosedDurationMs / 1000).toFixed(1)}s · Fadiga: {ev.fatigueScore}%
                              </span>
                            </div>
                          </div>
                          <span className="font-mono text-[11px] text-slate-400">
                            {new Date(ev.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Trips list
              <>
                {loading ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Acessando registros do banco de dados...
                  </div>
                ) : trips.length === 0 ? (
                  <div className="py-12 border border-dashed border-slate-800 rounded-3xl text-center p-6">
                    <Database className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-300">
                      Nenhuma viagem gravada ainda
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Inicie o monitoramento ao vivo no painel principal. Ao concluir a viagem, os dados de atenção, piscadas e alarmes são gravados automaticamente no banco local.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {trips.map((t) => {
                      const isCurrent = t.id === currentTripId;
                      const dateStr = new Date(t.startTime).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const mins = Math.floor(t.durationSeconds / 60);
                      const secs = t.durationSeconds % 60;

                      return (
                        <div
                          key={t.id}
                          onClick={() => handleSelectTrip(t)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isCurrent
                              ? 'bg-sky-950/30 border-sky-500/60 ring-1 ring-sky-500/30'
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2.5 rounded-xl ${
                                t.totalAsleepCount > 0
                                  ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                                  : t.totalDrowsyCount > 0
                                  ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                                  : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                              }`}
                            >
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{dateStr}</span>
                                {isCurrent && (
                                  <span className="text-[10px] font-mono text-sky-400 bg-sky-950 px-2 py-0.5 rounded-md border border-sky-800">
                                    EM ANDAMENTO
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                                <span>Duração: {mins}m {secs}s</span>
                                <span>·</span>
                                <span className={t.totalDrowsyCount > 0 ? 'text-amber-400' : ''}>
                                  {t.totalDrowsyCount} sonolência
                                </span>
                                <span>·</span>
                                <span className={t.totalAsleepCount > 0 ? 'text-rose-400 font-bold' : ''}>
                                  {t.totalAsleepCount} sono
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleDeleteTrip(t.id, e)}
                              title="Excluir Viagem"
                              className="p-2 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab 2: Driver Profile */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-sky-400" />
                Dados do Condutor
              </h3>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">
                  Nome do Motorista
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Ex: Carlos Silva"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">
                  Veículo / Placa
                </label>
                <div className="relative">
                  <Car className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={profile.vehicle}
                    onChange={(e) => setProfile({ ...profile, vehicle: e.target.value })}
                    placeholder="Ex: Toyota Corolla · Placa ABC-1234"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">
                  Contato de Emergência (Nome / Telefone)
                </label>
                <input
                  type="text"
                  value={profile.emergencyContactPhone || ''}
                  onChange={(e) => setProfile({ ...profile, emergencyContactPhone: e.target.value })}
                  placeholder="Ex: Esposa / Mãe: (11) 98765-4321"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {isSavedMessage && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Perfil salvo no banco de dados com sucesso!</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-sky-600/20"
            >
              Salvar Perfil no Banco de Dados
            </button>
          </form>
        )}

        {/* Tab 3: Export & Database Maintenance */}
        {activeTab === 'export' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Exportar Histórico Completo
              </h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Exporte todos os registros de viagens, telemetria de olhos fechados e acionamentos de alarme para arquivos compatíveis com Excel, Google Planilhas ou sistemas de gestão de frota.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  onClick={handleExportCSV}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Exportar Planilha CSV
                </button>

                <button
                  onClick={handleExportJSON}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4 text-sky-400" />
                  Exportar Backup JSON
                </button>
              </div>
            </div>

            {/* Danger zone */}
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-900/60">
              <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider mb-1 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                Limpeza do Banco de Dados
              </h4>
              <p className="text-xs text-rose-200/80 mb-3">
                Apaga todas as viagens e históricos de alarme gravados neste aparelho.
              </p>
              <button
                onClick={handleClearAll}
                className="py-2.5 px-4 rounded-xl bg-rose-900/40 hover:bg-rose-800 text-rose-200 text-xs font-semibold border border-rose-700/60 transition-colors"
              >
                Limpar Todos os Registros do Banco
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Dados 100% offline e privados neste aparelho</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
