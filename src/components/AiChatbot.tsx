import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  FileText,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldAlert,
  Loader2,
  Download,
  Cpu,
} from 'lucide-react';
import { DriverMetrics, TripSummary } from '../types/detector';
import { localDb, StoredTrip, DriverProfile } from '../services/database';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  intent?: {
    name: string;
    confidence: number;
  };
  engine?: string;
}

interface AiChatbotProps {
  metrics: DriverMetrics;
  tripSummary: TripSummary;
  tripDurationSec: number;
  currentTripId: string | null;
  className?: string;
}

const QUICK_PROMPTS = [
  {
    label: 'Gerar Relatório da Viagem',
    icon: FileText,
    prompt: 'Por favor, analise a telemetria da minha viagem atual e gere um Relatório Completo de Segurança e Fadiga com diagnóstico de risco e recomendações.',
  },
  {
    label: 'Quando devo parar?',
    icon: Clock,
    prompt: 'Com base no meu tempo de direção e alertas de sono, qual o momento ideal para fazer uma parada segura e o que fazer no descanso?',
  },
  {
    label: 'Dicas para Direção Noturna',
    icon: Sparkles,
    prompt: 'Quais as melhores técnicas científicas para evitar o sono e fadiga visual durante viagens noturnas longas?',
  },
  {
    label: 'O que é Microssono?',
    icon: ShieldAlert,
    prompt: 'O que caracteriza um microssono ao volante, quanto tempo dura e qual a distância que o carro percorre sem controle?',
  },
];

export const AiChatbot: React.FC<AiChatbotProps> = ({
  metrics,
  tripSummary,
  tripDurationSec,
  currentTripId,
  className,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: `Olá! Sou o **Copiloto Rasa do VigiDrive**. Meu motor de Processamento de Linguagem Natural (NLU) e Diálogo Core opera de forma instantânea, gratuita e ilimitada.

Posso emitir relatórios executivos da sua viagem atual, analisar seus parâmetros de fadiga ocular (EAR/MAR) ou esclarecer qualquer dúvida de trânsito e combate ao sono ao volante.

Selecione uma ação rápida ou envie sua pergunta:`,
      timestamp: Date.now(),
      engine: 'Rasa NLU & Core v3.x',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom();
    }
  }, [messages, isExpanded]);

  // Gather context from localDb and live props
  const buildTripContext = async () => {
    let profile: DriverProfile | undefined;
    let historicalTrips: StoredTrip[] = [];

    try {
      profile = await localDb.getProfile();
      historicalTrips = await localDb.getAllTrips();
    } catch (e) {
      console.warn('Could not load context from localDb:', e);
    }

    return {
      currentTrip: {
        id: currentTripId,
        durationSeconds: tripDurationSec,
        totalDrowsyCount: tripSummary.totalDrowsyCount,
        totalAsleepCount: tripSummary.totalAsleepCount,
        fatigueScore: metrics.fatigueScore,
        averageEyeOpen: metrics.averageEyeOpen,
        fps: metrics.fps,
      },
      driverProfile: profile || { name: 'Motorista' },
      historicalTripsCount: historicalTrips.length,
      recentEvents: tripSummary.events.slice(-5),
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: 'usr_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const tripContext = await buildTripContext();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          tripContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`Falha no servidor Rasa (${response.status})`);
      }

      const data = await response.json();
      const botReply: Message = {
        id: 'bot_' + Date.now(),
        role: 'model',
        content: data.response || 'Não recebi uma resposta válida do motor Rasa.',
        timestamp: Date.now(),
        intent: data.intent,
        engine: data.engine || 'Rasa Core',
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err: any) {
      console.error('Rasa Chatbot error:', err);
      const errorMsg: Message = {
        id: 'err_' + Date.now(),
        role: 'model',
        content: `Falha ao processar pelo motor Rasa: ${err?.message || 'Verifique a conexão.'}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadReport = (content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vigidrive-rasa-relatorio-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearHistory = () => {
    if (confirm('Deseja limpar o histórico do console Rasa?')) {
      setMessages([
        {
          id: 'welcome_reset',
          role: 'model',
          content: 'Console Rasa reiniciado. Como posso orientar sua viagem agora?',
          timestamp: Date.now(),
          engine: 'Rasa NLU & Core v3.x',
        },
      ]);
    }
  };

  return (
    <div
      className={`w-full bg-slate-950/95 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all ${
        className || 'h-[640px] max-w-md mx-auto'
      }`}
    >
      {/* Top Industrial Instrumentation Header */}
      <div className="flex items-center justify-between p-3.5 bg-slate-900/90 border-b border-slate-800/80 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono">
                RASA CORE · NLU AI
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Processamento NLU nativo · Gratuito e ilimitado
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 1 && (
            <button
              onClick={handleClearHistory}
              title="Limpar histórico"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors text-xs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Recolher Terminal' : 'Expandir Terminal'}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-xs"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Main Terminal Body */}
      {isExpanded && (
        <div className="flex flex-col flex-1 overflow-hidden bg-slate-950/70">
          {/* Quick Prompts 2x2 Grid */}
          <div className="p-2.5 bg-slate-900/40 border-b border-slate-800/80 grid grid-cols-2 gap-1.5 select-none">
            {QUICK_PROMPTS.map((qp, idx) => {
              const Icon = qp.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(qp.prompt)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all text-[11px] font-medium active:scale-95 text-left leading-tight"
                >
                  <Icon className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                  <span className="truncate">{qp.label}</span>
                </button>
              );
            })}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3.5 text-xs">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[78%] rounded-xl p-3 relative group ${
                      isUser
                        ? 'bg-sky-600 text-white rounded-br-none shadow-md'
                        : 'bg-slate-900/90 border border-slate-800/90 text-slate-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {/* Model metadata banner if available */}
                    {!isUser && m.intent && (
                      <div className="text-[10px] font-mono text-sky-400/90 mb-1.5 pb-1 border-b border-slate-800 flex items-center justify-between">
                        <span>intent: {m.intent.name}</span>
                        <span>{Math.round(m.intent.confidence * 100)}% conf</span>
                      </div>
                    )}

                    {/* Message Body */}
                    <div className="whitespace-pre-wrap leading-relaxed space-y-1.5 font-sans">
                      {m.content}
                    </div>

                    {/* Message Footer */}
                    {!isUser && (
                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-800/60 text-[10px] text-slate-500">
                        <span className="font-mono">
                          {new Date(m.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCopy(m.id, m.content)}
                            title="Copiar texto"
                            className="p-1 hover:text-slate-200 transition-colors"
                          >
                            {copiedId === m.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDownloadReport(m.content)}
                            title="Baixar Relatório como Arquivo"
                            className="p-1 hover:text-sky-300 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-xs text-sky-400 py-2 font-mono">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center flex-shrink-0 animate-spin">
                  <Loader2 className="w-4 h-4" />
                </div>
                <span className="animate-pulse">Rasa NLU processando intenção e telemetria...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua dúvida ou peça um relatório Rasa..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors font-sans"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40 disabled:hover:bg-sky-600 transition-all shadow-md flex-shrink-0"
              title="Enviar para o Rasa"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
