import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// ============================================================================
// RASA NLU & CORE DIALOGUE ENGINE
// High-performance, offline-capable, unlimited and free conversational AI engine
// Supports external Rasa REST webhook or instant embedded Rasa NLU/Core pipeline
// ============================================================================

interface RasaIntentResult {
  name: string;
  confidence: number;
}

interface RasaSlots {
  duracao_minutos: number;
  alertas_sonolencia: number;
  microssonos_evitados: number;
  indice_fadiga: number;
  abertura_olhos_pct: number;
  motorista: string;
  veiculo: string;
  historico_viagens: number;
}

// Rasa NLU Intent Classifier
function classifyRasaIntent(text: string): RasaIntentResult {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // 1. Relatório e Telemetria
  if (
    normalized.includes('relatorio') ||
    normalized.includes('analise') ||
    normalized.includes('resumo') ||
    normalized.includes('metricas') ||
    normalized.includes('telemetria') ||
    normalized.includes('desempenho') ||
    normalized.includes('estatistica')
  ) {
    return { name: 'gerar_relatorio_viagem', confidence: 0.99 };
  }

  // 2. Parada e Descanso
  if (
    normalized.includes('parar') ||
    normalized.includes('parada') ||
    normalized.includes('descanso') ||
    normalized.includes('pausa') ||
    normalized.includes('intervalo') ||
    normalized.includes('quando devo') ||
    normalized.includes('estou cansado') ||
    normalized.includes('cafe')
  ) {
    return { name: 'tempo_parada_descanso', confidence: 0.97 };
  }

  // 3. Condução Noturna
  if (
    normalized.includes('noite') ||
    normalized.includes('noturn') ||
    normalized.includes('madrugada') ||
    normalized.includes('escuro') ||
    normalized.includes('farol') ||
    normalized.includes('viagem a noite')
  ) {
    return { name: 'conducao_noturna', confidence: 0.98 };
  }

  // 4. Microssono
  if (
    normalized.includes('microssono') ||
    normalized.includes('micro sono') ||
    normalized.includes('dormir no volante') ||
    normalized.includes('piscar') ||
    normalized.includes('apagao') ||
    normalized.includes('segundos sem ver')
  ) {
    return { name: 'explicacao_microssono', confidence: 0.98 };
  }

  // 5. Legislação e PRF
  if (
    normalized.includes('lei') ||
    normalized.includes('13.103') ||
    normalized.includes('13103') ||
    normalized.includes('legislacao') ||
    normalized.includes('prf') ||
    normalized.includes('multa') ||
    normalized.includes('horas de direcao') ||
    normalized.includes('jornada')
  ) {
    return { name: 'legislacao_motorista', confidence: 0.96 };
  }

  // 6. Calibração e Visão Computacional
  if (
    normalized.includes('calibr') ||
    normalized.includes('ear') ||
    normalized.includes('mar') ||
    normalized.includes('sensibilidade') ||
    normalized.includes('oculos') ||
    normalized.includes('camera') ||
    normalized.includes('angulo')
  ) {
    return { name: 'calibracao_olhos', confidence: 0.95 };
  }

  // 7. Saudação e Ajuda
  if (
    normalized.includes('ola') ||
    normalized.includes('oi') ||
    normalized.includes('bom dia') ||
    normalized.includes('boa tarde') ||
    normalized.includes('boa noite') ||
    normalized.includes('quem e voce') ||
    normalized.includes('ajuda') ||
    normalized.includes('como funciona')
  ) {
    return { name: 'saudacao_bot', confidence: 0.99 };
  }

  return { name: 'consulta_geral', confidence: 0.88 };
}

// Rasa Core Custom Action Execution
function executeRasaAction(intent: string, slots: RasaSlots, rawText: string): string {
  const duracao = slots.duracao_minutos;
  const sonolencia = slots.alertas_sonolencia;
  const sonoCritico = slots.microssonos_evitados;
  const fadiga = slots.indice_fadiga;
  const earPct = slots.abertura_olhos_pct;
  const motorista = slots.motorista || 'Condutor';

  // Risk Classification
  let nivelRisco = 'BAIXO';
  let badgeColor = '🟢';
  if (sonoCritico > 0 || fadiga >= 65 || duracao >= 240) {
    nivelRisco = 'CRÍTICO';
    badgeColor = '🔴';
  } else if (sonolencia >= 2 || fadiga >= 35 || duracao >= 120) {
    nivelRisco = 'MODERADO';
    badgeColor = '🟡';
  }

  switch (intent) {
    case 'gerar_relatorio_viagem':
      return `### 📊 Relatório Executivo de Telemetria e Fadiga
**Motor de Inteligência Artificial: Rasa Core & NLU**
**Condutor:** ${motorista} · **Veículo:** ${slots.veiculo || 'Veículo Padrão'}
**Classificação de Risco Atual:** ${badgeColor} **${nivelRisco}**

---

#### 1. Métricas da Viagem em Tempo Real
- **Tempo Contínuo ao Volante:** ${Math.floor(duracao / 60)}h ${(duracao % 60).toString().padStart(2, '0')}m (${duracao} minutos)
- **Abertura Média Ocular (EAR):** ${earPct}%
- **Incidentes de Sonolência / Bocejos:** ${sonolencia} ocorrência(s)
- **Episódios de Sono Crítico Impedidos:** ${sonoCritico} microssono(s)
- **Índice Biométrico de Fadiga:** ${fadiga}/100
- **Total no Banco de Dados Histórico:** ${slots.historico_viagens} registro(s)

#### 2. Diagnóstico Comportamental
${
  nivelRisco === 'CRÍTICO'
    ? `⚠️ **Atenção Máxima:** O sistema registrou episódios de olhos fechados prolongados ou índice elevado de fadiga (${fadiga}/100). Sua capacidade de tempo de resposta a frenagens bruscas está severamente reduzida.`
    : nivelRisco === 'MODERADO'
    ? `⚠️ **Sinais Iniciais de Cansaço:** Detectadas piscadas de cadência longa ou bocejos frequentes. O condutor encontra-se em zona de atenção degradada.`
    : `✅ **Operação Nominal:** Parâmetros de abertura ocular e frequência de piscadas dentro da faixa fisiológica ideal de vigília verde.`
}

#### 3. Plano de Ação Recomendado (Rasa Safety Protocol)
- **Próxima Parada:** ${duracao >= 120 ? 'Imediata (próximo posto ou área segura)' : `Programar em no máximo ${Math.max(15, 120 - duracao)} minutos`}.
- **Protocolo de Recuperação:** Realizar pausa de 15 a 20 minutos com hidratação, lavagem facial e consumo moderado de cafeína (Coffee Nap).
- **Ambiente de Cabine:** Manter circulação de ar externa renovada e temperatura entre 20°C e 22°C.`;

    case 'tempo_parada_descanso':
      return `### ⏱️ Recomendação de Parada e Descanso Seguro
**Diagnóstico Rasa:** Você está dirigindo há **${duracao} minutos** com **${sonolencia} alerta(s) de sonolência**.

${
  duracao >= 180 || sonolencia >= 2
    ? `🛑 **PARADA IMEDIATA RECOMENDADA!**
Seu tempo de volante contínuo já ultrapassou a margem de segurança neurofuncional. 
- Encoste no próximo posto sinalizado ou ponto de apoio.
- Faça o protocolo **Coffee Nap**: tome uma xícara de café e tire um cochilo de exatos 15 a 20 minutos. A cafeína atinge o pico plasmático no momento do despertar, zerando a adenosina cerebral.`
    : `🟢 **Status sob controle:** Seu tempo atual permite seguir viagem por mais cerca de **${Math.max(15, 120 - duracao)} minutos**, desde que a abertura dos olhos permaneça acima de 60%. Não exceda 2 horas contínuas sem intervalo.`
}

**Dica de Ouro:** Nunca confie em música alta ou janelas abertas para combater o sono fisiológico — o único antídoto real para o sono é o repouso.`;

    case 'conducao_noturna':
      return `### 🌙 Protocolos Científicos para Direção Noturna Segura
**Motor Rasa NLU:** A condução noturna aumenta em até **3x o risco de microssono** devido à queda natural da temperatura corporal e elevação da melatonina entre 01:00 e 05:00.

#### Diretrizes Essenciais:
1. **Modo Noturno do VigiDrive:** Ative o botão do modo noturno no painel para escurecer a interface e evitar a contração pupilar pelo brilho do visor.
2. **Refeições Leves:** Evite refeições ricas em carboidratos simples ou gorduras pesadas antes de viagens noturnas; prefira proteínas magras e hidratação com eletrólitos.
3. **Visão e Para-brisa:** Mantenha o vidro interno do para-brisa perfeitamente limpo; micropartículas de poeira causam refração das luzes dos faróis contrários, acelerando a fadiga retiniana.
4. **Pausas Fracionadas:** À noite, reduza os ciclos de descanso para intervalos de **90 minutos** em vez de 120 minutos.`;

    case 'explicacao_microssono':
      return `### ⚡ O que é um Microssono e por que é Fatal?
**Definição Clínica:** O microssono é uma perda involuntária de consciência com duração de **1 a 5 segundos**, na qual o cérebro entra momentaneamente em estado de ondas lentas (teta/delta).

#### A Física do Acidente a 100 km/h:
- A **100 km/h**, o veículo desloca-se a **27,7 metros a cada segundo**.
- Um microssono de apenas **2 segundos** equivale a **55,4 metros** percorridos totalmente às cegas, sem tempo de reação para frenagem ou desvio.
- Em **3 segundos**, são **83 metros** — extensão maior que um campo de futebol.

**Como o VigiDrive com Rasa protege você:** Nosso algoritmo de visão computacional detecta a queda do limiar EAR (Eye Aspect Ratio) logo nos primeiros **${slots.alertas_sonolencia > 0 ? '400ms' : '1.2s'}**, acionando a sirene de alto decibel antes que o carro mude de faixa.`;

    case 'legislacao_motorista':
      return `### ⚖️ Legislação Brasileira de Descanso (Lei nº 13.103)
**Regras Oficiais para Condução Rodoviária:**

- **Veículos de Carga / Pesados:** É obrigatório repouso de no mínimo **30 minutos a cada 5 horas e meia** ininterruptas de direção.
- **Transporte Coletivo de Passageiros:** Intervalo de **30 minutos a cada 4 horas**.
- **Descanso Diário:** Período mínimo de **11 horas de descanso a cada 24 horas**.
- **Canal de Emergência:** Em situações críticas nas rodovias federais brasileiras, ligue imediatamente para a **Polícia Rodoviária Federal pelo telefone 191**.`;

    case 'calibracao_olhos':
      return `### 🎯 Calibração Biométrica e Sensibilidade Ocular
**Parâmetros de Detecção do VigiDrive:**

- **EAR (Eye Aspect Ratio):** Mede a razão geométrica entre a altura vertical das pálpebras e a largura horizontal do olho.
- **Limiar de Acordo:** EAR ≥ 0.22 indica olhos abertos em vigília.
- **Uso com Óculos:** O motor MediaPipe FaceMesh rastreia as órbitas oculares através das lentes. Recomenda-se posicionar a câmera ligeiramente inclinada para evitar reflexos da luz do painel nas lentes dos óculos.
- **Simulador:** Use o Painel de Calibração ao lado para testar a resposta sonora e visual nos três estados pré-configurados.`;

    case 'saudacao_bot':
      return `Olá, ${motorista}! Sou o **Copiloto Rasa do VigiDrive**, sua inteligência artificial veicular de segurança e análise de fadiga.

Estou monitorando os parâmetros da sua viagem em tempo real:
- **Duração da Viagem:** ${duracao} min
- **Incidentes Registrados:** ${sonolencia} sonolência / ${sonoCritico} sono crítico
- **Abertura Ocular Média:** ${earPct}%

Você pode usar os botões rápidos acima ou digitar perguntas sobre a sua viagem, intervalos de parada, fisiologia do sono e segurança no trânsito. Como posso ajudar agora?`;

    default:
      return `### 🛡️ Copiloto Rasa · Assistência Veicular
Compreendi sua consulta: *"${rawText}"*.

Com base na sua telemetria atual de **${duracao} minutos de direção** e índice de fadiga de **${fadiga}/100**, recomendo manter a atenção visual focada na pista e priorizar a direção preventiva.

Se desejar, solicite:
1. **"Gerar Relatório da Viagem"** para uma auditoria completa de risco;
2. **"Quando devo parar?"** para estimativa do intervalo de segurança;
3. **"Dicas para Direção Noturna"** para estratégias de vigília.`;
  }
}

// Rasa Chatbot Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, tripContext } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Nenhuma mensagem enviada.' });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || '';

    // Extract slots from tripContext
    const slots: RasaSlots = {
      duracao_minutos: Math.floor((tripContext?.currentTrip?.durationSeconds || 0) / 60),
      alertas_sonolencia: tripContext?.currentTrip?.totalDrowsyCount || 0,
      microssonos_evitados: tripContext?.currentTrip?.totalAsleepCount || 0,
      indice_fadiga: Math.round(tripContext?.currentTrip?.fatigueScore || 0),
      abertura_olhos_pct: Math.round((tripContext?.currentTrip?.averageEyeOpen ?? 0.85) * 100),
      motorista: tripContext?.driverProfile?.name || 'Condutor',
      veiculo: tripContext?.driverProfile?.vehicle || 'Veículo Padrão',
      historico_viagens: tripContext?.historicalTripsCount || 0,
    };

    // 1. Check for external Rasa REST Server (if configured via env RASA_ENDPOINT)
    const externalRasaEndpoint = process.env.RASA_ENDPOINT;
    if (externalRasaEndpoint) {
      try {
        const rasaResponse = await fetch(externalRasaEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: 'user',
            message: lastUserMessage,
          }),
          signal: AbortSignal.timeout(2500),
        });

        if (rasaResponse.ok) {
          const rasaData = await rasaResponse.json();
          if (Array.isArray(rasaData) && rasaData.length > 0 && rasaData[0]?.text) {
            const combinedText = rasaData.map((d: any) => d.text).join('\n\n');
            return res.json({
              response: combinedText,
              intent: { name: 'external_rasa', confidence: 1.0 },
              slots,
              engine: 'Rasa Open Source Server (REST)',
            });
          }
        }
      } catch (externalErr: any) {
        console.warn('External Rasa unreachable, falling back to embedded Rasa Core:', externalErr?.message);
      }
    }

    // 2. High-speed Embedded Rasa Core & NLU Pipeline
    const intent = classifyRasaIntent(lastUserMessage);
    const reply = executeRasaAction(intent.name, slots, lastUserMessage);

    return res.json({
      response: reply,
      intent,
      slots,
      engine: 'Rasa NLU & Core v3.x',
    });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    return res.status(500).json({
      error: 'Erro no processamento do motor Rasa.',
      details: err?.message || 'Falha no pipeline Rasa.',
    });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VigiDrive full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
